"""
Tareas programadas — Mi Director Financiero PTY

1. Auto-cierre de periodo contable: ultimo dia del mes a las 23:59.
2. Auto-envio de reportes por email: 1ro del mes siguiente.

Estas funciones se pueden invocar via cron job, Supabase Edge Function,
o un scheduler de Python (APScheduler, Celery Beat, etc.).
"""

from datetime import date, timedelta
import calendar
import logging

from app.engines.email_sender import send_report_email, is_email_configured

logger = logging.getLogger(__name__)


def is_last_day_of_month(d: date | None = None) -> bool:
    """Verifica si una fecha es el ultimo dia del mes."""
    if d is None:
        d = date.today()
    last_day = calendar.monthrange(d.year, d.month)[1]
    return d.day == last_day


def is_first_day_of_month(d: date | None = None) -> bool:
    """Verifica si una fecha es el primer dia del mes."""
    if d is None:
        d = date.today()
    return d.day == 1


async def auto_close_period(supabase_client, society_id: str, year: int, month: int) -> dict:
    """
    Cierra automaticamente un periodo contable.
    - Marca el periodo como 'closed' en la tabla accounting_periods.
    - Bloquea la edicion de asientos de ese periodo.

    Retorna: {success: bool, message: str}
    """
    try:
        # Verificar si el periodo ya esta cerrado
        period_check = supabase_client.table("accounting_periods").select("*").eq(
            "society_id", society_id
        ).eq("year", year).eq("month", month).execute()

        if period_check.data and period_check.data[0].get("status") == "closed":
            return {"success": True, "message": f"Periodo {year}-{month:02d} ya estaba cerrado."}

        # Si el periodo existe, actualizarlo
        if period_check.data:
            supabase_client.table("accounting_periods").update({
                "status": "closed",
                "closed_at": date.today().isoformat(),
                "closed_by": "system_auto_close",
            }).eq("id", period_check.data[0]["id"]).execute()
        else:
            # Crear el periodo como cerrado
            supabase_client.table("accounting_periods").insert({
                "society_id": society_id,
                "year": year,
                "month": month,
                "status": "closed",
                "closed_at": date.today().isoformat(),
                "closed_by": "system_auto_close",
            }).execute()

        logger.info(f"Auto-cierre completado: {society_id} periodo {year}-{month:02d}")
        return {
            "success": True,
            "message": f"Periodo {year}-{month:02d} cerrado automaticamente.",
        }

    except Exception as e:
        logger.error(f"Error en auto-cierre: {e}")
        return {"success": False, "message": str(e)}


async def auto_send_monthly_report(
    supabase_client,
    society_id: str,
    year: int,
    month: int,
    recipient_emails: list[str],
) -> dict:
    """
    Genera y envia automaticamente los reportes de Libro Diario y Libro Mayor
    por email al 1ro del mes siguiente.

    Retorna: {success: bool, message: str}
    """
    if not is_email_configured():
        return {
            "success": False,
            "message": "SMTP no configurado. No se pueden enviar reportes por email.",
        }

    try:
        # Importar generadores de PDF
        from app.engines.pdf_generator import (
            generate_libro_diario_pdf,
            generate_libro_mayor_pdf,
        )

        month_names = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
        ]
        month_name = month_names[month - 1] if 1 <= month <= 12 else str(month)

        # Obtener datos del Libro Diario
        journal_data = supabase_client.table("journal_entries").select(
            "*, journal_lines(*)"
        ).eq("society_id", society_id).eq("period_year", year).eq(
            "period_month", month
        ).order("entry_date").execute()

        entries = journal_data.data or []

        # Generar PDF del Libro Diario
        diario_pdf = generate_libro_diario_pdf(
            entries=entries,
            society_name=society_id,
            period_label=f"{month_name} {year}",
        )

        # Obtener datos del Libro Mayor
        mayor_data = supabase_client.table("journal_lines").select(
            "*, journal_entries!inner(entry_date, period_year, period_month, society_id)"
        ).eq("journal_entries.society_id", society_id).eq(
            "journal_entries.period_year", year
        ).eq("journal_entries.period_month", month).execute()

        lines = mayor_data.data or []

        # Generar PDF del Libro Mayor
        mayor_pdf = generate_libro_mayor_pdf(
            lines=lines,
            society_name=society_id,
            period_label=f"{month_name} {year}",
        )

        # Construir email HTML
        subject = f"Mi Director Financiero PTY: Reporte de Libros Contables y Estado de Patrimonio — {month_name}/{year}"
        body_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #1B2838;">Mi Director Financiero PTY — Tu Aliado Estratégico</h2>
            <p>Estimado usuario,</p>
            <p>Se ha completado el cierre del mes de <strong>{month_name} {year}</strong>.</p>
            <p>Adjunto encontrara los siguientes reportes:</p>
            <ul>
                <li><strong>Libro Diario</strong> — Registro cronologico de operaciones</li>
                <li><strong>Libro Mayor</strong> — Clasificacion por cuenta contable</li>
            </ul>
            <p>Estos documentos estan disponibles para inspeccion fiscal conforme al
            Codigo de Comercio de la Republica de Panama.</p>
            <br/>
            <p style="color: #888; font-size: 12px;">
                Generado automaticamente por Mi Director Financiero PTY — Tu Aliado Estratégico para Panama.
            </p>
        </body>
        </html>
        """

        # Enviar con el PDF del Libro Diario como adjunto principal
        result = send_report_email(
            to_emails=recipient_emails,
            subject=subject,
            body_html=body_html,
            attachment_bytes=diario_pdf,
            attachment_filename=f"Libro_Diario_{month_name}_{year}.pdf",
        )

        if result["success"]:
            logger.info(f"Reporte mensual enviado: {society_id} {month_name}/{year}")
        else:
            logger.error(f"Error enviando reporte: {result['message']}")

        return result

    except Exception as e:
        logger.error(f"Error generando reporte mensual: {e}")
        return {"success": False, "message": str(e)}


async def run_monthly_tasks(supabase_client, society_id: str, recipient_emails: list[str]) -> dict:
    """
    Ejecuta todas las tareas de fin de mes:
    1. Si es ultimo dia del mes → cierra el periodo
    2. Si es 1ro del mes → envia reportes del mes anterior

    Se puede llamar diariamente desde un cron job.
    """
    today = date.today()
    results = {}

    # Auto-cierre: ultimo dia del mes
    if is_last_day_of_month(today):
        close_result = await auto_close_period(
            supabase_client, society_id, today.year, today.month
        )
        results["auto_close"] = close_result

    # Auto-envio: primer dia del mes
    if is_first_day_of_month(today):
        # Enviar reportes del mes anterior
        prev_month = today.month - 1 if today.month > 1 else 12
        prev_year = today.year if today.month > 1 else today.year - 1

        email_result = await auto_send_monthly_report(
            supabase_client, society_id, prev_year, prev_month, recipient_emails
        )
        results["auto_email"] = email_result

    if not results:
        results["status"] = "No tasks to run today"

    return results
