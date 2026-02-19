"""
Router: Sociedades (SA, SRL, SE)
CRUD de entidades legales panameñas.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_supabase
from app.models import SocietyCreate
from app.auth import AuthenticatedUser, get_current_user

router = APIRouter()


@router.post("/")
async def create_society(body: SocietyCreate, user: AuthenticatedUser = Depends(get_current_user)):
    db = get_supabase()
    data = {
        "user_id": user.id,
        **body.model_dump(),
        "entity_type": body.entity_type.value,
        "fiscal_regime": body.fiscal_regime.value,
        "status": "draft",
    }
    if body.incorporation_date:
        data["incorporation_date"] = body.incorporation_date.isoformat()

    result = db.table("societies").insert(data).execute()
    return {"success": True, "data": result.data}


@router.get("/")
async def list_societies(user: AuthenticatedUser = Depends(get_current_user)):
    db = get_supabase()
    result = db.table("societies").select("*").eq("user_id", user.id).execute()
    return {"data": result.data}


@router.get("/{society_id}")
async def get_society(society_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("societies")
        .select("*")
        .eq("id", society_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Sociedad no encontrada")
    return {"data": result.data}


@router.patch("/{society_id}")
async def update_society(society_id: str, body: dict, user: AuthenticatedUser = Depends(get_current_user)):
    db = get_supabase()
    result = (
        db.table("societies")
        .update(body)
        .eq("id", society_id)
        .eq("user_id", user.id)
        .execute()
    )
    return {"success": True, "data": result.data}
