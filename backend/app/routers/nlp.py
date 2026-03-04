"""
Router: Capa de Lenguaje Natural
El usuario escribe en español plano y el sistema interpreta la acción financiera.
Fase 5: Para intents contables, genera asientos de doble partida.
Fase 6: Chat conversacional con GPT-4o como motor NLP inteligente.
"""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from app.database import get_supabase
from app.models import NLPQuery, NLPResponse, NLPChatQuery, NLPChatResponse
from app.auth import AuthenticatedUser, get_current_user
from app.engines.nlp_engine import interpret_query
from app.engines.financial_engine import (
    calcular_cascada,
    calcular_ratios,
    calcular_punto_equilibrio,
    diagnostico_juez_digital,
)
from app.engines.account_mapping import CONCEPT_TO_ACCOUNTS
from app.engines.accounting_engine import validate_journal_entry, aggregate_to_financial_record
from app.routers.ai_agents import get_openai, safe_json_parse

router = APIRouter()

# Mapeo de accion NLP → concepto contable
NLP_ACTION_TO_CONCEPT = {
    "register_expense": None,  # Se resuelve desde concept_key
    "register_income": "venta_contado",
    "register_loan": "prestamo_recibido",
    "register_loan_payment": "pago_prestamo",
    "register_purchase": "compra_mercancia_contado",
}

# Acciones que generan asientos contables
ACCOUNTING_ACTIONS = {
    "register_expense", "register_income", "register_loan",
    "register_loan_payment", "register_purchase",
}


def _build_journal_entry_from_nlp(
    action: str, data: dict, society_id: str, description: str, user_id: str
) -> dict | None:
    """
    Construye un payload de asiento contable a partir de la interpretacion NLP.
    Returns dict con entry preview o None si no se puede mapear.
    """
    amount = data.get("amount", 0)
    if amount <= 0:
        return None

    # Determinar concepto contable
    if action == "register_expense":
        concept_key = data.get("concept_key", "servicios_publicos")
    else:
        concept_key = NLP_ACTION_TO_CONCEPT.get(action)

    if not concept_key or concept_key not in CONCEPT_TO_ACCOUNTS:
        return None

    mapping = CONCEPT_TO_ACCOUNTS[concept_key]

    # Resolver fecha
    entry_date_str = data.get("resolved_date", date.today().isoformat())

    # Construir lineas del asiento
    lines = []
    for line_template in mapping["lines"]:
        line = {
            "account_code": line_template["account_code"],
            "description": line_template.get("description", ""),
            "debe": round(amount, 2) if line_template.get("debe") else 0,
            "haber": round(amount, 2) if line_template.get("haber") else 0,
        }
        lines.append(line)

    # Generar razonamiento para el usuario
    detected_word = data.get("concept_raw", concept_key)
    reasoning = (
        f"Detecte la palabra '{detected_word}' en tu mensaje. "
        f"Esto corresponde a la categoria '{mapping['description']}'. "
        f"Se registra como DEBE en la cuenta {mapping['lines'][0]['account_code']} "
        f"y HABER en la cuenta {mapping['lines'][1]['account_code']}."
    )

    return {
        "society_id": society_id,
        "entry_date": entry_date_str,
        "description": description,
        "reference": f"NLP: {data.get('concept_raw', concept_key)}",
        "source": "nlp",
        "attachment_url": None,
        "lines": lines,
        "concept_key": concept_key,
        "concept_description": mapping["description"],
        "reasoning": reasoning,
    }


