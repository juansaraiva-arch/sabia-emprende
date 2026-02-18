"""
Router: Capa de Lenguaje Natural
El usuario escribe en español plano y el sistema interpreta la acción financiera.
"""
from fastapi import APIRouter, Header
from app.database import get_supabase
from app.models import NLPQuery, NLPResponse
from app.engines.nlp_engine import interpret_query
from app.engines.financial_engine import (
    calcular_cascada,
    calcular_ratios,
    calcular_punto_equilibrio,
    diagnostico_juez_digital,
)

router = APIRouter()


@router.post("/interpret", response_model=NLPResponse)
async def interpret_natural_language(body: NLPQuery, x_user_id: str = Header(...)):
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

    # 2. Log en audit_logs (NLP tracking)
    db.table("audit_logs").insert({
        "user_id": x_user_id,
        "action_type": "nlp_query_executed",
        "action_description": interpretation.get("description", "Query NLP"),
        "nlp_raw_input": body.query,
        "nlp_interpreted_action": interpretation.get("action", "unknown"),
    }).execute()

    if not interpretation["understood"]:
        return NLPResponse(
            understood=False,
            action="unknown",
            description=interpretation["description"],
            suggestion=interpretation["suggestion"],
        )

    action = interpretation["action"]
    data = interpretation["extracted_data"]

    # 3. Ejecutar acción según intención
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
