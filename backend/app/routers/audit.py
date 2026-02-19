"""
Router: Auditoría / Session Logging
Consulta del historial de cambios en la lógica financiera.
"""
from fastapi import APIRouter, Depends, Query
from app.database import get_supabase
from app.auth import AuthenticatedUser, get_current_user

router = APIRouter()


@router.get("/logs")
async def get_audit_logs(
    user: AuthenticatedUser = Depends(get_current_user),
    limit: int = Query(50, le=200),
    action_type: str = Query(None, description="Filtrar por tipo de acción"),
    target_id: str = Query(None, description="Filtrar por registro específico"),
):
    """Lista los logs de auditoría del usuario."""
    db = get_supabase()
    query = (
        db.table("audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(limit)
    )

    if action_type:
        query = query.eq("action_type", action_type)
    if target_id:
        query = query.eq("target_id", target_id)

    result = query.execute()
    return {"data": result.data, "count": len(result.data)}


@router.get("/logs/financial/{record_id}")
async def get_financial_history(record_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Historial completo de cambios de un registro financiero específico."""
    db = get_supabase()
    result = (
        db.table("audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("target_id", record_id)
        .eq("target_table", "financial_records")
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data, "record_id": record_id}


@router.get("/logs/nlp")
async def get_nlp_history(user: AuthenticatedUser = Depends(get_current_user), limit: int = Query(20)):
    """Historial de queries en lenguaje natural."""
    db = get_supabase()
    result = (
        db.table("audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("action_type", "nlp_query_executed")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"data": result.data}


@router.get("/logs/assumptions")
async def get_assumption_changes(user: AuthenticatedUser = Depends(get_current_user)):
    """Cambios en supuestos financieros (fórmulas, multiplicadores, etc.)."""
    db = get_supabase()
    result = (
        db.table("audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .in_("action_type", ["assumption_changed", "formula_override"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"data": result.data}
