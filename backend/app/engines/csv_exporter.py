"""
Motor de exportacion CSV — Mi Director Financiero PTY
Genera archivos CSV desde datos del motor financiero y multi-periodo.
Sin dependencias externas (solo stdlib: csv, io).
"""
import csv
import io


BOM = "\ufeff"  # UTF-8 BOM para compatibilidad con Excel


def _csv_bytes(rows: list[list], headers: list[str]) -> bytes:
    """Convierte lista de filas a CSV bytes con BOM UTF-8."""
    output = io.StringIO()
    output.write(BOM)
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def _pct_of_revenue(value: float, revenue: float) -> str:
    """Porcentaje sobre ventas, seguro contra division por cero."""
    if revenue <= 0:
        return "0.00%"
    return f"{(value / revenue * 100):.2f}%"


# ============================================
# 1. CASCADA P&L + RATIOS
# ============================================

def export_cascada_csv(cascada: dict, ratios: dict) -> bytes:
    """
    Exporta cascada P&L + ratios clave como CSV.

    cascada: output de calcular_cascada()
    ratios: output de calcular_ratios()
    """
    headers = ["Concepto", "Valor ($)", "% sobre Ventas"]
    revenue = cascada.get("revenue", 0)

    rows = [
        ["Ventas", f"{revenue:,.2f}", "100.00%"],
        ["(-) Costo de Ventas", f"{cascada.get('cogs', 0):,.2f}", _pct_of_revenue(cascada.get("cogs", 0), revenue)],
        ["= Utilidad Bruta", f"{cascada.get('gross_profit', 0):,.2f}", _pct_of_revenue(cascada.get("gross_profit", 0), revenue)],
        ["(-) Gastos Operativos", f"{cascada.get('total_opex', 0):,.2f}", _pct_of_revenue(cascada.get("total_opex", 0), revenue)],
        ["= EBITDA", f"{cascada.get('ebitda', 0):,.2f}", _pct_of_revenue(cascada.get("ebitda", 0), revenue)],
        ["(-) Depreciacion", f"{cascada.get('ebit', 0) - cascada.get('ebitda', 0):,.2f}" if cascada.get("ebitda") != cascada.get("ebit") else "-", ""],
        ["= EBIT", f"{cascada.get('ebit', 0):,.2f}", _pct_of_revenue(cascada.get("ebit", 0), revenue)],
        ["= Utilidad Neta", f"{cascada.get('net_income', 0):,.2f}", _pct_of_revenue(cascada.get("net_income", 0), revenue)],
        [],
        ["--- RATIOS CLAVE ---", "", ""],
        ["Margen Bruto", f"{ratios.get('margins', {}).get('gross_margin_pct', 0):.2f}%", ""],
        ["Margen EBITDA", f"{ratios.get('margins', {}).get('ebitda_margin_pct', 0):.2f}%", ""],
        ["Ratio Alquiler/Ventas", f"{ratios.get('efficiency', {}).get('rent_ratio_pct', 0):.2f}%", ""],
        ["Ratio Nomina/UB", f"{ratios.get('efficiency', {}).get('payroll_ratio_pct', 0):.2f}%", ""],
        ["Prueba Acida", f"{ratios.get('solvency', {}).get('acid_test', 0):.2f}", ""],
        ["Cobertura de Deuda", f"{ratios.get('solvency', {}).get('debt_coverage', 0):.2f}", ""],
        ["CCC (dias)", f"{ratios.get('oxygen', {}).get('ccc_days', 0):.1f}", ""],
    ]
    return _csv_bytes(rows, headers)


# ============================================
# 2. TENDENCIAS MULTI-PERIODO
# ============================================

def export_trends_csv(trends_data: dict) -> bytes:
    """
    Exporta tendencias multi-periodo como CSV.

    trends_data: output de calcular_tendencias()
    """
    headers = [
        "Periodo", "Ventas", "COGS", "Ut.Bruta", "OPEX",
        "EBITDA", "Ut.Neta", "Margen Bruto %", "Margen EBITDA %", "Margen Neto %",
    ]
    rows = []
    for pt in trends_data.get("points", []):
        rows.append([
            pt.get("label", ""),
            f"{pt.get('revenue', 0):,.2f}",
            f"{pt.get('cogs', 0):,.2f}",
            f"{pt.get('gross_profit', 0):,.2f}",
            f"{pt.get('total_opex', 0):,.2f}",
            f"{pt.get('ebitda', 0):,.2f}",
            f"{pt.get('net_income', 0):,.2f}",
            f"{pt.get('gross_margin_pct', 0):.2f}",
            f"{pt.get('ebitda_margin_pct', 0):.2f}",
            f"{pt.get('net_margin_pct', 0):.2f}",
        ])

    # Agregar fila de crecimiento si existe
    gr = trends_data.get("growth_rates", {})
    if gr:
        rows.append([])
        rows.append([
            "Crecimiento (%)",
            f"{gr.get('revenue', 0):.2f}",
            "",
            "",
            "",
            f"{gr.get('ebitda', 0):.2f}",
            f"{gr.get('net_income', 0):.2f}",
            f"{gr.get('gross_margin_pct', 0):.2f}",
            f"{gr.get('ebitda_margin_pct', 0):.2f}",
            "",
        ])

    return _csv_bytes(rows, headers)


