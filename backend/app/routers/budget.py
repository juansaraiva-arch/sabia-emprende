"""
Router: CRUD Presupuestos (Budget Targets) — Fase 10
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from app.database import get_supabase
from app.models import BudgetTargetCreate, BudgetTargetUpdate
from app.auth import AuthenticatedUser, get_current_user

router = APIRouter()


@router.post("/targets")
async def create_or_update_target(
    body: BudgetTargetCreate,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Crear o actualizar presupuesto (upsert por society+year+month)."""
    db = get_supabase()
    data = body.model_dump()

    # Verificar si ya existe
    existing = (
        db.table("budget_targets")
        .select("id")
        .eq("society_id", body.society_id)
        .eq("period_year", body.period_year)
        .eq("period_month", body.period_month)
        .execute()
    )

    if existing.data:
        # Actualizar existente
        result = (
            db.table("budget_targets")
            .update(data)
            .eq("id", existing.data[0]["id"])
            .execute()
        )
        return {"success": True, "data": result.data, "action": "updated"}

    # Crear nuevo
    result = db.table("budget_targets").insert(data).execute()
    return {"success": True, "data": result.data, "action": "created"}


@router.get("/targets/{society_id}")
async def list_targets(
    society_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    period_year: int = Query(None),
):
    """Listar presupuestos de una sociedad, opcionalmente filtrados por año."""
    db = get_supabase()
    query = (
        db.table("budget_targets")
        .select("*")
        .eq("society_id", society_id)
        .order("period_year")
        .order("period_month")
    )
    if period_year:
        query = query.eq("period_year", period_year)

    result = query.execute()
    return {"data": result.data}


@router.get("/targets/{society_id}/{year}/{month}")
async def get_target(
    society_id: str,
    year: int,
    month: int,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Obtener presupuesto de un periodo específico."""
    db = get_supabase()
    result = (
        db.table("budget_targets")
        .select("*")
        .eq("society_id", society_id)
        .eq("period_year", year)
        .eq("period_month", month)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No hay presupuesto para ese periodo")
    return {"data": result.data[0]}


@router.put("/targets/{target_id}")
async def update_target(
    target_id: str,
    body: BudgetTargetUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Actualizar un presupuesto existente."""
    db = get_supabase()

    # Verificar que existe
    existing = db.table("budget_targets").select("id").eq("id", target_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar")

    result = (
        db.table("budget_targets")
        .update(update_data)
        .eq("id", target_id)
        .execute()
    )
    return {"success": True, "data": result.data}


@router.delete("/targets/{target_id}")
async def delete_target(
    target_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Eliminar un presupuesto."""
    db = get_supabase()

    existing = db.table("budget_targets").select("id").eq("id", target_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")

    db.table("budget_targets").delete().eq("id", target_id).execute()
    return {"success": True}
