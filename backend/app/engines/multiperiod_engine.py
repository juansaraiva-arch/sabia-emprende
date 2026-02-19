"""
Motor Multi-Periodo — Fase 10
Tendencias, comparaciones, proyecciones y varianza presupuestal.
Reutiliza calcular_cascada y calcular_ratios del financial_engine.
"""
import math
from app.engines.financial_engine import calcular_cascada, calcular_ratios


MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


def _period_label(year: int, month: int) -> str:
    return f"{MONTHS_ES[month - 1]} {year}"


def _safe_pct_change(old: float, new: float) -> float:
    """Cambio porcentual seguro (evita division por cero)."""
    if abs(old) < 0.01:
        return 0.0 if abs(new) < 0.01 else 100.0
    return round((new - old) / abs(old) * 100, 2)


def _moving_average(values: list[float], window: int = 3) -> list[float | None]:
    """Promedio movil simple. Retorna None para los primeros (window-1) elementos."""
    result: list[float | None] = []
    for i in range(len(values)):
        if i < window - 1:
            result.append(None)
        else:
            avg = sum(values[i - window + 1 : i + 1]) / window
            result.append(round(avg, 2))
    return result


def _std_dev(values: list[float]) -> float:
    """Desviacion estandar sin numpy."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
    return math.sqrt(variance)


# ============================================
# 1. TENDENCIAS
# ============================================

def calcular_tendencias(records: list[dict]) -> dict:
    """
    Calcula tendencias a partir de una lista de registros financieros
    ordenados por periodo ASC.

    Retorna:
    - points: lista de puntos con metricas calculadas
    - growth_rates: tasa de crecimiento primera → ultima observacion
    - moving_averages: promedios moviles de 3 meses
    """
    if not records:
        return {"points": [], "growth_rates": {}, "moving_averages": {}}

    points = []
    revenues = []
    ebitdas = []
    net_incomes = []

    for rec in records:
        cascada = calcular_cascada(rec)
        revenue = cascada["revenue"]
        ebitda = cascada["ebitda"]
        net_income = cascada["net_income"]
        gross_profit = cascada["gross_profit"]

        gross_margin_pct = round((gross_profit / revenue * 100) if revenue > 0 else 0, 2)
        ebitda_margin_pct = round((ebitda / revenue * 100) if revenue > 0 else 0, 2)
        net_margin_pct = round((net_income / revenue * 100) if revenue > 0 else 0, 2)

        year = rec.get("period_year", 2026)
        month = rec.get("period_month", 1)

        points.append({
            "year": year,
            "month": month,
            "label": _period_label(year, month),
            "revenue": revenue,
            "cogs": cascada["cogs"],
            "gross_profit": gross_profit,
            "total_opex": cascada["total_opex"],
            "ebitda": ebitda,
            "net_income": net_income,
            "gross_margin_pct": gross_margin_pct,
            "ebitda_margin_pct": ebitda_margin_pct,
            "net_margin_pct": net_margin_pct,
        })

        revenues.append(revenue)
        ebitdas.append(ebitda)
        net_incomes.append(net_income)

    # Growth rates (primera → ultima)
    growth_rates = {}
    if len(points) >= 2:
        first = points[0]
        last = points[-1]
        for key in ["revenue", "ebitda", "net_income", "gross_margin_pct", "ebitda_margin_pct"]:
            growth_rates[key] = _safe_pct_change(first[key], last[key])

    # Moving averages (ventana de 3 meses)
    moving_averages = {
        "revenue": _moving_average(revenues),
        "ebitda": _moving_average(ebitdas),
        "net_income": _moving_average(net_incomes),
    }

    return {
        "points": points,
        "growth_rates": growth_rates,
        "moving_averages": moving_averages,
    }


# ============================================
# 2. COMPARACION DE PERIODOS
# ============================================

# Metricas donde menor = mejor
_LOWER_IS_BETTER = {"cogs", "total_opex", "rent_ratio_pct", "payroll_ratio_pct", "ccc_days"}

def comparar_periodos(record_a: dict, record_b: dict) -> dict:
    """
    Compara dos periodos lado a lado con analisis de deltas.

    Retorna:
    - period_a / period_b: cascada + ratios completos
    - deltas: diferencia absoluta por metrica
    - pct_changes: cambio porcentual por metrica
    - improvements / deteriorations: listas de metricas mejoradas/empeoradas
    """
    cascada_a = calcular_cascada(record_a)
    cascada_b = calcular_cascada(record_b)
    ratios_a = calcular_ratios(record_a)
    ratios_b = calcular_ratios(record_b)

    period_a = {"cascada": cascada_a, "ratios": ratios_a}
    period_b = {"cascada": cascada_b, "ratios": ratios_b}

    # Metricas a comparar desde cascada
    compare_keys = [
        "revenue", "cogs", "gross_profit", "total_opex", "ebitda", "net_income"
    ]

    deltas = {}
    pct_changes = {}
    improvements = []
    deteriorations = []

    for key in compare_keys:
        val_a = cascada_a.get(key, 0)
        val_b = cascada_b.get(key, 0)
        delta = round(val_b - val_a, 2)
        pct = _safe_pct_change(val_a, val_b)
        deltas[key] = delta
        pct_changes[key] = pct

        # Clasificar mejora/deterioro
        if key in _LOWER_IS_BETTER:
            if delta < 0:
                improvements.append(key)
            elif delta > 0:
                deteriorations.append(key)
        else:
            if delta > 0:
                improvements.append(key)
            elif delta < 0:
                deteriorations.append(key)

    # Comparar ratios clave
    ratio_keys = {
        "gross_margin_pct": ("margins", "gross_margin_pct"),
        "ebitda_margin_pct": ("margins", "ebitda_margin_pct"),
        "rent_ratio_pct": ("efficiency", "rent_ratio_pct"),
        "payroll_ratio_pct": ("efficiency", "payroll_ratio_pct"),
        "acid_test": ("solvency", "acid_test"),
        "ccc_days": ("oxygen", "ccc_days"),
    }

    for label, (group, key) in ratio_keys.items():
        val_a = ratios_a.get(group, {}).get(key, 0)
        val_b = ratios_b.get(group, {}).get(key, 0)
        delta = round(val_b - val_a, 2)
        pct = _safe_pct_change(val_a, val_b)
        deltas[label] = delta
        pct_changes[label] = pct

        if label in _LOWER_IS_BETTER:
            if delta < -0.01:
                improvements.append(label)
            elif delta > 0.01:
                deteriorations.append(label)
        else:
            if delta > 0.01:
                improvements.append(label)
            elif delta < -0.01:
                deteriorations.append(label)

    return {
        "period_a": period_a,
        "period_b": period_b,
        "deltas": deltas,
        "pct_changes": pct_changes,
        "improvements": improvements,
        "deteriorations": deteriorations,
    }


# ============================================
# 3. PROYECCION (FORECAST)
# ============================================

def proyectar_futuro(records: list[dict], months_ahead: int = 6) -> dict:
    """
    Proyecta metricas financieras hacia el futuro usando promedio movil de 3 meses.
    Sin dependencias externas (no numpy).

    Retorna:
    - historical: lista de TrendPoints del historico
    - projected: lista de ForecastPoints proyectados
    - method: "moving_average"
    """
    tendencias = calcular_tendencias(records)
    historical = tendencias["points"]

    if len(historical) < 2:
        return {
            "historical": historical,
            "projected": [],
            "method": "moving_average",
        }

    # Obtener ultimos valores para proyectar
    revenues = [p["revenue"] for p in historical]
    ebitdas = [p["ebitda"] for p in historical]
    net_incomes = [p["net_income"] for p in historical]

    # Calcular desviacion estandar para banda de confianza
    rev_std = _std_dev(revenues[-6:]) if len(revenues) >= 3 else _std_dev(revenues)
    ebitda_std = _std_dev(ebitdas[-6:]) if len(ebitdas) >= 3 else _std_dev(ebitdas)

    # Ultimo periodo
    last_point = historical[-1]
    last_year = last_point["year"]
    last_month = last_point["month"]

    # Window para promedio movil
    window = min(3, len(revenues))

    projected = []
    # Usar copias extendidas para ir proyectando
    rev_ext = list(revenues)
    ebitda_ext = list(ebitdas)
    net_ext = list(net_incomes)

    for i in range(months_ahead):
        # Calcular siguiente mes
        next_month = last_month + i + 1
        next_year = last_year + (next_month - 1) // 12
        next_month = ((next_month - 1) % 12) + 1

        # Promedio movil de las ultimas `window` observaciones (incluye proyecciones anteriores)
        rev_proj = round(sum(rev_ext[-window:]) / window, 2)
        ebitda_proj = round(sum(ebitda_ext[-window:]) / window, 2)
        net_proj = round(sum(net_ext[-window:]) / window, 2)

        # Banda de confianza (±1 std dev)
        confidence_low = round(rev_proj - rev_std, 2)
        confidence_high = round(rev_proj + rev_std, 2)

        projected.append({
            "year": next_year,
            "month": next_month,
            "label": _period_label(next_year, next_month),
            "revenue": rev_proj,
            "ebitda": ebitda_proj,
            "net_income": net_proj,
            "confidence_low": confidence_low,
            "confidence_high": confidence_high,
        })

        # Agregar al buffer para calcular siguientes promedios moviles
        rev_ext.append(rev_proj)
        ebitda_ext.append(ebitda_proj)
        net_ext.append(net_proj)

    return {
        "historical": historical,
        "projected": projected,
        "method": "moving_average",
    }


# ============================================
# 4. VARIANZA PRESUPUESTAL
# ============================================

def calcular_varianza_presupuesto(actual: dict, budget: dict) -> dict:
    """
    Compara valores reales vs presupuestados.

    actual: financial_record del periodo
    budget: budget_target del mismo periodo

    Retorna:
    - period_year, period_month
    - items: lista de metricas con actual, budget, variance, variance_pct, status
    - overall_score: % de metricas on_track o favorables
    """
    # Mapeo: (campo real, campo presupuesto, mayor_es_mejor)
    metrics = [
        ("revenue", "revenue_target", True),
        ("cogs", "cogs_target", False),
        ("opex_rent", "opex_rent_target", False),
        ("opex_payroll", "opex_payroll_target", False),
        ("opex_other", "opex_other_target", False),
    ]

    LABELS = {
        "revenue": "Ventas",
        "cogs": "Costo de Ventas",
        "opex_rent": "Alquiler",
        "opex_payroll": "Nomina",
        "opex_other": "Otros Gastos",
    }

    items = []
    favorable_count = 0

    for actual_key, budget_key, higher_is_better in metrics:
        actual_val = actual.get(actual_key, 0) or 0
        budget_val = budget.get(budget_key, 0) or 0
        variance = round(actual_val - budget_val, 2)
        variance_pct = _safe_pct_change(budget_val, actual_val)

        # Determinar status
        if abs(variance_pct) <= 5:
            status = "on_track"
            favorable_count += 1
        elif higher_is_better:
            status = "favorable" if variance > 0 else "desfavorable"
            if variance > 0:
                favorable_count += 1
        else:
            status = "favorable" if variance < 0 else "desfavorable"
            if variance < 0:
                favorable_count += 1

        items.append({
            "metric": LABELS.get(actual_key, actual_key),
            "metric_key": actual_key,
            "actual": actual_val,
            "budget": budget_val,
            "variance": variance,
            "variance_pct": variance_pct,
            "status": status,
        })

    overall_score = round((favorable_count / len(metrics) * 100) if metrics else 0, 1)

    # Agregar metricas derivadas
    actual_cascada = calcular_cascada(actual)
    budget_gross = (budget.get("revenue_target", 0) or 0) - (budget.get("cogs_target", 0) or 0)
    budget_opex = (budget.get("opex_rent_target", 0) or 0) + (budget.get("opex_payroll_target", 0) or 0) + (budget.get("opex_other_target", 0) or 0)
    budget_ebitda = budget_gross - budget_opex

    items.append({
        "metric": "EBITDA",
        "metric_key": "ebitda",
        "actual": actual_cascada["ebitda"],
        "budget": round(budget_ebitda, 2),
        "variance": round(actual_cascada["ebitda"] - budget_ebitda, 2),
        "variance_pct": _safe_pct_change(budget_ebitda, actual_cascada["ebitda"]),
        "status": "favorable" if actual_cascada["ebitda"] >= budget_ebitda else "desfavorable",
    })

    return {
        "period_year": actual.get("period_year", 0),
        "period_month": actual.get("period_month", 0),
        "items": items,
        "overall_score": overall_score,
    }
