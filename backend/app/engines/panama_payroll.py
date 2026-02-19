"""
Motor de Cálculo de Nómina Panamá 2026
Ley 462 de 2025 — CSS Patronal actualizada al 13.25%
Calcula: SS Patronal, SE, Riesgos Prof., XIII Mes, Vacaciones,
         Prima Antigüedad, ISR progresivo (3 tramos), retenciones.
"""


def calcular_isr_mensual(salario: float) -> float:
    """
    Tabla ISR Mensual DGI Panamá 2026 (3 tramos progresivos).
    Tramo 1: $0 – $846.15 → 0%
    Tramo 2: $846.16 – $1,538.46 → 15%
    Tramo 3: >$1,538.46 → 25%
    """
    if salario <= 846.15:
        return 0.0

    if salario <= 1538.46:
        return (salario - 846.15) * 0.15

    # Tramo 2 completo + Tramo 3
    isr = (1538.46 - 846.15) * 0.15  # $103.85 fijos del tramo 2
    isr += (salario - 1538.46) * 0.25
    return isr


def calcular_carga_panama(salario: float, tipo: str, years_worked: int = 0) -> dict:
    """
    Calcula el Costo Real para la empresa y el Neto para el empleado
    basado en las leyes laborales de Panamá 2026.
    Ley 462 de 2025: CSS Patronal sube de 12.25% a 13.25%.

    Args:
        salario: Salario bruto mensual pactado
        tipo: 'payroll' (planilla) o 'freelance' (servicios profesionales)
        years_worked: Años trabajados (para prima de antigüedad)

    Returns:
        dict con employer_cost, employee_net, total_deductions, desglose
    """
    if salario <= 0:
        return {
            "employer_cost": 0,
            "employee_net": 0,
            "total_deductions": 0,
            "breakdown": {},
        }

    if tipo == "payroll":
        # --- Costos Patronales (paga la empresa ADICIONAL al salario) ---
        ss_patronal = salario * 0.1325       # Ley 462/2025: 13.25%
        se_patronal = salario * 0.0150       # Seguro Educativo patronal
        rp_patronal = salario * 0.0150       # Riesgos Profesionales (promedio)
        decimo_prov = salario / 12           # Provisión XIII Mes (8.33%)

        # Vacaciones proporcionales: 30 días/año = 2.5 días/mes
        vacaciones_prov = (salario / 30) * 2.5 / 12

        # Prima de antigüedad: 1 semana por año trabajado (provisión mensual)
        prima_antig = 0.0
        if years_worked > 0:
            prima_antig = (salario / 4) / 12  # salario/48 por mes

        carga_patronal = (
            ss_patronal + se_patronal + rp_patronal +
            decimo_prov + vacaciones_prov + prima_antig
        )
        employer_cost = salario + carga_patronal

        # --- Retenciones al Empleado ---
        ss_empleado = salario * 0.0975       # SS empleado
        se_empleado = salario * 0.0125       # SE empleado
        isr_empleado = calcular_isr_mensual(salario)

        total_deductions = ss_empleado + se_empleado + isr_empleado
        employee_net = salario - total_deductions

        return {
            "employer_cost": round(employer_cost, 2),
            "employee_net": round(employee_net, 2),
            "total_deductions": round(total_deductions, 2),
            "carga_patronal_pct": round((carga_patronal / salario) * 100, 2) if salario > 0 else 0,
            "breakdown": {
                "css_patronal_13_25": round(ss_patronal, 2),
                "se_patronal": round(se_patronal, 2),
                "rp_patronal": round(rp_patronal, 2),
                "decimo_provision": round(decimo_prov, 2),
                "vacaciones_provision": round(vacaciones_prov, 2),
                "prima_antiguedad_provision": round(prima_antig, 2),
                "carga_patronal_total": round(carga_patronal, 2),
                "ss_empleado": round(ss_empleado, 2),
                "se_empleado": round(se_empleado, 2),
                "isr_empleado": round(isr_empleado, 2),
            },
        }

    elif tipo == "freelance":
        # Servicios Profesionales: empresa paga bruto, retiene 10% si aplica
        employer_cost = salario
        retencion_10 = salario * 0.10
        employee_net = salario - retencion_10

        return {
            "employer_cost": round(employer_cost, 2),
            "employee_net": round(employee_net, 2),
            "total_deductions": round(retencion_10, 2),
            "carga_patronal_pct": 0,
            "breakdown": {
                "retencion_isr_10pct": round(retencion_10, 2),
            },
        }

    return {
        "employer_cost": salario,
        "employee_net": salario,
        "total_deductions": 0,
        "carga_patronal_pct": 0,
        "breakdown": {},
    }


