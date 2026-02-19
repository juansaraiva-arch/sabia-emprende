"""
Motor de generacion de PDFs — SABIA EMPRENDE
Genera reportes contables en PDF usando ReportLab:
- Libro Diario
- Libro Mayor
- Balance de Comprobacion
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
    elements.append(Paragraph("SABIA EMPRENDE", styles["BrandTitle"]))
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
        "SABIA EMPRENDE — Tu Aliado Estrategico | Generado automaticamente",
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

    elements.append(Paragraph("SABIA EMPRENDE", styles["BrandTitle"]))
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
        "SABIA EMPRENDE — Tu Aliado Estrategico | Generado automaticamente",
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

    elements.append(Paragraph("SABIA EMPRENDE", styles["BrandTitle"]))
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
        "SABIA EMPRENDE — Tu Aliado Estrategico | Generado automaticamente",
        ParagraphStyle(name="Footer", parent=styles["Normal"], fontSize=7, textColor=colors.gray),
    ))

    doc.build(elements)
    return buffer.getvalue()
