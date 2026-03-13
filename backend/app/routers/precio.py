"""
Router: Mi Precio Justo v2 — Endpoints de soporte para pricing.
Endpoint principal: empleados disponibles con costo_real_hora calculado.
"""
from fastapi import APIRouter, Depends, Query
from app.database import get_supabase
from app.auth import AuthenticatedUser, get_current_user
from app.engines.panama_payroll import calcular_carga_panama

router = APIRouter()


@router.get("/empleados-disponibles")
async def get_empleados_para_precio(
    society_id: str,
    horas_mes: int = Query(200, description="Horas laborales por mes para calcular tarifa/hora"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retorna los empleados activos con su costo_real_hora calculado.
    Usa el motor panama_payroll.py para calcular el costo real.
    """
    db = get_supabase()

    rows = (
        db.table("payroll_entries")
        .select("id, employee_name, contract_type, gross_salary, years_worked")
        .eq("society_id", society_id)
        .is_("exit_date", "null")
        .execute()
    )

    resultado = []
    for emp in rows.data:
        salario = emp.get("gross_salary", 0)
        tipo = emp.get("contract_type", "payroll")
        years = emp.get("years_worked", 0)

        carga = calcular_carga_panama(salario, tipo, years)
        costo_real_hora = round(carga["employer_cost"] / horas_mes, 2) if horas_mes > 0 else 0

        resultado.append({
            "id": emp["id"],
            "nombre": emp["employee_name"],
            "salario_bruto": salario,
            "costo_real_mes": carga["employer_cost"],
            "costo_real_hora": costo_real_hora,
            "tipo_contrato": tipo,
        })

    return {"empleados": resultado, "horas_mes_default": horas_mes}
