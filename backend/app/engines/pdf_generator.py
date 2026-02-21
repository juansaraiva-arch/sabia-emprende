"""
Motor de generacion de PDFs — Mi Director Financiero PTY
Genera reportes contables y ejecutivos en PDF usando ReportLab:
- Libro Diario
- Libro Mayor
- Balance de Comprobacion
- Estado de Resultados (Fase 11)
- Balance General (Fase 11)
- Flujo de Caja Proyectado (Fase 11)
- Resumen Ejecutivo (Fase 11)
"""
import io
from datetime import date
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, PageBreak,
)

MONTHS_ES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

BRAND_DARK = colors.HexColor("#1B2838")
BRAND_GOLD = colors.HexColor("#C9A84C")


def _get_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="BrandTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=BRAND_DARK,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="BrandSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.gray,
        spaceAfter=12,
    ))
    styles.add(ParagraphStyle(
        name="SectionHeader",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=BRAND_DARK,
        spaceBefore=16,
        spaceAfter=8,
    ))
    return styles


def _header_table_style():
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ])


def _fmt_money(value: float) -> str:
    if value == 0:
        return "-"
    return f"${value:,.2f}"


def generate_libro_diario_pdf(
    entries: list,
    society_name: str,
    period_year: int,
    period_month: int,
) -> bytes:
    """Genera PDF del Libro Diario para un periodo."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    styles = _get_styles()
    elements = []

    # Header
    elements.append(Paragraph("Mi Director Financiero PTY", styles["BrandTitle"]))
    elements.append(Paragraph(
        f"Libro Diario — {society_name}<br/>"
        f"Periodo: {MONTHS_ES[period_month]} {period_year}<br/>"
        f"Generado: {date.today().isoformat()}",
        styles["BrandSubtitle"],
    ))
    elements.append(Spacer(1, 12))

    if not entries:
        elements.append(Paragraph("No hay asientos en este periodo.", styles["Normal"]))
    else:
        for entry in entries:
            lines = entry.get("journal_lines", [])
            lines.sort(key=lambda x: x.get("line_order", 0))

            # Entry header
            elements.append(Paragraph(
                f"Asiento #{entry.get('entry_number', '?')} — "
                f"{entry.get('entry_date', '')} — "
                f"{entry.get('description', '')} "
                f"{'🔒' if entry.get('is_locked') else ''}",
                styles["SectionHeader"],
            ))
            if entry.get("reference"):
                elements.append(Paragraph(
                    f"Referencia: {entry['reference']} | Fuente: {entry.get('source', 'manual')}",
                    styles["Normal"],
                ))

            # Lines table
            data = [["Cuenta", "Descripcion", "Debe", "Haber"]]
            total_d, total_h = 0, 0
            for line in lines:
                d = line.get("debe", 0)
                h = line.get("haber", 0)
                total_d += d
                total_h += h
                data.append([
                    line.get("account_code", ""),
                    line.get("description", ""),
                    _fmt_money(d),
                    _fmt_money(h),
                ])
            data.append(["", "TOTAL", _fmt_money(total_d), _fmt_money(total_h)])

            t = Table(data, colWidths=[1.2 * inch, 4 * inch, 1.5 * inch, 1.5 * inch])
            style = _header_table_style()
            # Bold last row
            style.add("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")
            style.add("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F1F5F9"))
            # Right-align money columns
            style.add("ALIGN", (2, 0), (3, -1), "RIGHT")
            t.setStyle(style)
            elements.append(t)
            elements.append(Spacer(1, 12))

    # Footer
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(
        "Mi Director Financiero PTY — Tu Aliado Estratégico | Generado automaticamente",
        ParagraphStyle(name="Footer", parent=styles["Normal"], fontSize=7, textColor=colors.gray),
    ))

    doc.build(elements)
    return buffer.getvalue()


def generate_libro_mayor_pdf(
    ledger_data: dict,
    society_name: str,
    period_year: Optional[int] = None,
    period_month: Optional[int] = None,
) -> bytes:
    """Genera PDF del Libro Mayor de una cuenta."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    styles = _get_styles()
    elements = []

    period_text = ""
    if period_year and period_month:
        period_text = f"Periodo: {MONTHS_ES[period_month]} {period_year}"

    elements.append(Paragraph("Mi Director Financiero PTY", styles["BrandTitle"]))
    elements.append(Paragraph(
        f"Libro Mayor — {society_name}<br/>"
        f"Cuenta: {ledger_data.get('account_code', '')} - {ledger_data.get('account_name', '')}<br/>"
        f"{period_text}<br/>"
        f"Generado: {date.today().isoformat()}",
        styles["BrandSubtitle"],
    ))
    elements.append(Spacer(1, 12))

    # Summary
    elements.append(Paragraph(
        f"Total Debe: {_fmt_money(ledger_data.get('total_debe', 0))} | "
        f"Total Haber: {_fmt_money(ledger_data.get('total_haber', 0))} | "
        f"Saldo Final: {_fmt_money(ledger_data.get('final_balance', 0))}",
        styles["Normal"],
    ))
    elements.append(Spacer(1, 12))

    lines = ledger_data.get("lines", [])
    if not lines:
        elements.append(Paragraph("Sin movimientos en el periodo.", styles["Normal"]))
    else:
        data = [["Fecha", "No.", "Descripcion", "Debe", "Haber", "Saldo"]]
        for line in lines:
            data.append([
                line.get("entry_date", ""),
                f"#{line.get('entry_number', '')}",
                line.get("description", "") or line.get("reference", ""),
                _fmt_money(line.get("debe", 0)),
                _fmt_money(line.get("haber", 0)),
                _fmt_money(line.get("running_balance", 0)),
            ])

        t = Table(data, colWidths=[
            1 * inch, 0.6 * inch, 3.5 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch
        ])
        style = _header_table_style()
        style.add("ALIGN", (3, 0), (5, -1), "RIGHT")
        t.setStyle(style)
        elements.append(t)

    elements.append(Spacer(1, 20))
    elements.append(Paragraph(
        "Mi Director Financiero PTY — Tu Aliado Estratégico | Generado automaticamente",
        ParagraphStyle(name="Footer", parent=styles["Normal"], fontSize=7, textColor=colors.gray),
    ))

    doc.build(elements)
    return buffer.getvalue()


