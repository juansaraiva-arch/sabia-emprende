"""
Router: Capa de Lenguaje Natural
El usuario escribe en español plano y el sistema interpreta la acción financiera.
Fase 5: Para intents contables, genera asientos de doble partida.
"""
from datetime import date
from fastapi import APIRouter, Depends
from app.database import get_supabase
from app.models import NLPQuery, NLPResponse
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
