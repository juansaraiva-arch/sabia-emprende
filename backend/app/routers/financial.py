"""
Router: Motor Financiero
CRUD de registros financieros + cálculos del Motor de Verdad.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from app.database import get_supabase
from app.models import FinancialRecordCreate
from app.engines.financial_engine import (
    calcular_cascada,
    calcular_ratios,
    calcular_punto_equilibrio,
    diagnostico_juez_digital,
    valoracion_empresa,
)
from app.engines.multiperiod_engine import (
    calcular_tendencias,
    comparar_periodos,
    proyectar_futuro,
    calcular_varianza_presupuesto,
)
from app.engines.panama_payroll import calcular_carga_panama, calcular_nomina_total
from app.auth import AuthenticatedUser, get_current_user

router = APIRouter()


# --- CRUD ---

@router.post("/records")
async def create_record(body: FinancialRecordCreate, user: AuthenticatedUser = Depends(get_current_user)):
    db = get_supabase()
    data = body.model_dump()
    result = db.table("financial_records").insert(data).execute()
    return {"success": True, "data": result.data}


@router.get("/records/{society_id}")
async def list_records(society_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .order("period_year", desc=True)
        .order("period_month", desc=True)
        .execute()
    )
    return {"data": result.data}


@router.put("/records/{record_id}")
async def update_record(record_id: str, body: dict, user: AuthenticatedUser = Depends(get_current_user)):
    db = get_supabase()

    # Obtener valor anterior para audit log
    old = db.table("financial_records").select("*").eq("id", record_id).single().execute()
    if not old.data:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    result = db.table("financial_records").update(body).eq("id", record_id).execute()
    return {"success": True, "data": result.data}


# --- MOTOR DE CALCULO ---

@router.get("/cascade/{society_id}/{year}/{month}")
async def get_cascade(society_id: str, year: int, month: int, user: AuthenticatedUser = Depends(get_current_user)):
    """Cascada de rentabilidad (Waterfall P&L)."""
    db = get_supabase()
    result = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year)
        .eq("period_month", month)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No hay datos para ese periodo")
    return calcular_cascada(result.data)


@router.get("/ratios/{society_id}/{year}/{month}")
async def get_ratios(society_id: str, year: int, month: int, user: AuthenticatedUser = Depends(get_current_user)):
    """Ratios operativos, financieros y CCC."""
    db = get_supabase()
    result = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year)
        .eq("period_month", month)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No hay datos para ese periodo")
    return calcular_ratios(result.data)


@router.get("/breakeven/{society_id}/{year}/{month}")
async def get_breakeven(
    society_id: str,
    year: int,
    month: int,
    target_profit: float = Query(0, description="Ganancia deseada mensual"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Punto de equilibrio y meta de ventas."""
    db = get_supabase()
    result = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year)
        .eq("period_month", month)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No hay datos para ese periodo")
    return calcular_punto_equilibrio(result.data, target_profit)


@router.get("/diagnosis/{society_id}/{year}/{month}")
async def get_diagnosis(society_id: str, year: int, month: int, user: AuthenticatedUser = Depends(get_current_user)):
    """Diagnóstico completo: Juez Digital + Cascada + Ratios."""
    db = get_supabase()
    result = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year)
        .eq("period_month", month)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No hay datos para ese periodo")
    return diagnostico_juez_digital(result.data)


@router.get("/valuation/{society_id}/{year}/{month}")
async def get_valuation(
    society_id: str,
    year: int,
    month: int,
    multiple: float = Query(3.0, description="Múltiplo EBITDA"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Valoración de empresa por múltiplos de EBITDA."""
    db = get_supabase()
    result = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year)
        .eq("period_month", month)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No hay datos para ese periodo")
    cascada = calcular_cascada(result.data)
    return valoracion_empresa(cascada["ebitda"], multiple)


# --- MULTI-PERIODO (Fase 10) ---

@router.get("/trends/{society_id}")
async def get_trends(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    from_year: int = Query(...),
    from_month: int = Query(...),
    to_year: int = Query(...),
    to_month: int = Query(...),
):
    """Tendencias multi-periodo: puntos, growth rates, promedios móviles."""
    db = get_supabase()
    result = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .gte("period_year", from_year)
        .lte("period_year", to_year)
        .order("period_year")
        .order("period_month")
        .execute()
    )
    # Filtrar por mes dentro del rango
    records = [
        r for r in result.data
        if (r["period_year"] > from_year or r["period_month"] >= from_month)
        and (r["period_year"] < to_year or r["period_month"] <= to_month)
    ]
    return calcular_tendencias(records)


@router.get("/comparison/{society_id}/{year1}/{month1}/{year2}/{month2}")
async def get_comparison(
    society_id: str,
    year1: int,
    month1: int,
    year2: int,
    month2: int,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Comparación lado a lado de dos periodos."""
    db = get_supabase()

    rec_a = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year1)
        .eq("period_month", month1)
        .single()
        .execute()
    )
    if not rec_a.data:
        raise HTTPException(status_code=404, detail=f"No hay datos para {year1}/{month1}")

    rec_b = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year2)
        .eq("period_month", month2)
        .single()
        .execute()
    )
    if not rec_b.data:
        raise HTTPException(status_code=404, detail=f"No hay datos para {year2}/{month2}")

    return comparar_periodos(rec_a.data, rec_b.data)


@router.get("/forecast/{society_id}")
async def get_forecast(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    months_ahead: int = Query(6, ge=1, le=12),
):
    """Proyección financiera basada en promedio móvil."""
    db = get_supabase()
    result = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .order("period_year")
        .order("period_month")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No hay registros financieros")
    return proyectar_futuro(result.data, months_ahead)


@router.get("/budget-vs-actual/{society_id}/{year}/{month}")
async def get_budget_vs_actual(
    society_id: str,
    year: int,
    month: int,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Análisis de varianza presupuestal: real vs presupuestado."""
    db = get_supabase()

    # Obtener registro financiero real
    actual = (
        db.table("financial_records")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year)
        .eq("period_month", month)
        .single()
        .execute()
    )
    if not actual.data:
        raise HTTPException(status_code=404, detail="No hay datos reales para ese periodo")

    # Obtener presupuesto
    budget = (
        db.table("budget_targets")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year)
        .eq("period_month", month)
        .execute()
    )
    if not budget.data:
        raise HTTPException(status_code=404, detail="No hay presupuesto para ese periodo")

    return calcular_varianza_presupuesto(actual.data, budget.data[0])


# --- NOMINA PANAMA ---

@router.post("/payroll/calculate")
async def calculate_payroll(employees: list[dict]):
    """Calcula nómina completa con cargas sociales Panamá."""
    return calcular_nomina_total(employees)


@router.post("/payroll/individual")
async def calculate_individual(salary: float, contract_type: str):
    """Calcula costo individual de un empleado."""
    return calcular_carga_panama(salary, contract_type)
