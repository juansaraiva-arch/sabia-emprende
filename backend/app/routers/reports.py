"""
Router: Generacion de Reportes PDF y CSV
Libro Diario, Libro Mayor, Balance de Comprobacion.
Estado de Resultados, Balance General, Flujo de Caja, Resumen Ejecutivo (Fase 11).
Exportacion CSV (Fase 11).
"""
import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response

from app.database import get_supabase
from app.auth import AuthenticatedUser, get_current_user
from app.engines.pdf_generator import (
    generate_libro_diario_pdf,
    generate_libro_mayor_pdf,
    generate_trial_balance_pdf,
    generate_estado_resultados_pdf,
    generate_balance_general_pdf,
    generate_flujo_caja_pdf,
    generate_resumen_ejecutivo_pdf,
)
from app.engines.accounting_engine import (
    compute_ledger,
    compute_trial_balance,
)
from app.engines.financial_engine import (
    calcular_cascada,
    calcular_ratios,
    diagnostico_juez_digital,
    valoracion_empresa,
)
from app.engines.multiperiod_engine import (
    calcular_tendencias,
    comparar_periodos,
    proyectar_futuro,
    calcular_varianza_presupuesto,
)
from app.engines.csv_exporter import (
    export_cascada_csv,
    export_trends_csv,
    export_comparison_csv,
    export_budget_variance_csv,
)

router = APIRouter()


@router.get("/libro-diario/{society_id}")
async def generate_libro_diario(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(...),
    period_month: int = Query(...),
):
    """Genera PDF del Libro Diario de un periodo."""
    db = get_supabase()

    # Get society name
    society = (
        db.table("societies")
        .select("business_name")
        .eq("id", society_id)
        .limit(1)
        .execute()
    )
    society_name = society.data[0]["business_name"] if society.data else "Sociedad"

    # Get journal entries with lines
    entries_result = (
        db.table("journal_entries")
        .select("*, journal_lines(*)")
        .eq("society_id", society_id)
        .eq("period_year", period_year)
        .eq("period_month", period_month)
        .order("entry_number")
        .execute()
    )

    pdf_bytes = generate_libro_diario_pdf(
        entries_result.data,
        society_name,
        period_year,
        period_month,
    )

    # Save report record
    _save_report_record(
        db, society_id, "libro_diario", period_year, period_month, user.id
    )

    filename = f"LibroDiario_{society_name}_{period_year}_{period_month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/libro-mayor/{society_id}/{account_code}")
async def generate_libro_mayor(
    society_id: str,
    account_code: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(None),
    period_month: int = Query(None),
):
    """Genera PDF del Libro Mayor de una cuenta."""
    db = get_supabase()

    society = (
        db.table("societies")
        .select("business_name")
        .eq("id", society_id)
        .limit(1)
        .execute()
    )
    society_name = society.data[0]["business_name"] if society.data else "Sociedad"

    # Get account info
    acct = (
        db.table("chart_of_accounts")
        .select("*")
        .eq("society_id", society_id)
        .eq("account_code", account_code)
        .single()
        .execute()
    )
    if not acct.data:
        raise HTTPException(status_code=404, detail=f"Cuenta {account_code} no encontrada")

    # Get journal lines for this account
    query = (
        db.table("journal_lines")
        .select("*, journal_entries!inner(entry_date, description, reference, entry_number, society_id, period_year, period_month)")
        .eq("account_code", account_code)
        .eq("journal_entries.society_id", society_id)
    )
    if period_year:
        query = query.eq("journal_entries.period_year", period_year)
    if period_month:
        query = query.eq("journal_entries.period_month", period_month)

    lines_result = query.execute()

    # Flatten
    flat_lines = []
    for line in lines_result.data:
        je = line.get("journal_entries", {})
        flat_lines.append({
            "entry_date": je.get("entry_date", ""),
            "description": line.get("description", "") or je.get("description", ""),
            "reference": je.get("reference", ""),
            "entry_number": je.get("entry_number", 0),
            "debe": line.get("debe", 0),
            "haber": line.get("haber", 0),
        })
    flat_lines.sort(key=lambda x: (x["entry_date"], x["entry_number"]))

    ledger = compute_ledger(flat_lines, account_code, acct.data.get("normal_balance", "debe"))
    ledger["account_name"] = acct.data.get("account_name", "")
    ledger["account_type"] = acct.data.get("account_type", "")
    ledger["account_code"] = account_code

    pdf_bytes = generate_libro_mayor_pdf(
        ledger, society_name, period_year, period_month
    )

    _save_report_record(
        db, society_id, "libro_mayor", period_year, period_month, user.id
    )

    filename = f"LibroMayor_{account_code}_{society_name}_{period_year or 'all'}_{period_month or 'all'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/balance-comprobacion/{society_id}")
