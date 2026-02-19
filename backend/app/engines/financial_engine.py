"""
Motor de Verdad Financiera
Portado desde SG Consulting. Calcula:
- Cascada P&L (Waterfall)
- Ratios operativos y financieros
- Punto de equilibrio
- Ciclo de conversión de efectivo (CCC)
- Valoración por múltiplos
- Diagnóstico automático (Juez Digital)
"""
from typing import Optional


def calcular_cascada(record: dict) -> dict:
    """Cascada de rentabilidad: de la venta a la utilidad neta."""
    revenue = record.get("revenue", 0)
    cogs = record.get("cogs", 0)
    opex_rent = record.get("opex_rent", 0)
    opex_payroll = record.get("opex_payroll", 0)
    opex_other = record.get("opex_other", 0)
    depreciation = record.get("depreciation", 0)
    interest = record.get("interest_expense", 0)
    tax = record.get("tax_expense", 0)

    gross_profit = revenue - cogs
    total_opex = opex_rent + opex_payroll + opex_other
    ebitda = gross_profit - total_opex
    ebit = ebitda - depreciation
    ebt = ebit - interest
    net_income = ebt - tax

    return {
        "revenue": revenue,
        "cogs": cogs,
        "gross_profit": round(gross_profit, 2),
        "total_opex": round(total_opex, 2),
        "ebitda": round(ebitda, 2),
        "ebit": round(ebit, 2),
        "ebt": round(ebt, 2),
        "net_income": round(net_income, 2),
        "waterfall_steps": [
            {"label": "Ventas", "value": revenue, "type": "increase"},
            {"label": "Costo Ventas", "value": -cogs, "type": "decrease"},
            {"label": "= Ut. Bruta", "value": gross_profit, "type": "total"},
            {"label": "OPEX", "value": -total_opex, "type": "decrease"},
            {"label": "= EBITDA", "value": ebitda, "type": "total"},
            {"label": "Depreciacion", "value": -depreciation, "type": "decrease"},
            {"label": "= EBIT", "value": ebit, "type": "total"},
            {"label": "Int. Financieros", "value": -interest, "type": "decrease"},
            {"label": "= EBT", "value": ebt, "type": "total"},
            {"label": "Impuestos", "value": -tax, "type": "decrease"},
            {"label": "= Ut. Neta", "value": net_income, "type": "total"},
        ],
    }


def calcular_ratios(record: dict) -> dict:
    """Ratios financieros operativos y de solvencia."""
    revenue = record.get("revenue", 0)
    cogs = record.get("cogs", 0)
    opex_rent = record.get("opex_rent", 0)
    opex_payroll = record.get("opex_payroll", 0)
    opex_other = record.get("opex_other", 0)
    interest = record.get("interest_expense", 0)
    cash = record.get("cash_balance", 0)
    ar = record.get("accounts_receivable", 0)
    inventory = record.get("inventory", 0)
    ap = record.get("accounts_payable", 0)
    debt = record.get("bank_debt", 0)

    gross_profit = revenue - cogs
    total_opex = opex_rent + opex_payroll + opex_other
    ebitda = gross_profit - total_opex

    # Margenes
    gross_margin = (gross_profit / revenue * 100) if revenue > 0 else 0
    ebitda_margin = (ebitda / revenue * 100) if revenue > 0 else 0

    # Eficiencia operativa
    rent_ratio = (opex_rent / revenue * 100) if revenue > 0 else 0
    payroll_ratio = (opex_payroll / gross_profit * 100) if gross_profit > 0 else 0

    # Solvencia
    pasivo_cp = ap + debt
    acid_test = (cash + ar) / pasivo_cp if pasivo_cp > 0 else 0
    debt_coverage = ebitda / interest if interest > 0 else 10.0

    # Oxigeno (CCC)
    days_receivable = (ar / revenue * 30) if revenue > 0 else 0
    days_inventory = (inventory / cogs * 30) if cogs > 0 else 0
    days_payable = (ap / cogs * 30) if cogs > 0 else 0
    ccc = days_receivable + days_inventory - days_payable

    # Radar ITBMS
    annual_revenue = revenue * 12
    itbms_status = (
        "obligatorio" if annual_revenue >= 36000
        else "precaucion" if annual_revenue >= 30000
        else "libre"
    )

    return {
        "margins": {
            "gross_margin_pct": round(gross_margin, 2),
            "ebitda_margin_pct": round(ebitda_margin, 2),
        },
        "efficiency": {
            "rent_ratio_pct": round(rent_ratio, 2),
            "payroll_ratio_pct": round(payroll_ratio, 2),
            "rent_status": "danger" if rent_ratio > 15 else "warning" if rent_ratio > 10 else "ok",
            "payroll_status": "danger" if payroll_ratio > 45 else "warning" if payroll_ratio > 35 else "ok",
        },
        "solvency": {
            "acid_test": round(acid_test, 2),
            "debt_coverage": round(debt_coverage, 2),
            "acid_status": "ok" if acid_test >= 1.0 else "danger",
            "debt_status": "ok" if debt_coverage >= 1.5 else "danger",
        },
        "oxygen": {
            "days_receivable": round(days_receivable, 1),
            "days_inventory": round(days_inventory, 1),
            "days_payable": round(days_payable, 1),
            "ccc_days": round(ccc, 1),
            "trapped_cash": round(ar + inventory, 2),
        },
        "fiscal": {
            "annual_revenue_projected": round(annual_revenue, 2),
            "itbms_status": itbms_status,
        },
    }