def calcular_liquidacion(
    salario: float,
    years_worked: int,
    exit_reason: str,
    vacation_days_accrued: float = 0,
    vacation_days_taken: float = 0,
    xiii_mes_accumulated: float = 0,
    months_current_tercio: int = 0,
) -> dict:
    """
    Calcula la liquidacion laboral por renuncia o despido.

    Args:
        salario: Salario bruto mensual
        years_worked: Anos trabajados
        exit_reason: 'renuncia', 'despido', 'mutuo_acuerdo', 'fin_contrato'
        vacation_days_accrued: Dias de vacaciones acumulados pendientes
        vacation_days_taken: Dias ya tomados
        xiii_mes_accumulated: XIII Mes ya provisionado pero no pagado
        months_current_tercio: Meses transcurridos en el tercio actual (para XIII proporcional)

    Returns:
        dict con desglose de la liquidacion
    """
    salario_diario = salario / 30

    # Vacaciones proporcionales pendientes
    vacation_pending = max(0, vacation_days_accrued - vacation_days_taken)
    pago_vacaciones = vacation_pending * salario_diario

    # XIII Mes proporcional (lo que se debe del tercio actual)
    xiii_proporcional = (salario / 12) * months_current_tercio
    pago_xiii = max(0, xiii_proporcional - xiii_mes_accumulated)

    # Prima de antiguedad: 1 semana por ano trabajado
    prima_antiguedad = 0.0
    if years_worked > 0:
        prima_antiguedad = (salario / 4) * years_worked  # salario semanal * anos

    # Indemnizacion (solo aplica en despido injustificado)
    indemnizacion = 0.0
    if exit_reason == "despido":
        # 3.4 semanas por cada ano laborado (Art. 225 Codigo de Trabajo PTY)
        indemnizacion = (salario / 4) * 3.4 * years_worked

    total = pago_vacaciones + pago_xiii + prima_antiguedad + indemnizacion

    return {
        "salario_base": round(salario, 2),
        "years_worked": years_worked,
        "exit_reason": exit_reason,
        "pago_vacaciones_proporcional": round(pago_vacaciones, 2),
        "vacation_days_pending": round(vacation_pending, 1),
        "pago_xiii_proporcional": round(pago_xiii, 2),
        "prima_antiguedad": round(prima_antiguedad, 2),
        "indemnizacion": round(indemnizacion, 2),
        "total_liquidacion": round(total, 2),
        "aplica_indemnizacion": exit_reason == "despido",
    }


def calcular_reserva_xiii_mes(empleados: list[dict], months_in_tercio: int) -> dict:
    """
    Calcula la reserva acumulada de XIII Mes para un grupo de empleados.
    El XIII Mes se paga en 3 partidas: 15 abril, 15 agosto, 15 diciembre.
    Provision mensual: 8.33% del salario bruto.

    Args:
        empleados: Lista con gross_salary y contract_type
        months_in_tercio: Meses transcurridos en el tercio actual (1-4)

    Returns:
        dict con reserva total y desglose
    """
    total_reserva = 0.0
    detalles = []

    for emp in empleados:
        if emp.get("contract_type") != "payroll":
            continue
        salario = emp.get("gross_salary", 0)
        provision_mensual = salario / 12  # 8.33%
        acumulado = provision_mensual * months_in_tercio
        total_reserva += acumulado
        detalles.append({
            "employee_name": emp.get("employee_name", ""),
            "provision_mensual": round(provision_mensual, 2),
            "acumulado_tercio": round(acumulado, 2),
        })

    return {
        "months_in_tercio": months_in_tercio,
        "total_reserva_pendiente": round(total_reserva, 2),
        "empleados": detalles,
    }


