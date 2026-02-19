"""
Router: Sistema Contable Completo
Plan de Cuentas + Libro Diario + Libro Mayor + Balance de Comprobacion + Cierre de Periodo.
Puente: asientos → financial_records para alimentar dashboards existentes.
"""
from fastapi import APIRouter, HTTPException, Header, Depends, Query
from app.database import get_supabase
from app.auth import AuthenticatedUser, get_current_user
from app.models import AccountCreate, JournalEntryCreate, PeriodCloseRequest
from app.engines.accounting_engine import (
    get_default_chart_of_accounts,
    validate_journal_entry,
    compute_ledger,
    compute_trial_balance,
    aggregate_to_financial_record,
)

router = APIRouter()


# ============================================
# PLAN DE CUENTAS
# ============================================

@router.post("/chart/initialize/{society_id}")
async def initialize_chart_of_accounts(society_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Inicializa el plan de cuentas default para una sociedad."""
    db = get_supabase()

    # Check if already initialized
    existing = (
        db.table("chart_of_accounts")
        .select("id")
        .eq("society_id", society_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=400,
            detail="El plan de cuentas ya fue inicializado para esta sociedad."
        )

    accounts = get_default_chart_of_accounts(society_id)
    result = db.table("chart_of_accounts").insert(accounts).execute()
    return {"success": True, "accounts_created": len(result.data)}


@router.get("/chart/{society_id}")
async def list_chart_of_accounts(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    active_only: bool = Query(True),
):
    """Listar plan de cuentas de una sociedad."""
    db = get_supabase()
    query = (
        db.table("chart_of_accounts")
        .select("*")
        .eq("society_id", society_id)
        .order("account_code")
    )
    if active_only:
        query = query.eq("is_active", True)

    result = query.execute()
    return {"data": result.data}


@router.post("/chart")
async def create_account(body: AccountCreate, user: AuthenticatedUser = Depends(get_current_user)):
    """Crear una nueva cuenta en el plan."""
    db = get_supabase()
    data = body.model_dump()
    result = db.table("chart_of_accounts").insert(data).execute()
    return {"success": True, "data": result.data}


@router.patch("/chart/{society_id}/{account_code}")
async def update_account(
    society_id: str, account_code: str, body: dict, user: AuthenticatedUser = Depends(get_current_user)
):
    """Actualizar una cuenta del plan."""
    db = get_supabase()
    result = (
        db.table("chart_of_accounts")
        .update(body)
        .eq("society_id", society_id)
        .eq("account_code", account_code)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return {"success": True, "data": result.data}


# ============================================
# LIBRO DIARIO (Asientos)
# ============================================

@router.post("/journal")
async def create_journal_entry(body: JournalEntryCreate, user: AuthenticatedUser = Depends(get_current_user)):
    """
    Crear un asiento contable de doble partida.
    Valida que DEBE == HABER antes de guardar.
    """
    db = get_supabase()

    # 1. Check period is open
    period_year = body.entry_date.year
    period_month = body.entry_date.month

    period = (
        db.table("accounting_periods")
        .select("status")
        .eq("society_id", body.society_id)
        .eq("period_year", period_year)
        .eq("period_month", period_month)
        .limit(1)
        .execute()
    )
    if period.data and period.data[0].get("status") == "closed":
        raise HTTPException(
            status_code=400,
            detail=f"El periodo {period_month}/{period_year} esta cerrado. No se pueden agregar asientos."
        )

    # 2. Validate double-entry
    lines_data = [l.model_dump() for l in body.lines]
    validation = validate_journal_entry(lines_data)
    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail={"message": "Asiento no cuadra", "errors": validation["errors"]}
        )

    # 3. Resolve account_id for each line
    accounts = (
        db.table("chart_of_accounts")
        .select("id, account_code")
        .eq("society_id", body.society_id)
        .execute()
    )
    code_to_id = {a["account_code"]: a["id"] for a in accounts.data}

    for line in lines_data:
        if line["account_code"] not in code_to_id:
            raise HTTPException(
                status_code=400,
                detail=f"Cuenta {line['account_code']} no existe en el plan de cuentas."
            )

    # 3b. Validar que caja no quede negativa (Fase 7 - Integridad)
    # Verificar si alguna linea hace un HABER (salida) en Caja y Bancos (1.1.1)
    for line in lines_data:
        if line["account_code"] == "1.1.1" and line.get("haber", 0) > 0:
            # Calcular saldo actual de caja
            caja_lines = (
                db.table("journal_lines")
                .select("debe, haber, journal_entries!inner(society_id)")
                .eq("account_code", "1.1.1")
                .eq("journal_entries.society_id", body.society_id)
                .execute()
            )
            saldo_caja = sum(l.get("debe", 0) for l in caja_lines.data) - sum(l.get("haber", 0) for l in caja_lines.data)
            if saldo_caja - line["haber"] < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"La cuenta Caja y Bancos (1.1.1) quedaria con saldo negativo: ${saldo_caja - line['haber']:,.2f}. Saldo actual: ${saldo_caja:,.2f}."
                )
            break  # Solo necesitamos verificar la primera linea de caja

    # 3c. Marcar si no tiene sustento legal (sin factura/adjunto)
    has_legal_support = bool(body.attachment_url) or bool(body.reference)

    # 4. Insert journal entry header
    entry_data = {
        "society_id": body.society_id,
        "entry_date": body.entry_date.isoformat(),
        "description": body.description,
        "reference": body.reference,
        "source": body.source,
        "period_year": period_year,
        "period_month": period_month,
        "attachment_url": body.attachment_url,
        "total_debe": validation["total_debe"],
        "total_haber": validation["total_haber"],
        "created_by": user.id,
    }
    entry_result = db.table("journal_entries").insert(entry_data).execute()
    entry_id = entry_result.data[0]["id"]

    # 5. Insert journal lines
    lines_to_insert = []
    for i, line in enumerate(lines_data):
        lines_to_insert.append({
            "journal_entry_id": entry_id,
            "account_id": code_to_id[line["account_code"]],
            "account_code": line["account_code"],
            "description": line.get("description", ""),
            "debe": line.get("debe", 0),
            "haber": line.get("haber", 0),
            "line_order": i,
        })
    db.table("journal_lines").insert(lines_to_insert).execute()

    # 6. Auto-aggregate to financial_records
    _aggregate_period(db, body.society_id, period_year, period_month)

    return {
        "success": True,
        "data": {
            "entry_id": entry_id,
            "entry_number": entry_result.data[0].get("entry_number"),
            "total_debe": validation["total_debe"],
            "total_haber": validation["total_haber"],
            "lines_count": len(lines_to_insert),
            "has_legal_support": has_legal_support,
        },
    }


@router.get("/journal/{society_id}")
async def list_journal_entries(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(None),
    period_month: int = Query(None),
    limit: int = Query(50, le=200),
):
    """Listar asientos del Libro Diario."""
    db = get_supabase()
    query = (
        db.table("journal_entries")
        .select("*, journal_lines(*)")
        .eq("society_id", society_id)
        .order("entry_date", desc=True)
        .order("entry_number", desc=True)
        .limit(limit)
    )
    if period_year:
        query = query.eq("period_year", period_year)
    if period_month:
        query = query.eq("period_month", period_month)

    result = query.execute()
    return {"data": result.data}


@router.get("/journal/{society_id}/{entry_id}")
async def get_journal_entry(society_id: str, entry_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Obtener detalle de un asiento."""
    db = get_supabase()
    result = (
        db.table("journal_entries")
        .select("*, journal_lines(*)")
        .eq("id", entry_id)
        .eq("society_id", society_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    return {"data": result.data}


@router.delete("/journal/{society_id}/{entry_id}")
async def delete_journal_entry(society_id: str, entry_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Eliminar un asiento (solo si el periodo esta abierto)."""
    db = get_supabase()

    # Check the entry exists and period is open
    entry = (
        db.table("journal_entries")
        .select("id, period_year, period_month, is_locked")
        .eq("id", entry_id)
        .eq("society_id", society_id)
        .single()
        .execute()
    )
    if not entry.data:
        raise HTTPException(status_code=404, detail="Asiento no encontrado")
    if entry.data.get("is_locked"):
        raise HTTPException(status_code=400, detail="Este asiento esta en un periodo cerrado.")

    # Delete lines first (cascade should handle, but explicit)
    db.table("journal_lines").delete().eq("journal_entry_id", entry_id).execute()
    db.table("journal_entries").delete().eq("id", entry_id).execute()

    # Re-aggregate
    _aggregate_period(
        db, society_id,
        entry.data["period_year"],
        entry.data["period_month"]
    )

    return {"success": True, "deleted": True}


# ============================================
# LIBRO MAYOR
# ============================================

@router.get("/ledger/{society_id}/{account_code}")
async def get_ledger(
    society_id: str,
    account_code: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(None),
    period_month: int = Query(None),
):
    """Consultar Libro Mayor de una cuenta especifica."""
    db = get_supabase()

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

    # Flatten and sort by date
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

    return {"data": ledger}


# ============================================
# BALANCE DE COMPROBACION
# ============================================

@router.get("/trial-balance/{society_id}")
async def get_trial_balance(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(None),
    period_month: int = Query(None),
):
    """Generar Balance de Comprobacion (4 columnas)."""
    db = get_supabase()

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

    # Group by account_code
    lines_by_account: dict[str, list] = {}
    for line in lines_result.data:
        code = line.get("account_code", "")
        if code not in lines_by_account:
            lines_by_account[code] = []
        lines_by_account[code].append(line)

    trial = compute_trial_balance(accounts.data, lines_by_account)
    return {"data": trial}


# ============================================
# PERIODOS CONTABLES
# ============================================

@router.get("/periods/{society_id}")
async def list_periods(society_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Listar periodos contables."""
    db = get_supabase()
    result = (
        db.table("accounting_periods")
        .select("*")
        .eq("society_id", society_id)
        .order("period_year", desc=True)
        .order("period_month", desc=True)
        .execute()
    )
    return {"data": result.data}


@router.post("/periods/close")
async def close_period(body: PeriodCloseRequest, user: AuthenticatedUser = Depends(get_current_user)):
    """Cerrar un periodo contable. Bloquea edicion de asientos."""
    db = get_supabase()

    # Upsert period
    period_data = {
        "society_id": body.society_id,
        "period_year": body.period_year,
        "period_month": body.period_month,
        "status": "closed",
        "closed_at": "now()",
        "closed_by": user.id,
    }

    db.table("accounting_periods").upsert(
        period_data,
        on_conflict="society_id,period_year,period_month",
    ).execute()

    # Lock all journal entries in this period
    db.table("journal_entries").update(
        {"is_locked": True}
    ).eq("society_id", body.society_id).eq(
        "period_year", body.period_year
    ).eq("period_month", body.period_month).execute()

    # Final aggregate
    _aggregate_period(db, body.society_id, body.period_year, body.period_month)

    return {"success": True, "message": f"Periodo {body.period_month}/{body.period_year} cerrado."}


@router.post("/periods/reopen")
async def reopen_period(body: PeriodCloseRequest, user: AuthenticatedUser = Depends(get_current_user), x_admin_code: str = Header(default="")):
    """Reabrir un periodo cerrado (requiere codigo de admin)."""
    # Fase 7: Validacion de codigo admin para reabrir
    if x_admin_code != "SABIA-REOPEN-2026":
        raise HTTPException(
            status_code=403,
            detail="Se requiere el codigo de administrador para reabrir un periodo cerrado."
        )
    db = get_supabase()

    db.table("accounting_periods").update({
        "status": "reopened",
        "reopened_at": "now()",
        "reopened_by": user.id,
    }).eq("society_id", body.society_id).eq(
        "period_year", body.period_year
    ).eq("period_month", body.period_month).execute()

    # Unlock entries
    db.table("journal_entries").update(
        {"is_locked": False}
    ).eq("society_id", body.society_id).eq(
        "period_year", body.period_year
    ).eq("period_month", body.period_month).execute()

    return {"success": True, "message": f"Periodo {body.period_month}/{body.period_year} reabierto."}


# ============================================
# HELPER: Auto-aggregate asientos → financial_records
# ============================================

def _aggregate_period(db, society_id: str, period_year: int, period_month: int):
    """Recalcula financial_records desde asientos del periodo."""

    # Get all journal lines for this period
    lines = (
        db.table("journal_lines")
        .select("account_code, debe, haber, journal_entries!inner(society_id, period_year, period_month)")
        .eq("journal_entries.society_id", society_id)
        .eq("journal_entries.period_year", period_year)
        .eq("journal_entries.period_month", period_month)
        .execute()
    )

    fr_data = aggregate_to_financial_record(lines.data, period_year, period_month)
    fr_data["society_id"] = society_id

    # Upsert into financial_records
    db.table("financial_records").upsert(
        fr_data,
        on_conflict="society_id,period_year,period_month",
    ).execute()
