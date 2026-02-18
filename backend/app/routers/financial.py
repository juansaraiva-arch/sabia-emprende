"""
Router: Motor Financiero
CRUD de registros financieros + cálculos del Motor de Verdad.
"""
from fastapi import APIRouter, HTTPException, Header, Query
from app.database import get_supabase
from app.models import FinancialRecordCreate
from app.engines.financial_engine import (
    calcular_cascada,
    calcular_ratios,
    calcular_punto_equilibrio,
    diagnostico_juez_digital,
    valoracion_empresa,
)
from app.engines.panama_payroll import calcular_carga_panama, calcular_nomina_total

router = APIRouter()


# --- CRUD ---

@router.post("/records")
async def create_record(body: FinancialRecordCreate, x_user_id: str = Header(...)):
    db = get_supabase()
    data = body.model_dump()
    result = db.table("financial_records").insert(data).execute()
    return {"success": True, "data": result.data}


@router.get("/records/{society_id}")
async def list_records(society_id: str, x_user_id: str = Header(...)):
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
async def update_record(record_id: str, body: dict, x_user_id: str = Header(...)):
    db = get_supabase()

    # Obtener valor anterior para audit log
    old = db.table("financial_records").select("*").eq("id", record_id).single().execute()
    if not old.data:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    result = db.table("financial_records").update(body).eq("id", record_id).execute()
    return {"success": True, "data": result.data}


# --- MOTOR DE CALCULO ---

@router.get("/cascade/{society_id}/{year}/{month}")
async def get_cascade(society_id: str, year: int, month: int, x_user_id: str = Header(...)):
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
async def get_ratios(society_id: str, year: int, month: int, x_user_id: str = Header(...)):
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
    x_user_id: str = Header(...),
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
async def get_diagnosis(society_id: str, year: int, month: int, x_user_id: str = Header(...)):
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
    x_user_id: str = Header(...),
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


# --- NOMINA PANAMA ---

@router.post("/payroll/calculate")
async def calculate_payroll(employees: list[dict]):
    """Calcula nómina completa con cargas sociales Panamá."""
    return calcular_nomina_total(employees)


@router.post("/payroll/individual")
async def calculate_individual(salary: float, contract_type: str):
    """Calcula costo individual de un empleado."""
    return calcular_carga_panama(salary, contract_type)