async def generate_balance_comprobacion(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(None),
    period_month: int = Query(None),
):
    """Genera PDF del Balance de Comprobacion."""
    db = get_supabase()

    society = (
        db.table("societies")
        .select("business_name")
        .eq("id", society_id)
        .limit(1)
        .execute()
    )
    society_name = society.data[0]["business_name"] if society.data else "Sociedad"

    # Get all accounts
    accounts = (
        db.table("chart_of_accounts")
        .select("*")
        .eq("society_id", society_id)
        .eq("is_active", True)
        .order("account_code")
        .execute()
    )

    # Get all journal lines
    query = (
        db.table("journal_lines")
        .select("account_code, debe, haber, journal_entries!inner(society_id, period_year, period_month)")
        .eq("journal_entries.society_id", society_id)
    )
    if period_year:
        query = query.eq("journal_entries.period_year", period_year)
    if period_month:
        query = query.eq("journal_entries.period_month", period_month)

    lines_result = query.execute()

    lines_by_account: dict[str, list] = {}
    for line in lines_result.data:
        code = line.get("account_code", "")
        if code not in lines_by_account:
            lines_by_account[code] = []
        lines_by_account[code].append(line)

    trial = compute_trial_balance(accounts.data, lines_by_account)

    pdf_bytes = generate_trial_balance_pdf(
        trial, society_name, period_year, period_month
    )

    _save_report_record(
        db, society_id, "balance_comprobacion", period_year, period_month, user.id
    )

    filename = f"BalanceComprobacion_{society_name}_{period_year or 'all'}_{period_month or 'all'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/history/{society_id}")
async def list_generated_reports(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    limit: int = Query(20, le=100),
):
    """Lista reportes generados previamente."""
    db = get_supabase()
    result = (
        db.table("generated_reports")
        .select("*")
        .eq("society_id", society_id)
        .order("generated_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"data": result.data}


# ============================================
# REPORTES EJECUTIVOS (Fase 11)
# ============================================


def _get_society_name(db, society_id: str) -> str:
    """Obtiene el nombre de la sociedad."""
    result = db.table("societies").select("business_name").eq("id", society_id).limit(1).execute()
    return result.data[0]["business_name"] if result.data else "Sociedad"


def _get_financial_record(db, society_id: str, period_year: int, period_month: int) -> dict:
    """Obtiene un registro financiero o lanza 404."""
    result = (
        db.table("financial_records").select("*")
        .eq("society_id", society_id)
        .eq("period_year", period_year)
        .eq("period_month", period_month)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No hay datos financieros para ese periodo")
    return result.data[0]


@router.get("/estado-resultados/{society_id}")
async def generate_estado_resultados(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(...),
    period_month: int = Query(...),
):
    """Genera PDF del Estado de Resultados con comparativo vs periodo anterior."""
    db = get_supabase()
    society_name = _get_society_name(db, society_id)
    record = _get_financial_record(db, society_id, period_year, period_month)

    cascada = calcular_cascada(record)
    ratios = calcular_ratios(record)

    # Auto-resolver periodo anterior para comparativo
    prev_month = period_month - 1
    prev_year = period_year
    if prev_month < 1:
        prev_month = 12
        prev_year -= 1

    prev_result = (
        db.table("financial_records").select("*")
        .eq("society_id", society_id)
        .eq("period_year", prev_year)
        .eq("period_month", prev_month)
        .limit(1)
        .execute()
    )
    prev_cascada = calcular_cascada(prev_result.data[0]) if prev_result.data else None

    pdf_bytes = generate_estado_resultados_pdf(
        cascada, ratios, society_name, period_year, period_month, prev_cascada
    )
    _save_report_record(db, society_id, "estado_resultados", period_year, period_month, user.id)

    filename = f"EstadoResultados_{society_name}_{period_year}_{period_month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/balance-general/{society_id}")
async def generate_balance_general(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(...),
    period_month: int = Query(...),
):
    """Genera PDF del Balance General."""
    db = get_supabase()
    society_name = _get_society_name(db, society_id)
    record = _get_financial_record(db, society_id, period_year, period_month)

    pdf_bytes = generate_balance_general_pdf(record, society_name, period_year, period_month)
    _save_report_record(db, society_id, "balance_general", period_year, period_month, user.id)

    filename = f"BalanceGeneral_{society_name}_{period_year}_{period_month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/flujo-caja/{society_id}")
async def generate_flujo_caja(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    months_ahead: int = Query(6, ge=1, le=12),
):
    """Genera PDF del Flujo de Caja Proyectado."""
    db = get_supabase()
    society_name = _get_society_name(db, society_id)

    records = (
        db.table("financial_records").select("*")
        .eq("society_id", society_id)
        .order("period_year")
        .order("period_month")
        .execute()
    )
    if not records.data:
        raise HTTPException(status_code=404, detail="No hay registros financieros")

    forecast_data = proyectar_futuro(records.data, months_ahead)
    pdf_bytes = generate_flujo_caja_pdf(forecast_data, society_name)

    last = records.data[-1]
    _save_report_record(
        db, society_id, "flujo_caja",
        last.get("period_year"), last.get("period_month"), user.id
    )

    filename = f"FlujoCaja_{society_name}_{months_ahead}m.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/resumen-ejecutivo/{society_id}")