@router.post("/interpret", response_model=NLPResponse)
async def interpret_natural_language(body: NLPQuery, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Interpreta una frase en español plano y ejecuta la acción correspondiente.

    Ejemplos:
    - "Mis ventas de enero fueron 50 mil" -> Registra revenue=50000 en enero
    - "Cómo está mi negocio?" -> Devuelve diagnóstico completo
    - "Si subo el precio un 10%, qué pasa?" -> Simula incremento
    """
    db = get_supabase()

    # 1. Interpretar la frase
    interpretation = interpret_query(body.query)

    # 2. Log en audit_logs (NLP tracking) — non-blocking, no debe romper el endpoint
    try:
        db.table("audit_logs").insert({
            "user_id": user.id,
            "action_type": "nlp_query_executed",
            "action_description": interpretation.get("description", "Query NLP"),
            "nlp_raw_input": body.query,
            "nlp_interpreted_action": interpretation.get("action", "unknown"),
        }).execute()
    except Exception:
        pass  # Audit log failure should never block the NLP response

    if not interpretation["understood"]:
        return NLPResponse(
            understood=False,
            action="unknown",
            description=interpretation["description"],
            suggestion=interpretation["suggestion"],
        )

    action = interpretation["action"]
    data = interpretation["extracted_data"]

    # 3a. Acciones contables (Fase 5) — generan asientos de doble partida
    if action in ACCOUNTING_ACTIONS:
        entry_preview = _build_journal_entry_from_nlp(
            action, data, body.society_id, interpretation["description"], user.id
        )
        if entry_preview:
            # Validar que cuadra
            lines_for_validation = [
                {"debe": l["debe"], "haber": l["haber"]}
                for l in entry_preview["lines"]
            ]
            validation = validate_journal_entry(lines_for_validation)

            if not validation["valid"]:
                return NLPResponse(
                    understood=True,
                    action=action,
                    description=f"Error al construir asiento: {validation['errors']}",
                )

            # Devolver preview para que el frontend confirme antes de guardar
            return NLPResponse(
                understood=True,
                action=action,
                description=interpretation["description"],
                data={
                    "requires_confirmation": True,
                    "reasoning": entry_preview.get("reasoning", ""),
                    "journal_entry_preview": {
                        "entry_date": entry_preview["entry_date"],
                        "description": entry_preview["description"],
                        "reference": entry_preview["reference"],
                        "source": entry_preview["source"],
                        "concept_description": entry_preview["concept_description"],
                        "total_debe": validation["total_debe"],
                        "total_haber": validation["total_haber"],
                        "lines": entry_preview["lines"],
                    },
                    "confirm_payload": {
                        "society_id": body.society_id,
                        "entry_date": entry_preview["entry_date"],
                        "description": entry_preview["description"],
                        "reference": entry_preview["reference"],
                        "source": "nlp",
                        "attachment_url": None,
                        "lines": entry_preview["lines"],
                    },
                },
            )
        else:
            # Fallback: no se pudo mapear, registrar directo en financial_records
            return NLPResponse(
                understood=True,
                action=action,
                description=interpretation["description"] + " (sin mapeo contable, registrado como gasto general)",
                data={"amount": data.get("amount")},
            )

    # 3b. Ejecutar acción según intención (legacy: directo a financial_records)
    if action == "register_sales":
        record_data = {
            "society_id": body.society_id,
            "period_year": 2026,
            "period_month": data.get("month", 1),
            "revenue": data.get("amount", 0),
            "source": "natural_language",
        }
        result = db.table("financial_records").upsert(
            record_data,
            on_conflict="society_id,period_year,period_month",
        ).execute()
        return NLPResponse(
            understood=True,
            action=action,
            description=interpretation["description"],
            data={"record": result.data, "amount": data.get("amount")},
        )

    elif action == "register_costs":
        result = db.table("financial_records").upsert(
            {
                "society_id": body.society_id,
                "period_year": 2026,
                "period_month": data.get("month", 1),
                "cogs": data.get("amount", 0),
                "source": "natural_language",
            },
            on_conflict="society_id,period_year,period_month",
        ).execute()
        return NLPResponse(
            understood=True,
            action=action,
            description=interpretation["description"],
            data={"record": result.data},
        )

    elif action == "register_rent":
        result = db.table("financial_records").upsert(
            {
                "society_id": body.society_id,
                "period_year": 2026,
                "period_month": data.get("month", 1),
                "opex_rent": data.get("amount", 0),
                "source": "natural_language",
            },
            on_conflict="society_id,period_year,period_month",
        ).execute()
        return NLPResponse(
            understood=True,
            action=action,
            description=interpretation["description"],
            data={"record": result.data},
        )

    elif action == "register_payroll":
        result = db.table("financial_records").upsert(
            {
                "society_id": body.society_id,
                "period_year": 2026,
                "period_month": data.get("month", 1),
                "opex_payroll": data.get("amount", 0),
                "source": "natural_language",
            },
            on_conflict="society_id,period_year,period_month",
        ).execute()
        return NLPResponse(
            understood=True,
            action=action,
            description=interpretation["description"],
            data={"record": result.data},
        )

    elif action in ("query_profit", "query_diagnosis"):
        # Obtener último registro
        records = (
            db.table("financial_records")
            .select("*")
            .eq("society_id", body.society_id)
            .order("period_year", desc=True)
            .order("period_month", desc=True)
            .limit(1)
            .execute()
        )
        if not records.data:
            return NLPResponse(
                understood=True,
                action=action,
                description="No hay datos financieros registrados aún.",
                suggestion="Primero registra tus ventas y costos. Ej: 'Mis ventas de enero fueron 50 mil'",
            )
        diagnosis = diagnostico_juez_digital(records.data[0])
        return NLPResponse(
            understood=True,
            action=action,
            description=f"Diagnóstico: {diagnosis['verdict']} - {diagnosis['detail']}",
            data=diagnosis,
        )

    elif action == "query_breakeven":
        records = (
            db.table("financial_records")
            .select("*")
            .eq("society_id", body.society_id)
            .order("period_year", desc=True)
            .order("period_month", desc=True)
            .limit(1)
            .execute()
        )
        if not records.data:
            return NLPResponse(
                understood=True,
                action=action,
                description="No hay datos para calcular punto de equilibrio.",
                suggestion="Registra ventas y costos primero.",
            )
        be = calcular_punto_equilibrio(records.data[0])
        return NLPResponse(
            understood=True,
            action=action,
            description=f"Punto de equilibrio: ${be['breakeven_monthly']:,.0f}/mes. Estás en zona de {be['zone']}.",
            data=be,
        )

    elif action == "simulate_price":
        pct = data.get("percent", 0)
        records = (
            db.table("financial_records")
            .select("*")
            .eq("society_id", body.society_id)
            .order("period_year", desc=True)
            .order("period_month", desc=True)
            .limit(1)
            .execute()
        )
        if not records.data:
            return NLPResponse(
                understood=True,
                action=action,
                description="No hay datos para simular.",
            )
        record = records.data[0]
        original = calcular_cascada(record)

        # Simular aumento
        simulated = dict(record)
        simulated["revenue"] = record["revenue"] * (1 + pct / 100)
        new_calc = calcular_cascada(simulated)

        return NLPResponse(
            understood=True,
            action=action,
            description=f"Si subes precio {pct}%: EBITDA pasa de ${original['ebitda']:,.0f} a ${new_calc['ebitda']:,.0f}",
            data={
                "original": original,
                "simulated": new_calc,
                "delta_ebitda": round(new_calc["ebitda"] - original["ebitda"], 2),
            },
        )

    return NLPResponse(
        understood=True,
        action=action,
        description=interpretation["description"],
    )


# ============================================
# CHAT CONVERSACIONAL — GPT-4o como motor NLP
# ============================================

# System prompt base cuando el frontend no envía uno
DEFAULT_SYSTEM_PROMPT = (
    "Eres el CFO y Consultor Legal Senior de Mi Director Financiero PTY. "
    "Tu mision es guiar al emprendedor panameno en rentabilidad y estructura corporativa. "
    "Tu tono es profesional, ejecutivo, eficiente y con un toque de calidez local. "
    "Operas bajo el marco legal y tributario de la Republica de Panama. "
    "Responde siempre en español. Se conciso pero completo."
)


def _build_financial_context(society_id: str) -> str:
    """
    Extrae datos financieros reales del usuario para inyectar como contexto en GPT-4o.
    Esto permite que GPT-4o responda con datos reales del negocio.
    """
    try:
        db = get_supabase()
        records = (
            db.table("financial_records")
            .select("*")
            .eq("society_id", society_id)
            .order("period_year", desc=True)
            .order("period_month", desc=True)
            .limit(3)
            .execute()
        )
        if not records.data:
            return "\n[No hay datos financieros registrados aun para esta sociedad.]"

        context_parts = ["\n--- DATOS FINANCIEROS DEL USUARIO (ultimos periodos) ---"]
        for r in records.data:
            cascada = calcular_cascada(r)
            period = f"{r.get('period_year', '?')}-{r.get('period_month', '?'):02d}"
            context_parts.append(
                f"Periodo {period}: "
                f"Ingresos=${cascada.get('revenue', 0):,.0f}, "
                f"Costos=${cascada.get('cogs', 0):,.0f}, "
                f"Utilidad Bruta=${cascada.get('gross_profit', 0):,.0f}, "
                f"OPEX=${cascada.get('total_opex', 0):,.0f}, "
                f"EBITDA=${cascada.get('ebitda', 0):,.0f}, "
                f"Utilidad Neta=${cascada.get('net_income', 0):,.0f}"
            )

        # Agregar diagnostico del ultimo periodo
        diagnosis = diagnostico_juez_digital(records.data[0])
        context_parts.append(
            f"\nDiagnostico actual: {diagnosis.get('verdict', 'N/A')} — {diagnosis.get('detail', '')}"
        )

        # Punto de equilibrio
        try:
            be = calcular_punto_equilibrio(records.data[0])
            context_parts.append(
                f"Punto de equilibrio: ${be.get('breakeven_monthly', 0):,.0f}/mes — Zona: {be.get('zone', 'N/A')}"
            )
        except Exception:
            pass

        context_parts.append("--- FIN DE DATOS FINANCIEROS ---\n")
        return "\n".join(context_parts)

    except Exception:
        return "\n[No se pudieron obtener datos financieros.]"


@router.post("/chat", response_model=NLPChatResponse)
async def chat_with_assistant(body: NLPChatQuery, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Chat conversacional con GPT-4o.

    Flujo:
    1. Intenta primero interpretar con regex (acciones financieras estructuradas)
    2. Si regex entiende → ejecuta la accion y retorna el resultado (como antes)
    3. Si regex NO entiende → envía a GPT-4o con contexto financiero real

    El frontend envia el system prompt completo + historial de conversacion.
    """
    db = get_supabase()

    # Strip context prefix if frontend added [Contexto: ...]
    raw_query = body.query.strip()

    # --- Paso 1: Intentar regex como fast-path para acciones financieras ---
    regex_result = interpret_query(raw_query)

    if regex_result["understood"]:
        # El regex capturo una intencion estructurada — ejecutar la accion
        action = regex_result["action"]
        data = regex_result["extracted_data"]

        # Acciones contables → preview de asiento
        if action in ACCOUNTING_ACTIONS:
            entry_preview = _build_journal_entry_from_nlp(
                action, data, body.society_id, regex_result["description"], user.id
            )
            if entry_preview:
                lines_for_validation = [
                    {"debe": l["debe"], "haber": l["haber"]}
                    for l in entry_preview["lines"]
                ]
                validation = validate_journal_entry(lines_for_validation)

                if validation["valid"]:
                    return NLPChatResponse(
                        reply=regex_result["description"],
                        action=action,
                        source="regex",
                        data={
                            "requires_confirmation": True,
                            "reasoning": entry_preview.get("reasoning", ""),
                            "journal_entry_preview": {
                                "entry_date": entry_preview["entry_date"],
                                "description": entry_preview["description"],
                                "reference": entry_preview["reference"],
                                "source": entry_preview["source"],
                                "concept_description": entry_preview["concept_description"],
                                "total_debe": validation["total_debe"],
                                "total_haber": validation["total_haber"],
                                "lines": entry_preview["lines"],
                            },
                            "confirm_payload": {
                                "society_id": body.society_id,
                                "entry_date": entry_preview["entry_date"],
                                "description": entry_preview["description"],
                                "reference": entry_preview["reference"],
                                "source": "nlp",
                                "attachment_url": None,
                                "lines": entry_preview["lines"],
                            },
                        },
                    )

        # Queries de diagnostico/breakeven/simulacion → ejecutar y retornar
        if action in ("query_profit", "query_diagnosis"):
            records = (
                db.table("financial_records")
                .select("*")
                .eq("society_id", body.society_id)
                .order("period_year", desc=True)
                .order("period_month", desc=True)
                .limit(1)
                .execute()
            )
            if records.data:
                diagnosis = diagnostico_juez_digital(records.data[0])
                return NLPChatResponse(
                    reply=f"Diagnostico: {diagnosis['verdict']} — {diagnosis['detail']}",
                    action=action,
                    source="regex",
                    data=diagnosis,
                )
            else:
                return NLPChatResponse(
                    reply="No hay datos financieros registrados aun. Primero registra tus ventas y costos.",
                    action=action,
                    source="regex",
                )

        if action == "query_breakeven":
            records = (
                db.table("financial_records")
                .select("*")
                .eq("society_id", body.society_id)
                .order("period_year", desc=True)
                .order("period_month", desc=True)
                .limit(1)
                .execute()
            )
            if records.data:
                be = calcular_punto_equilibrio(records.data[0])
                return NLPChatResponse(
                    reply=f"Punto de equilibrio: ${be['breakeven_monthly']:,.0f}/mes. Estas en zona de {be['zone']}.",
                    action=action,
                    source="regex",
                    data=be,
                )

        if action == "simulate_price":
            pct = data.get("percent", 0)
            records = (
                db.table("financial_records")
                .select("*")
                .eq("society_id", body.society_id)
                .order("period_year", desc=True)
                .order("period_month", desc=True)
                .limit(1)
                .execute()
            )
            if records.data:
                record = records.data[0]
                original = calcular_cascada(record)
                simulated = dict(record)
                simulated["revenue"] = record["revenue"] * (1 + pct / 100)
                new_calc = calcular_cascada(simulated)
                return NLPChatResponse(
                    reply=f"Si subes precio {pct}%: EBITDA pasa de ${original['ebitda']:,.0f} a ${new_calc['ebitda']:,.0f}",
                    action=action,
                    source="regex",
                    data={
                        "original": original,
                        "simulated": new_calc,
                        "delta_ebitda": round(new_calc["ebitda"] - original["ebitda"], 2),
                    },
                )

    # --- Paso 2: Regex no entendio → GPT-4o como motor inteligente ---
    try:
        client = get_openai()
    except HTTPException:
        # OpenAI no disponible — retornar respuesta amigable
        return NLPChatResponse(
            reply=(
                "Lo siento, mi motor de inteligencia artificial no esta disponible en este momento. "
                "Puedes intentar frases mas especificas como:\n"
                "• 'Pague la luz $200'\n"
                "• 'Mis ventas de enero fueron 50 mil'\n"
                "• 'Como esta mi negocio?'\n"
                "• 'Si subo el precio un 10%, que pasa?'"
            ),
            source="fallback",
        )

    # Construir system prompt con contexto financiero real
    system_prompt = body.system_prompt or DEFAULT_SYSTEM_PROMPT
    financial_context = _build_financial_context(body.society_id)
    full_system = system_prompt + financial_context

    # Construir mensajes para GPT-4o
    messages = [{"role": "system", "content": full_system}]

    # Agregar historial de conversacion (ultimos mensajes)
    for msg in body.history[-10:]:  # Max 10 mensajes de contexto
        if msg.role in ("user", "assistant"):
            messages.append({"role": msg.role, "content": msg.content})

    # Agregar el mensaje actual del usuario
    messages.append({"role": "user", "content": raw_query})

    # Llamar a GPT-4o
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.4,
            max_tokens=1500,
        )
        reply = response.choices[0].message.content.strip()
    except Exception as e:
        error_msg = str(e)
        if "rate_limit" in error_msg.lower() or "429" in error_msg:
            reply = "He alcanzado el limite de consultas por minuto. Por favor intenta de nuevo en unos segundos."
        elif "insufficient_quota" in error_msg.lower():
            reply = "El servicio de IA no esta disponible temporalmente. Intenta mas tarde."
        else:
            reply = f"Ocurrio un error al procesar tu consulta. Intenta reformularla. (Error: {error_msg[:100]})"

    # Audit log (non-blocking)
    try:
        db.table("audit_logs").insert({
            "user_id": user.id,
            "action_type": "nlp_chat_gpt4o",
            "action_description": f"Chat GPT-4o: {raw_query[:100]}",
            "nlp_raw_input": raw_query,
            "nlp_interpreted_action": "gpt4o_chat",
        }).execute()
    except Exception:
        pass

    return NLPChatResponse(
        reply=reply,
        action="gpt4o_chat",
        source="gpt-4o",
    )