def calcular_punto_equilibrio(record: dict, ganancia_deseada: float = 0) -> dict:
    """Punto de equilibrio y venta necesaria para meta."""
    revenue = record.get("revenue", 0)
    cogs = record.get("cogs", 0)
    opex_rent = record.get("opex_rent", 0)
    opex_payroll = record.get("opex_payroll", 0)
    opex_other = record.get("opex_other", 0)
    interest = record.get("interest_expense", 0)

    costos_fijos = opex_rent + opex_payroll + opex_other + interest
    mc_ratio = (revenue - cogs) / revenue if revenue > 0 else 0

    breakeven = costos_fijos / mc_ratio if mc_ratio > 0 else 0
    target_sales = (costos_fijos + ganancia_deseada) / mc_ratio if mc_ratio > 0 else 0
    margin_of_safety = revenue - breakeven

    return {
        "breakeven_monthly": round(breakeven, 2),
        "current_sales": round(revenue, 2),
        "margin_of_safety": round(margin_of_safety, 2),
        "target_sales": round(target_sales, 2) if ganancia_deseada > 0 else None,
        "zone": "profit" if margin_of_safety > 0 else "even" if margin_of_safety == 0 else "loss",
        "contribution_margin_pct": round(mc_ratio * 100, 2),
    }


def diagnostico_juez_digital(record: dict) -> dict:
    """Juez Digital: veredicto automático del estado del negocio."""
    ratios = calcular_ratios(record)
    cascada = calcular_cascada(record)

    ebitda = cascada["ebitda"]
    ccc = ratios["oxygen"]["ccc_days"]
    rent_ratio = ratios["efficiency"]["rent_ratio_pct"]
    ebitda_margin = ratios["margins"]["ebitda_margin_pct"]

    # Veredicto principal
    if ebitda < 0:
        verdict = "INTERVENCIÓN DE EMERGENCIA"
        detail = "El negocio consume capital. Problema estructural."
        severity = "critical"
    elif ccc > 60:
        verdict = "AGUJERO NEGRO"
        detail = "Rentable pero insolvente. Prioridad: Cobrar."
        severity = "warning"
    elif rent_ratio > 15:
        verdict = "RIESGO INMOBILIARIO"
        detail = "Trabajas para pagar el local."
        severity = "warning"
    else:
        verdict = "EMPRESA SALUDABLE Y ESCALABLE"
        detail = "Listo para crecer."
        severity = "ok"

    # Diagnóstico del motor
    if ebitda_margin < 10:
        motor = "Motor débil. Tu margen operativo es muy bajo (<10%)."
        motor_status = "weak"
    elif ebitda_margin < 15:
        motor = "Motor estable. La operación genera flujo positivo."
        motor_status = "stable"
    else:
        motor = "Motor potente. Capacidad de reinversión sin desangrar la caja."
        motor_status = "strong"

    # Plan de choque
    actions = []
    if rent_ratio > 15:
        actions.append("ALQUILER: Renegociar contrato o subarrendar.")
    if ratios["efficiency"]["payroll_ratio_pct"] > 45:
        actions.append("NOMINA: Revisar eficiencia y turnos.")
    if ratios["solvency"]["debt_coverage"] < 1.5:
        actions.append("DEUDA: Detener deuda nueva.")
    if ratios["solvency"]["acid_test"] < 1.0:
        actions.append("LIQUIDEZ: Ejecutar rescate de caja.")

    # Legado
    if ebitda_margin > 15:
        legacy = "EMPRESA ESCALABLE: Capacidad para reinvertir."
    elif cascada["net_income"] > 0:
        legacy = "EMPRESA EN CRECIMIENTO: Optimizar antes de escalar."
    else:
        legacy = "EMPRESA EN TERAPIA: Prioridad absoluta detener sangrado."

    return {
        "verdict": verdict,
        "detail": detail,
        "severity": severity,
        "motor": {"description": motor, "status": motor_status},
        "legacy": legacy,
        "action_plan": actions,
        "cascada": cascada,
        "ratios": ratios,
    }


def valoracion_empresa(ebitda_mensual: float, multiplo: float = 3.0) -> dict:
    """Valoración por múltiplos de EBITDA."""
    ebitda_anual = ebitda_mensual * 12
    valor = ebitda_anual * multiplo

    return {
        "ebitda_monthly": round(ebitda_mensual, 2),
        "ebitda_annual": round(ebitda_anual, 2),
        "multiple": multiplo,
        "enterprise_value": round(valor, 2),
    }