async def generate_resumen_ejecutivo(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(...),
    period_month: int = Query(...),
):
    """Genera PDF del Resumen Ejecutivo combinado."""
    db = get_supabase()
    society_name = _get_society_name(db, society_id)
    record = _get_financial_record(db, society_id, period_year, period_month)

    cascada = calcular_cascada(record)
    ratios = calcular_ratios(record)
    diagnostico = diagnostico_juez_digital(record)
    valoracion = valoracion_empresa(cascada["ebitda"])

    pdf_bytes = generate_resumen_ejecutivo_pdf(
        cascada, ratios, diagnostico, valoracion,
        society_name, period_year, period_month,
    )
    _save_report_record(db, society_id, "resumen_ejecutivo", period_year, period_month, user.id)

    filename = f"ResumenEjecutivo_{society_name}_{period_year}_{period_month:02d}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export-csv/{society_id}/{report_type}")
async def export_csv(
    society_id: str,
    report_type: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(None),
    period_month: int = Query(None),
    year1: int = Query(None),
    month1: int = Query(None),
    year2: int = Query(None),
    month2: int = Query(None),
    from_year: int = Query(None),
    from_month: int = Query(None),
    to_year: int = Query(None),
    to_month: int = Query(None),
):
    """Exporta datos financieros como CSV."""
    db = get_supabase()

    valid_types = {"cascada", "trends", "comparison", "budget_variance"}
    if report_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Tipo invalido. Validos: {valid_types}")

    if report_type == "cascada":
        if not period_year or not period_month:
            raise HTTPException(status_code=400, detail="period_year y period_month requeridos")
        record = _get_financial_record(db, society_id, period_year, period_month)
        cascada = calcular_cascada(record)
        ratios = calcular_ratios(record)
        csv_bytes = export_cascada_csv(cascada, ratios)
        filename = f"cascada_{period_year}_{period_month:02d}.csv"

    elif report_type == "trends":
        fy = from_year or period_year or 2026
        fm = from_month or 1
        ty = to_year or period_year or 2026
        tm = to_month or 12
        records = (
            db.table("financial_records").select("*")
            .eq("society_id", society_id)
            .order("period_year")
            .order("period_month")
            .execute()
        )
        filtered = [
            r for r in (records.data or [])
            if (r["period_year"] > fy or (r["period_year"] == fy and r["period_month"] >= fm))
            and (r["period_year"] < ty or (r["period_year"] == ty and r["period_month"] <= tm))
        ]
        trends = calcular_tendencias(filtered)
        csv_bytes = export_trends_csv(trends)
        filename = f"tendencias_{fy}_{fm:02d}_a_{ty}_{tm:02d}.csv"

    elif report_type == "comparison":
        if not all([year1, month1, year2, month2]):
            raise HTTPException(status_code=400, detail="year1, month1, year2, month2 requeridos")
        rec_a = _get_financial_record(db, society_id, year1, month1)
        rec_b = _get_financial_record(db, society_id, year2, month2)
        comparison = comparar_periodos(rec_a, rec_b)
        csv_bytes = export_comparison_csv(comparison)
        filename = f"comparativo_{year1}_{month1:02d}_vs_{year2}_{month2:02d}.csv"

    else:  # budget_variance
        if not period_year or not period_month:
            raise HTTPException(status_code=400, detail="period_year y period_month requeridos")
        record = _get_financial_record(db, society_id, period_year, period_month)
        budget_result = (
            db.table("budget_targets").select("*")
            .eq("society_id", society_id)
            .eq("period_year", period_year)
            .eq("period_month", period_month)
            .limit(1)
            .execute()
        )
        if not budget_result.data:
            raise HTTPException(status_code=404, detail="Presupuesto no encontrado para ese periodo")
        variance = calcular_varianza_presupuesto(record, budget_result.data[0])
        csv_bytes = export_budget_variance_csv(variance)
        filename = f"presupuesto_vs_real_{period_year}_{period_month:02d}.csv"

    _save_report_record(db, society_id, "csv_export", period_year, period_month, user.id)

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/email/{society_id}")
async def email_report(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    report_type: str = Query(..., description="estado_resultados, balance_general, resumen_ejecutivo"),
    period_year: int = Query(2026),
    period_month: int = Query(1, ge=1, le=12),
    recipients: str = Query(..., description="Emails separados por coma"),
):
    """Envia un reporte PDF por email a los destinatarios."""
    from app.engines.email_sender import is_email_configured, send_report_email

    if not is_email_configured():
        raise HTTPException(
            status_code=503,
            detail="Email no configurado. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD en .env",
        )

    db = get_supabase()
    to_emails = [e.strip() for e in recipients.split(",") if e.strip()]
    if not to_emails:
        raise HTTPException(status_code=400, detail="Debe proporcionar al menos un email destinatario")

    # Generar PDF segun tipo de reporte
    valid_types = {"estado_resultados", "balance_general", "resumen_ejecutivo"}
    if report_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Tipo invalido. Validos: {valid_types}")

    record = _get_financial_record(db, society_id, period_year, period_month)
    society = db.table("societies").select("legal_name").eq("id", society_id).single().execute()
    society_name = society.data.get("legal_name", "Empresa") if society.data else "Empresa"

    MONTHS_ES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                 "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    period_label = f"{MONTHS_ES[period_month]} {period_year}"

    if report_type == "estado_resultados":
        cascada = calcular_cascada(record)
        ratios = calcular_ratios(record)
        pdf_bytes = generate_estado_resultados_pdf(cascada, ratios, society_name, period_year, period_month)
        filename = f"Estado_Resultados_{period_label}.pdf"
    elif report_type == "balance_general":
        pdf_bytes = generate_balance_general_pdf(record, society_name, period_year, period_month)
        filename = f"Balance_General_{period_label}.pdf"
    else:  # resumen_ejecutivo
        cascada = calcular_cascada(record)
        ratios = calcular_ratios(record)
        diagnostico = diagnostico_juez_digital(record)
        valoracion = valoracion_empresa(cascada["ebitda"])
        pdf_bytes = generate_resumen_ejecutivo_pdf(
            cascada, ratios, diagnostico, valoracion, society_name, period_year, period_month
        )
        filename = f"Resumen_Ejecutivo_{period_label}.pdf"

    # Enviar email
    body_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #1B2838;">SABIA EMPRENDE</h2>
        <p>Adjunto encontrara el reporte <strong>{report_type.replace('_', ' ').title()}</strong>
        de <strong>{society_name}</strong> correspondiente a <strong>{period_label}</strong>.</p>
        <p style="color: #666; font-size: 12px;">Este reporte fue generado automaticamente por SABIA EMPRENDE.</p>
    </div>
    """

    result = send_report_email(
        to_emails=to_emails,
        subject=f"Reporte {report_type.replace('_', ' ').title()} - {society_name} - {period_label}",
        body_html=body_html,
        attachment_bytes=pdf_bytes,
        attachment_filename=filename,
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])

    return result


def _save_report_record(db, society_id: str, report_type: str, period_year, period_month, user_id: str):
    """Guarda registro de reporte generado."""
    try:
        db.table("generated_reports").insert({
            "society_id": society_id,
            "report_type": report_type,
            "period_year": period_year,
            "period_month": period_month,
            "storage_path": f"generated/{report_type}_{society_id}_{period_year}_{period_month}.pdf",
            "generated_by": user_id,
        }).execute()
    except Exception:
        pass  # Non-critical, don't fail the report generation