def generate_trial_balance_pdf(
    trial_data: dict,
    society_name: str,
    period_year: Optional[int] = None,
    period_month: Optional[int] = None,
) -> bytes:
    """Genera PDF del Balance de Comprobacion."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )
    styles = _get_styles()
    elements = []

    period_text = ""
    if period_year and period_month:
        period_text = f"Periodo: {MONTHS_ES[period_month]} {period_year}"

    elements.append(Paragraph("Mi Director Financiero PTY", styles["BrandTitle"]))
    elements.append(Paragraph(
        f"Balance de Comprobacion — {society_name}<br/>"
        f"{period_text}<br/>"
        f"Generado: {date.today().isoformat()}",
        styles["BrandSubtitle"],
    ))
    elements.append(Spacer(1, 12))

    accounts = trial_data.get("accounts", [])
    if not accounts:
        elements.append(Paragraph("Sin cuentas con movimiento.", styles["Normal"]))
    else:
        data = [["Codigo", "Cuenta", "Tipo", "Debe", "Haber", "Saldo Debe", "Saldo Haber"]]
        for acct in accounts:
            data.append([
                acct.get("account_code", ""),
                acct.get("account_name", ""),
                acct.get("account_type", ""),
                _fmt_money(acct.get("total_debe", 0)),
                _fmt_money(acct.get("total_haber", 0)),
                _fmt_money(acct.get("saldo_debe", 0)),
                _fmt_money(acct.get("saldo_haber", 0)),
            ])
        # Totals row
        data.append([
            "", "TOTALES", "",
            _fmt_money(trial_data.get("total_debe", 0)),
            _fmt_money(trial_data.get("total_haber", 0)),
            _fmt_money(trial_data.get("total_saldo_debe", 0)),
            _fmt_money(trial_data.get("total_saldo_haber", 0)),
        ])

        t = Table(data, colWidths=[
            0.7 * inch, 2.5 * inch, 1 * inch,
            1.1 * inch, 1.1 * inch, 1.1 * inch, 1.1 * inch,
        ])
        style = _header_table_style()
        style.add("ALIGN", (3, 0), (6, -1), "RIGHT")
        style.add("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")
        style.add("BACKGROUND", (0, -1), (-1, -1), BRAND_DARK)
        style.add("TEXTCOLOR", (0, -1), (-1, -1), colors.white)
        t.setStyle(style)
        elements.append(t)

    # Balance verification
    total_sd = trial_data.get("total_saldo_debe", 0)
    total_sh = trial_data.get("total_saldo_haber", 0)
    diff = abs(total_sd - total_sh)
    balanced = diff < 0.01

    elements.append(Spacer(1, 16))
    if balanced:
        elements.append(Paragraph(
            "BALANCE CUADRADO CORRECTAMENTE",
            ParagraphStyle(name="Balanced", parent=styles["Normal"], fontSize=12,
                           textColor=colors.HexColor("#059669"), fontName="Helvetica-Bold"),
        ))
    else:
        elements.append(Paragraph(
            f"BALANCE NO CUADRA — Diferencia: ${diff:,.2f}",
            ParagraphStyle(name="Unbalanced", parent=styles["Normal"], fontSize=12,
                           textColor=colors.red, fontName="Helvetica-Bold"),
        ))

    elements.append(Spacer(1, 20))
    elements.append(Paragraph(
        "Mi Director Financiero PTY — Tu Aliado Estratégico | Generado automaticamente",
        ParagraphStyle(name="Footer", parent=styles["Normal"], fontSize=7, textColor=colors.gray),
    ))

    doc.build(elements)
    return buffer.getvalue()


# ============================================
# REPORTES EJECUTIVOS (Fase 11)
# ============================================


def _fmt_pct(value: float) -> str:
    """Formatea un porcentaje."""
    return f"{value:.2f}%"


def _build_doc(buffer: io.BytesIO):
    """Crea SimpleDocTemplate estandar (landscape letter)."""
    return SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )


def _brand_header(elements: list, styles, title: str, subtitle: str):
    """Agrega header de marca estandar."""
    elements.append(Paragraph("Mi Director Financiero PTY", styles["BrandTitle"]))
    elements.append(Paragraph(subtitle, styles["BrandSubtitle"]))
    elements.append(Spacer(1, 12))


def _brand_footer(elements: list, styles):
    """Agrega footer de marca estandar."""
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(
        "Mi Director Financiero PTY — Tu Aliado Estratégico | Generado automaticamente",
        ParagraphStyle(name="FooterExec", parent=styles["Normal"], fontSize=7, textColor=colors.gray),
    ))


def generate_estado_resultados_pdf(
    cascada: dict,
    ratios: dict,
    society_name: str,
    period_year: int,
    period_month: int,
    prev_cascada: dict | None = None,
) -> bytes:
    """
    Genera Estado de Resultados (Income Statement) PDF.
    Si prev_cascada se provee, muestra columnas comparativas.
    """
    buffer = io.BytesIO()
    doc = _build_doc(buffer)
    styles = _get_styles()
    elements = []

    period_label = f"{MONTHS_ES[period_month]} {period_year}"
    _brand_header(elements, styles,
        "Estado de Resultados",
        f"Estado de Resultados — {society_name}<br/>"
        f"Periodo: {period_label}<br/>"
        f"Generado: {date.today().isoformat()}")

    revenue = cascada.get("revenue", 0)

    # Definir filas de la cascada
    pl_rows = [
        ("Ventas", "revenue", True),
        ("(-) Costo de Ventas", "cogs", False),
        ("= Utilidad Bruta", "gross_profit", True),
        ("(-) Gastos Operativos", "total_opex", False),
        ("= EBITDA", "ebitda", True),
        ("(-) Depr. + Int. + Imp.", None, False),
        ("= EBIT", "ebit", True),
        ("= Utilidad Neta", "net_income", True),
    ]

    dep_int_tax = abs(cascada.get("ebitda", 0) - cascada.get("net_income", 0))

    if prev_cascada:
        prev_dep_int_tax = abs(prev_cascada.get("ebitda", 0) - prev_cascada.get("net_income", 0))
        data = [["Concepto", "Actual ($)", "Anterior ($)", "Variacion ($)", "Var %"]]
        for label, key, is_total in pl_rows:
            if key:
                val_curr = cascada.get(key, 0)
                val_prev = prev_cascada.get(key, 0)
            else:
                val_curr = dep_int_tax
                val_prev = prev_dep_int_tax
            delta = val_curr - val_prev
            pct = round((delta / abs(val_prev) * 100) if abs(val_prev) > 0.01 else 0, 2)
            data.append([label, _fmt_money(val_curr), _fmt_money(val_prev), _fmt_money(delta), _fmt_pct(pct)])
        col_widths = [2.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch, 1 * inch]
    else:
        data = [["Concepto", "Monto ($)", "% Ventas"]]
        for label, key, is_total in pl_rows:
            val = cascada.get(key, 0) if key else dep_int_tax
            pct = _fmt_pct(val / revenue * 100) if revenue > 0 else "0.00%"
            data.append([label, _fmt_money(val), pct])
        col_widths = [3 * inch, 2 * inch, 1.5 * inch]

    t = Table(data, colWidths=col_widths)
    style = _header_table_style()
    style.add("ALIGN", (1, 0), (-1, -1), "RIGHT")
    for row_idx in [3, 5, 7, 8]:
        if row_idx < len(data):
            style.add("FONTNAME", (0, row_idx), (-1, row_idx), "Helvetica-Bold")
            style.add("BACKGROUND", (0, row_idx), (-1, row_idx), colors.HexColor("#F1F5F9"))
    t.setStyle(style)
    elements.append(t)

    elements.append(Spacer(1, 16))
    elements.append(Paragraph("Ratios Clave", styles["SectionHeader"]))

    margins = ratios.get("margins", {})
    efficiency = ratios.get("efficiency", {})
    solvency = ratios.get("solvency", {})
    oxygen = ratios.get("oxygen", {})

    ratio_data = [
        ["Ratio", "Valor", "Estado"],
        ["Margen Bruto", _fmt_pct(margins.get("gross_margin_pct", 0)), ""],
        ["Margen EBITDA", _fmt_pct(margins.get("ebitda_margin_pct", 0)), ""],
        ["Ratio Alquiler/Ventas", _fmt_pct(efficiency.get("rent_ratio_pct", 0)), efficiency.get("rent_status", "")],
        ["Ratio Nomina/UB", _fmt_pct(efficiency.get("payroll_ratio_pct", 0)), efficiency.get("payroll_status", "")],
        ["Prueba Acida", f"{solvency.get('acid_test', 0):.2f}", solvency.get("acid_status", "")],
        ["Cobertura de Deuda", f"{solvency.get('debt_coverage', 0):.2f}", solvency.get("debt_status", "")],
        ["CCC (dias)", f"{oxygen.get('ccc_days', 0):.1f}", ""],
    ]
    t2 = Table(ratio_data, colWidths=[3 * inch, 1.5 * inch, 1.2 * inch])
    style2 = _header_table_style()
    style2.add("ALIGN", (1, 0), (2, -1), "RIGHT")
    t2.setStyle(style2)
    elements.append(t2)

    _brand_footer(elements, styles)
    doc.build(elements)
    return buffer.getvalue()


def generate_balance_general_pdf(
    record: dict,
    society_name: str,
    period_year: int,
    period_month: int,
) -> bytes:
    """
    Genera Balance General (Balance Sheet) PDF.
    Enfoque residual: Patrimonio = Activos - Pasivos.
    """
    buffer = io.BytesIO()
    doc = _build_doc(buffer)
    styles = _get_styles()
    elements = []

    period_label = f"{MONTHS_ES[period_month]} {period_year}"
    _brand_header(elements, styles,
        "Balance General",
        f"Balance General — {society_name}<br/>"
        f"Periodo: {period_label}<br/>"
        f"Generado: {date.today().isoformat()}")

    cash = record.get("cash_balance", 0) or 0
    ar = record.get("accounts_receivable", 0) or 0
    inventory = record.get("inventory", 0) or 0
    total_assets = cash + ar + inventory

    ap = record.get("accounts_payable", 0) or 0
    bank_debt = record.get("bank_debt", 0) or 0
    total_liabilities = ap + bank_debt

    equity = total_assets - total_liabilities

    # ACTIVOS
    elements.append(Paragraph("ACTIVOS", styles["SectionHeader"]))
    assets_data = [
        ["Cuenta", "Monto ($)"],
        ["Efectivo y Equivalentes", _fmt_money(cash)],
        ["Cuentas por Cobrar", _fmt_money(ar)],
        ["Inventario", _fmt_money(inventory)],
        ["TOTAL ACTIVOS", _fmt_money(total_assets)],
    ]
    t_a = Table(assets_data, colWidths=[4 * inch, 2 * inch])
    style_a = _header_table_style()
    style_a.add("ALIGN", (1, 0), (1, -1), "RIGHT")
    style_a.add("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")
    style_a.add("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F1F5F9"))
    t_a.setStyle(style_a)
    elements.append(t_a)
    elements.append(Spacer(1, 12))

    # PASIVOS
    elements.append(Paragraph("PASIVOS", styles["SectionHeader"]))
    liab_data = [
        ["Cuenta", "Monto ($)"],
        ["Cuentas por Pagar", _fmt_money(ap)],
        ["Deuda Bancaria", _fmt_money(bank_debt)],
        ["TOTAL PASIVOS", _fmt_money(total_liabilities)],
    ]
    t_l = Table(liab_data, colWidths=[4 * inch, 2 * inch])
    style_l = _header_table_style()
    style_l.add("ALIGN", (1, 0), (1, -1), "RIGHT")
    style_l.add("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")
    style_l.add("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F1F5F9"))
    t_l.setStyle(style_l)
    elements.append(t_l)
    elements.append(Spacer(1, 12))

    # PATRIMONIO
    elements.append(Paragraph("PATRIMONIO", styles["SectionHeader"]))
    eq_data = [
        ["Concepto", "Monto ($)"],
        ["Patrimonio Neto (Activos - Pasivos)", _fmt_money(equity)],
    ]
    t_e = Table(eq_data, colWidths=[4 * inch, 2 * inch])
    style_e = _header_table_style()
    style_e.add("ALIGN", (1, 0), (1, -1), "RIGHT")
    style_e.add("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")
    if equity >= 0:
        style_e.add("TEXTCOLOR", (1, 1), (1, 1), colors.HexColor("#059669"))
    else:
        style_e.add("TEXTCOLOR", (1, 1), (1, 1), colors.red)
    t_e.setStyle(style_e)
    elements.append(t_e)

    elements.append(Spacer(1, 16))
    elements.append(Paragraph(
        "ECUACION CONTABLE VERIFICADA: Activos = Pasivos + Patrimonio",
        ParagraphStyle(name="BalCheck", parent=styles["Normal"], fontSize=11,
                       textColor=colors.HexColor("#059669"), fontName="Helvetica-Bold"),
    ))

    _brand_footer(elements, styles)
    doc.build(elements)
    return buffer.getvalue()


def generate_flujo_caja_pdf(
    forecast_data: dict,
    society_name: str,
) -> bytes:
    """
    Genera Flujo de Caja Proyectado PDF.
    forecast_data: output de proyectar_futuro()
    """
    buffer = io.BytesIO()
    doc = _build_doc(buffer)
    styles = _get_styles()
    elements = []

    method = forecast_data.get("method", "moving_average")
    method_label = "Promedio Movil" if method == "moving_average" else method

    _brand_header(elements, styles,
        "Flujo de Caja Proyectado",
        f"Flujo de Caja Proyectado — {society_name}<br/>"
        f"Metodo: {method_label}<br/>"
        f"Generado: {date.today().isoformat()}")

    historical = forecast_data.get("historical", [])
    projected = forecast_data.get("projected", [])

    if historical:
        elements.append(Paragraph("Datos Historicos", styles["SectionHeader"]))
        hist_data = [["Periodo", "Ventas", "EBITDA", "Ut. Neta"]]
        for pt in historical:
            hist_data.append([
                pt.get("label", ""),
                _fmt_money(pt.get("revenue", 0)),
                _fmt_money(pt.get("ebitda", 0)),
                _fmt_money(pt.get("net_income", 0)),
            ])
        t_h = Table(hist_data, colWidths=[2 * inch, 2 * inch, 2 * inch, 2 * inch])
        style_h = _header_table_style()
        style_h.add("ALIGN", (1, 0), (3, -1), "RIGHT")
        t_h.setStyle(style_h)
        elements.append(t_h)
        elements.append(Spacer(1, 16))

    if projected:
        elements.append(Paragraph("Proyeccion", styles["SectionHeader"]))
        proj_data = [["Periodo", "Ventas (est.)", "EBITDA (est.)", "Ut. Neta (est.)", "Conf. Baja", "Conf. Alta"]]
        for pt in projected:
            proj_data.append([
                pt.get("label", ""),
                _fmt_money(pt.get("revenue", 0)),
                _fmt_money(pt.get("ebitda", 0)),
                _fmt_money(pt.get("net_income", 0)),
                _fmt_money(pt.get("confidence_low", 0)),
                _fmt_money(pt.get("confidence_high", 0)),
            ])
        t_p = Table(proj_data, colWidths=[1.5 * inch, 1.5 * inch, 1.5 * inch, 1.5 * inch, 1.2 * inch, 1.2 * inch])
        style_p = _header_table_style()
        style_p.add("ALIGN", (1, 0), (5, -1), "RIGHT")
        t_p.setStyle(style_p)
        elements.append(t_p)
    elif not historical:
        elements.append(Paragraph("Se necesitan al menos 2 periodos para generar proyecciones.", styles["Normal"]))

    elements.append(Spacer(1, 16))
    elements.append(Paragraph(
        f"Periodos historicos: {len(historical)} | "
        f"Periodos proyectados: {len(projected)} | "
        f"Metodo: {method_label}",
        styles["Normal"],
    ))

    _brand_footer(elements, styles)
    doc.build(elements)
    return buffer.getvalue()


def generate_resumen_ejecutivo_pdf(
    cascada: dict,
    ratios: dict,
    diagnostico: dict,
    valoracion: dict,
    society_name: str,
    period_year: int,
    period_month: int,
) -> bytes:
    """
    Genera Resumen Ejecutivo PDF — reporte combinado multi-pagina.
    Pag 1: Diagnostico | Pag 2: Estado de Resultados | Pag 3: Ratios | Pag 4: Valoracion
    """
    buffer = io.BytesIO()
    doc = _build_doc(buffer)
    styles = _get_styles()
    elements = []

    period_label = f"{MONTHS_ES[period_month]} {period_year}"

    # === PAGINA 1: DIAGNOSTICO ===
    _brand_header(elements, styles,
        "Resumen Ejecutivo",
        f"Resumen Ejecutivo — {society_name}<br/>"
        f"Periodo: {period_label}<br/>"
        f"Generado: {date.today().isoformat()}")

    severity = diagnostico.get("severity", "ok")
    verdict_color = (
        colors.HexColor("#DC2626") if severity == "critical"
        else colors.HexColor("#D97706") if severity == "warning"
        else colors.HexColor("#059669")
    )
    elements.append(Paragraph(
        diagnostico.get("verdict", ""),
        ParagraphStyle(name="Verdict", parent=styles["Title"], fontSize=20,
                       textColor=verdict_color, spaceBefore=12, spaceAfter=4),
    ))
    elements.append(Paragraph(diagnostico.get("detail", ""), styles["Normal"]))
    elements.append(Spacer(1, 12))

    motor = diagnostico.get("motor", {})
    motor_status = motor.get("status", "stable")
    motor_color = (
        colors.HexColor("#DC2626") if motor_status == "weak"
        else colors.HexColor("#059669") if motor_status == "strong"
        else colors.HexColor("#D97706")
    )
    elements.append(Paragraph(
        f"Motor del Negocio: {motor.get('description', '')}",
        ParagraphStyle(name="Motor", parent=styles["Normal"], fontSize=11,
                       textColor=motor_color, fontName="Helvetica-Bold"),
    ))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph(f"Clasificacion: {diagnostico.get('legacy', '')}", styles["Normal"]))
    elements.append(Spacer(1, 12))

    actions = diagnostico.get("action_plan", [])
    if actions:
        elements.append(Paragraph("Plan de Accion:", styles["SectionHeader"]))
        for i, action in enumerate(actions, 1):
            elements.append(Paragraph(f"  {i}. {action}", styles["Normal"]))
    else:
        elements.append(Paragraph(
            "Sin acciones correctivas necesarias.",
            ParagraphStyle(name="NoActions", parent=styles["Normal"],
                           textColor=colors.HexColor("#059669")),
        ))

    # === PAGINA 2: ESTADO DE RESULTADOS ===
    elements.append(PageBreak())
    elements.append(Paragraph("Estado de Resultados", styles["SectionHeader"]))

    revenue = cascada.get("revenue", 0)
    pl_lines = [
        ("Ventas", cascada.get("revenue", 0)),
        ("(-) Costo de Ventas", cascada.get("cogs", 0)),
        ("= Utilidad Bruta", cascada.get("gross_profit", 0)),
        ("(-) Gastos Operativos", cascada.get("total_opex", 0)),
        ("= EBITDA", cascada.get("ebitda", 0)),
        ("= EBIT", cascada.get("ebit", 0)),
        ("= Utilidad Neta", cascada.get("net_income", 0)),
    ]
    pl_data = [["Concepto", "Monto ($)", "% Ventas"]]
    for label, val in pl_lines:
        pct = f"{(val / revenue * 100):.1f}%" if revenue > 0 else "0.0%"
        pl_data.append([label, _fmt_money(val), pct])
    t_pl = Table(pl_data, colWidths=[3.5 * inch, 2 * inch, 1.5 * inch])
    style_pl = _header_table_style()
    style_pl.add("ALIGN", (1, 0), (2, -1), "RIGHT")
    for idx in [3, 5, 6, 7]:
        if idx < len(pl_data):
            style_pl.add("FONTNAME", (0, idx), (-1, idx), "Helvetica-Bold")
            style_pl.add("BACKGROUND", (0, idx), (-1, idx), colors.HexColor("#F1F5F9"))
    t_pl.setStyle(style_pl)
    elements.append(t_pl)

    # === PAGINA 3: RATIOS ===
    elements.append(PageBreak())
    elements.append(Paragraph("Ratios Operativos y Financieros", styles["SectionHeader"]))

    margins = ratios.get("margins", {})
    efficiency = ratios.get("efficiency", {})
    solvency = ratios.get("solvency", {})
    oxygen = ratios.get("oxygen", {})
    fiscal = ratios.get("fiscal", {})

    ratios_data = [
        ["Categoria", "Ratio", "Valor", "Estado"],
        ["Margenes", "Margen Bruto", _fmt_pct(margins.get("gross_margin_pct", 0)), ""],
        ["Margenes", "Margen EBITDA", _fmt_pct(margins.get("ebitda_margin_pct", 0)), ""],
        ["Eficiencia", "Alquiler/Ventas", _fmt_pct(efficiency.get("rent_ratio_pct", 0)), efficiency.get("rent_status", "")],
        ["Eficiencia", "Nomina/UB", _fmt_pct(efficiency.get("payroll_ratio_pct", 0)), efficiency.get("payroll_status", "")],
        ["Solvencia", "Prueba Acida", f"{solvency.get('acid_test', 0):.2f}", solvency.get("acid_status", "")],
        ["Solvencia", "Cobertura Deuda", f"{solvency.get('debt_coverage', 0):.2f}", solvency.get("debt_status", "")],
        ["Oxigeno", "Dias Cobrar", f"{oxygen.get('days_receivable', 0):.1f}", ""],
        ["Oxigeno", "Dias Inventario", f"{oxygen.get('days_inventory', 0):.1f}", ""],
        ["Oxigeno", "Dias Pagar", f"{oxygen.get('days_payable', 0):.1f}", ""],
        ["Oxigeno", "CCC", f"{oxygen.get('ccc_days', 0):.1f} dias", ""],
        ["Fiscal", "Ventas Anualizadas", _fmt_money(fiscal.get("annual_revenue_projected", 0)), ""],
        ["Fiscal", "ITBMS", fiscal.get("itbms_status", ""), ""],
    ]
    t_r = Table(ratios_data, colWidths=[1.5 * inch, 2 * inch, 1.5 * inch, 1.5 * inch])
    style_r = _header_table_style()
    style_r.add("ALIGN", (2, 0), (3, -1), "RIGHT")
    t_r.setStyle(style_r)
    elements.append(t_r)

    # === PAGINA 4: VALORACION ===
    elements.append(PageBreak())
    elements.append(Paragraph("Valoracion del Negocio", styles["SectionHeader"]))

    val_data = [
        ["Concepto", "Valor"],
        ["EBITDA Mensual", _fmt_money(valoracion.get("ebitda_monthly", 0))],
        ["EBITDA Anualizado", _fmt_money(valoracion.get("ebitda_annual", 0))],
        ["Multiplo Aplicado", f"{valoracion.get('multiple', 3.0):.1f}x"],
        ["Valor Estimado del Negocio", _fmt_money(valoracion.get("enterprise_value", 0))],
    ]
    t_v = Table(val_data, colWidths=[4 * inch, 3 * inch])
    style_v = _header_table_style()
    style_v.add("ALIGN", (1, 0), (1, -1), "RIGHT")
    style_v.add("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")
    style_v.add("BACKGROUND", (0, -1), (-1, -1), BRAND_DARK)
    style_v.add("TEXTCOLOR", (0, -1), (-1, -1), colors.white)
    style_v.add("FONTSIZE", (0, -1), (-1, -1), 10)
    t_v.setStyle(style_v)
    elements.append(t_v)

    elements.append(Spacer(1, 16))
    ev = valoracion.get("enterprise_value", 0)
    ev_color = colors.HexColor("#059669") if ev > 0 else colors.red
    elements.append(Paragraph(
        f"Valor estimado: {_fmt_money(ev)}",
        ParagraphStyle(name="EV", parent=styles["Normal"], fontSize=14,
                       textColor=ev_color, fontName="Helvetica-Bold"),
    ))

    _brand_footer(elements, styles)
    doc.build(elements)
    return buffer.getvalue()
