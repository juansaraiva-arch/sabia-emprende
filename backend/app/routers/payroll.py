"""
Router: Nómina Completa Panamá 2026
CRUD de empleados + Asistencia + XIII Mes + Liquidación + KPI Ausentismo.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from app.database import get_supabase
from app.auth import AuthenticatedUser, get_current_user
from app.models import PayrollEntryCreateFull, AttendanceRecordCreate
from app.engines.panama_payroll import (
    calcular_carga_panama,
    calcular_nomina_total,
    calcular_liquidacion,
    calcular_reserva_xiii_mes,
    calcular_deduccion_ausencia,
    calcular_recargo_feriado,
)

router = APIRouter()


# ============================================
# CRUD EMPLEADOS
# ============================================

@router.post("/employees")
async def create_employee(body: PayrollEntryCreateFull, user: AuthenticatedUser = Depends(get_current_user)):
    """Crear un empleado en la nómina de una sociedad."""
    db = get_supabase()

    # Calcular costos iniciales
    tipo = body.contract_type.value
    result = calcular_carga_panama(body.gross_salary, tipo, body.years_worked)

    data = {
        "society_id": body.society_id,
        "employee_name": body.employee_name,
        "contract_type": tipo,
        "gross_salary": body.gross_salary,
        "cedula": body.cedula,
        "years_worked": body.years_worked,
        "employer_cost": result["employer_cost"],
        "employee_net": result["employee_net"],
        "total_deductions": result["total_deductions"],
    }
    if body.entry_date:
        data["entry_date"] = body.entry_date.isoformat()
    if body.exit_date:
        data["exit_date"] = body.exit_date.isoformat()
    if body.exit_reason:
        data["exit_reason"] = body.exit_reason

    row = db.table("payroll_entries").insert(data).execute()
    return {"success": True, "data": row.data}


@router.get("/employees/{society_id}")
async def list_employees(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    active_only: bool = Query(True, description="Solo empleados activos"),
):
    """Listar empleados de una sociedad con costos calculados."""
    db = get_supabase()
    query = (
        db.table("payroll_entries")
        .select("*")
        .eq("society_id", society_id)
        .order("created_at", desc=True)
    )
    if active_only:
        query = query.is_("exit_date", "null")

    rows = query.execute()

    # Recalcular costos para cada empleado
    employees = []
    for emp in rows.data:
        tipo = emp.get("contract_type", "payroll")
        salario = emp.get("gross_salary", 0)
        years = emp.get("years_worked", 0)
        calc = calcular_carga_panama(salario, tipo, years)
        employees.append({
            **emp,
            "employer_cost": calc["employer_cost"],
            "employee_net": calc["employee_net"],
            "total_deductions": calc["total_deductions"],
            "carga_patronal_pct": calc.get("carga_patronal_pct", 0),
            "breakdown": calc.get("breakdown", {}),
            "is_active": emp.get("exit_date") is None,
        })

    return {"data": employees}


@router.get("/employees/{society_id}/{employee_id}")
async def get_employee(society_id: str, employee_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Obtener detalle de un empleado específico."""
    db = get_supabase()
    row = (
        db.table("payroll_entries")
        .select("*")
        .eq("id", employee_id)
        .eq("society_id", society_id)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    emp = row.data
    calc = calcular_carga_panama(
        emp.get("gross_salary", 0),
        emp.get("contract_type", "payroll"),
        emp.get("years_worked", 0),
    )

    return {
        "data": {
            **emp,
            "employer_cost": calc["employer_cost"],
            "employee_net": calc["employee_net"],
            "total_deductions": calc["total_deductions"],
            "carga_patronal_pct": calc.get("carga_patronal_pct", 0),
            "breakdown": calc.get("breakdown", {}),
            "is_active": emp.get("exit_date") is None,
        }
    }


@router.patch("/employees/{society_id}/{employee_id}")
async def update_employee(
    society_id: str, employee_id: str, body: dict, user: AuthenticatedUser = Depends(get_current_user)
):
    """Actualizar datos de un empleado."""
    db = get_supabase()
    result = (
        db.table("payroll_entries")
        .update(body)
        .eq("id", employee_id)
        .eq("society_id", society_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"success": True, "data": result.data}


@router.delete("/employees/{society_id}/{employee_id}")
async def delete_employee(
    society_id: str, employee_id: str, user: AuthenticatedUser = Depends(get_current_user)
):
    """Eliminar un empleado de la nómina."""
    db = get_supabase()
    result = (
        db.table("payroll_entries")
        .delete()
        .eq("id", employee_id)
        .eq("society_id", society_id)
        .execute()
    )
    return {"success": True, "deleted": len(result.data) > 0}


# ============================================
# NOMINA TOTAL
# ============================================

@router.get("/total/{society_id}")
async def get_payroll_total(society_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Calcular nómina total de una sociedad (solo empleados activos)."""
    db = get_supabase()
    rows = (
        db.table("payroll_entries")
        .select("*")
        .eq("society_id", society_id)
        .is_("exit_date", "null")
        .execute()
    )

    empleados = [
        {
            "employee_name": e["employee_name"],
            "contract_type": e["contract_type"],
            "gross_salary": e["gross_salary"],
            "years_worked": e.get("years_worked", 0),
        }
        for e in rows.data
    ]

    return calcular_nomina_total(empleados)


# ============================================
# ASISTENCIA / ATTENDANCE
# ============================================

@router.post("/attendance")
async def create_attendance(body: AttendanceRecordCreate, user: AuthenticatedUser = Depends(get_current_user)):
    """Registrar evento de asistencia (vacación, falta, feriado trabajado, etc.)."""
    db = get_supabase()

    # Calcular deducción o recargo según tipo
    deduction_amount = 0.0

    if body.record_type == "unjustified_absence":
        # Obtener salario del empleado
        emp = (
            db.table("payroll_entries")
            .select("gross_salary")
            .eq("id", body.payroll_entry_id)
            .single()
            .execute()
        )
        if emp.data:
            salario_diario = emp.data["gross_salary"] / 30
            deduction_amount = salario_diario * 1  # 1 día

    elif body.record_type in ("holiday_worked", "sunday_worked"):
        emp = (
            db.table("payroll_entries")
            .select("gross_salary")
            .eq("id", body.payroll_entry_id)
            .single()
            .execute()
        )
        if emp.data:
            salario_diario = emp.data["gross_salary"] / 30
            tipo_recargo = "feriado" if body.record_type == "holiday_worked" else "domingo"
            recargo = calcular_recargo_feriado(salario_diario, tipo_recargo)
            deduction_amount = -recargo["monto_recargo"]  # Negativo = empresa paga más

    data = {
        "payroll_entry_id": body.payroll_entry_id,
        "society_id": body.society_id,
        "record_date": body.record_date.isoformat(),
        "record_type": body.record_type,
        "hours": body.hours,
        "surcharge_pct": body.surcharge_pct,
        "deduction_amount": deduction_amount,
        "notes": body.notes,
    }

    row = db.table("attendance_records").insert(data).execute()

    # Si es vacación tomada, actualizar vacation_days_taken
    if body.record_type == "vacation_taken":
        days = body.hours / 8  # 8 horas = 1 día
        emp = (
            db.table("payroll_entries")
            .select("vacation_days_taken")
            .eq("id", body.payroll_entry_id)
            .single()
            .execute()
        )
        if emp.data:
            new_taken = (emp.data.get("vacation_days_taken") or 0) + days
            db.table("payroll_entries").update(
                {"vacation_days_taken": new_taken}
            ).eq("id", body.payroll_entry_id).execute()

    return {"success": True, "data": row.data}


@router.get("/attendance/{society_id}")
async def list_attendance(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    employee_id: str = Query(None, description="Filtrar por empleado"),
    record_type: str = Query(None, description="Filtrar por tipo"),
):
    """Listar registros de asistencia."""
    db = get_supabase()
    query = (
        db.table("attendance_records")
        .select("*")
        .eq("society_id", society_id)
        .order("record_date", desc=True)
    )
    if employee_id:
        query = query.eq("payroll_entry_id", employee_id)
    if record_type:
        query = query.eq("record_type", record_type)

    rows = query.execute()
    return {"data": rows.data}


# ============================================
# XIII MES
# ============================================

@router.get("/xiii-mes/{society_id}")
async def get_xiii_mes(
    society_id: str,
    months_in_tercio: int = Query(1, ge=1, le=4, description="Meses del tercio actual"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Consultar reserva acumulada de XIII Mes para la sociedad."""
    db = get_supabase()
    rows = (
        db.table("payroll_entries")
        .select("employee_name, contract_type, gross_salary")
        .eq("society_id", society_id)
        .is_("exit_date", "null")
        .execute()
    )

    empleados = [
        {
            "employee_name": e["employee_name"],
            "contract_type": e["contract_type"],
            "gross_salary": e["gross_salary"],
        }
        for e in rows.data
    ]

    return calcular_reserva_xiii_mes(empleados, months_in_tercio)


# ============================================
# LIQUIDACION
# ============================================

@router.post("/liquidacion/{society_id}/{employee_id}")
async def calculate_liquidacion(
    society_id: str,
    employee_id: str,
    exit_reason: str = Query(..., description="renuncia, despido, mutuo_acuerdo, fin_contrato"),
    months_current_tercio: int = Query(0, ge=0, le=4),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Calcular liquidación laboral de un empleado."""
    db = get_supabase()
    emp = (
        db.table("payroll_entries")
        .select("*")
        .eq("id", employee_id)
        .eq("society_id", society_id)
        .single()
        .execute()
    )
    if not emp.data:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    e = emp.data
    return calcular_liquidacion(
        salario=e.get("gross_salary", 0),
        years_worked=e.get("years_worked", 0),
        exit_reason=exit_reason,
        vacation_days_accrued=e.get("vacation_days_accrued", 0),
        vacation_days_taken=e.get("vacation_days_taken", 0),
        xiii_mes_accumulated=e.get("xiii_mes_accumulated", 0),
        months_current_tercio=months_current_tercio,
    )


# ============================================
# KPI AUSENTISMO
# ============================================

@router.get("/kpi/absenteeism/{society_id}")
async def get_absenteeism_kpi(
    society_id: str,
    period_year: int = Query(2026),
    period_month: int = Query(1, ge=1, le=12),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Índice de Ausentismo:
    (Días Falta Injustificada / (Empleados Activos * Días Laborales)) * 100
    """
    db = get_supabase()

    # Empleados activos
    employees = (
        db.table("payroll_entries")
        .select("id, employee_name")
        .eq("society_id", society_id)
        .is_("exit_date", "null")
        .execute()
    )
    active_count = len(employees.data)

    if active_count == 0:
        return {
            "active_employees": 0,
            "unjustified_absences": 0,
            "working_days": 22,
            "absenteeism_pct": 0,
            "status": "ok",
        }

    # Faltas del mes
    start_date = f"{period_year}-{period_month:02d}-01"
    if period_month == 12:
        end_date = f"{period_year + 1}-01-01"
    else:
        end_date = f"{period_year}-{period_month + 1:02d}-01"

    absences = (
        db.table("attendance_records")
        .select("id")
        .eq("society_id", society_id)
        .eq("record_type", "unjustified_absence")
        .gte("record_date", start_date)
        .lt("record_date", end_date)
        .execute()
    )

    unjustified = len(absences.data)
    # Usar calendario real de Panama en vez de hardcoded 22
    from app.engines.panama_calendar import dias_laborables
    working_days = dias_laborables(period_year, period_month)
    absenteeism_pct = (unjustified / (active_count * working_days)) * 100 if working_days > 0 else 0

    status = "ok"
    if absenteeism_pct > 5:
        status = "danger"
    elif absenteeism_pct > 2:
        status = "warning"

    return {
        "active_employees": active_count,
        "unjustified_absences": unjustified,
        "working_days": working_days,
        "absenteeism_pct": round(absenteeism_pct, 2),
        "status": status,
    }