def calcular_deduccion_ausencia(salario: float, dias_injustificados: int) -> dict:
    """
    Calcula el descuento por faltas injustificadas.
    Salario Bruto Ajustado = (Salario / 30) * (30 - Faltas)
    Las faltas reducen la base para SS y SE.

    Args:
        salario: Salario bruto mensual
        dias_injustificados: Dias de falta sin justificacion

    Returns:
        dict con salario ajustado y ahorros patronales
    """
    salario_diario = salario / 30
    deduccion = salario_diario * dias_injustificados
    salario_ajustado = salario - deduccion

    # Ahorro patronal por la reduccion de base
    ahorro_ss = deduccion * 0.1325
    ahorro_se = deduccion * 0.015
    ahorro_rp = deduccion * 0.015
    ahorro_total = ahorro_ss + ahorro_se + ahorro_rp

    return {
        "salario_original": round(salario, 2),
        "dias_injustificados": dias_injustificados,
        "deduccion_empleado": round(deduccion, 2),
        "salario_ajustado": round(salario_ajustado, 2),
        "ahorro_patronal_ss": round(ahorro_ss, 2),
        "ahorro_patronal_se": round(ahorro_se, 2),
        "ahorro_patronal_rp": round(ahorro_rp, 2),
        "ahorro_patronal_total": round(ahorro_total, 2),
    }


def calcular_recargo_feriado(salario_diario: float, tipo_recargo: str) -> dict:
    """
    Calcula el recargo por trabajar en feriado o domingo.

    Args:
        salario_diario: Salario bruto / 30
        tipo_recargo: 'feriado' (150%), 'domingo' (50%), 'extra_diurna' (25%),
                      'extra_nocturna' (75%), 'nocturno' (50%)

    Returns:
        dict con pago base, recargo y total
    """
    RECARGOS = {
        "feriado": 1.50,
        "domingo": 0.50,
        "extra_diurna": 0.25,
        "extra_nocturna": 0.75,
        "nocturno": 0.50,
    }

    pct = RECARGOS.get(tipo_recargo, 0)
    recargo = salario_diario * pct
    total = salario_diario + recargo

    return {
        "tipo_recargo": tipo_recargo,
        "salario_diario": round(salario_diario, 2),
        "porcentaje_recargo": f"{pct * 100:.0f}%",
        "monto_recargo": round(recargo, 2),
        "pago_total_dia": round(total, 2),
    }


def calcular_nomina_total(empleados: list[dict]) -> dict:
    """
    Calcula la nómina completa de un equipo.

    Args:
        empleados: Lista de dicts con employee_name, contract_type,
                   gross_salary, years_worked (optional)

    Returns:
        dict con total_employer_cost, total_net, detalles por empleado
    """
    total_employer = 0.0
    total_net = 0.0
    detalles = []

    for emp in empleados:
        resultado = calcular_carga_panama(
            emp["gross_salary"],
            emp["contract_type"],
            emp.get("years_worked", 0),
        )
        total_employer += resultado["employer_cost"]
        total_net += resultado["employee_net"]
        detalles.append({
            "employee_name": emp["employee_name"],
            "contract_type": emp["contract_type"],
            "gross_salary": emp["gross_salary"],
            "years_worked": emp.get("years_worked", 0),
            **resultado,
        })

    return {
        "total_employer_cost": round(total_employer, 2),
        "total_employee_net": round(total_net, 2),
        "hidden_cost": round(total_employer - sum(e["gross_salary"] for e in empleados), 2),
        "employees": detalles,
        "ley": "Ley 462 de 2025 — CSS Patronal 13.25%",
    }