# ============================================
# 3. COMPARATIVO DE PERIODOS
# ============================================

def export_comparison_csv(
    comparison_data: dict,
    label_a: str = "Periodo A",
    label_b: str = "Periodo B",
) -> bytes:
    """
    Exporta comparacion lado a lado de dos periodos como CSV.

    comparison_data: output de comparar_periodos()
    """
    headers = ["Metrica", label_a, label_b, "Delta ($)", "Cambio (%)"]

    cascada_keys = ["revenue", "cogs", "gross_profit", "total_opex", "ebitda", "net_income"]
    labels = {
        "revenue": "Ventas",
        "cogs": "Costo de Ventas",
        "gross_profit": "Utilidad Bruta",
        "total_opex": "Gastos Operativos",
        "ebitda": "EBITDA",
        "net_income": "Utilidad Neta",
    }

    cas_a = comparison_data.get("period_a", {}).get("cascada", {})
    cas_b = comparison_data.get("period_b", {}).get("cascada", {})
    deltas = comparison_data.get("deltas", {})
    pcts = comparison_data.get("pct_changes", {})

    rows = []
    for key in cascada_keys:
        rows.append([
            labels.get(key, key),
            f"{cas_a.get(key, 0):,.2f}",
            f"{cas_b.get(key, 0):,.2f}",
            f"{deltas.get(key, 0):,.2f}",
            f"{pcts.get(key, 0):.2f}%",
        ])

    # Agregar ratios
    ratio_keys = [
        ("gross_margin_pct", "Margen Bruto %"),
        ("ebitda_margin_pct", "Margen EBITDA %"),
        ("rent_ratio_pct", "Ratio Alquiler %"),
        ("payroll_ratio_pct", "Ratio Nomina %"),
        ("acid_test", "Prueba Acida"),
        ("ccc_days", "CCC (dias)"),
    ]
    rows.append([])
    rows.append(["--- RATIOS ---", "", "", "", ""])
    for key, label in ratio_keys:
        if key in deltas:
            rat_a = comparison_data.get("period_a", {}).get("ratios", {})
            rat_b = comparison_data.get("period_b", {}).get("ratios", {})

            # Buscar en sub-dicts de ratios
            val_a = _find_ratio_value(rat_a, key)
            val_b = _find_ratio_value(rat_b, key)

            rows.append([
                label,
                f"{val_a:.2f}",
                f"{val_b:.2f}",
                f"{deltas.get(key, 0):.2f}",
                f"{pcts.get(key, 0):.2f}%",
            ])

    # Resumen
    improvements = comparison_data.get("improvements", [])
    deteriorations = comparison_data.get("deteriorations", [])
    rows.append([])
    rows.append(["Mejoras", str(len(improvements)), "", "", ""])
    rows.append(["Deterioros", str(len(deteriorations)), "", "", ""])

    return _csv_bytes(rows, headers)


def _find_ratio_value(ratios: dict, key: str) -> float:
    """Busca un valor de ratio en los sub-dicts del resultado de calcular_ratios()."""
    for group in ["margins", "efficiency", "solvency", "oxygen", "fiscal"]:
        sub = ratios.get(group, {})
        if key in sub:
            return sub[key]
    return 0.0


# ============================================
# 4. PRESUPUESTO VS REAL
# ============================================

def export_budget_variance_csv(variance_data: dict) -> bytes:
    """
    Exporta varianza presupuestal como CSV.

    variance_data: output de calcular_varianza_presupuesto()
    """
    headers = ["Metrica", "Real ($)", "Presupuesto ($)", "Varianza ($)", "Varianza (%)", "Estado"]
    rows = []
    for item in variance_data.get("items", []):
        status_label = {
            "on_track": "En Meta",
            "favorable": "Favorable",
            "desfavorable": "Desfavorable",
        }.get(item.get("status", ""), item.get("status", ""))

        rows.append([
            item.get("metric", ""),
            f"{item.get('actual', 0):,.2f}",
            f"{item.get('budget', 0):,.2f}",
            f"{item.get('variance', 0):,.2f}",
            f"{item.get('variance_pct', 0):.2f}%",
            status_label,
        ])

    rows.append([])
    rows.append(["Score General", f"{variance_data.get('overall_score', 0):.1f}%", "", "", "", ""])

    return _csv_bytes(rows, headers)
