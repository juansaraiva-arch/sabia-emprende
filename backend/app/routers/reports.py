"""
Router: Generacion de Reportes PDF
Libro Diario, Libro Mayor, Balance de Comprobacion.
"""
import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Query
from fastapi.responses import Response

from app.database import get_supabase
from app.engines.pdf_generator import (
    generate_libro_diario_pdf,
    generate_libro_mayor_pdf,
    generate_trial_balance_pdf,
)
from app.engines.accounting_engine import (
    compute_ledger,
    compute_trial_balance,
)

router = APIRouter()


@router.get("/libro-diario/{society_id}")
async def generate_libro_diario(
    society_id: str,
    x_user_id: str = Header(...),
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
        db, society_id, "libro_diario", period_year, period_month, x_user_id
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
    x_user_id: str = Header(...),
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
        db, society_id, "libro_mayor", period_year, period_month, x_user_id
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
    x_user_id: str = Header(...),
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
        db, society_id, "balance_comprobacion", period_year, period_month, x_user_id
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
    x_user_id: str = Header(...),
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
