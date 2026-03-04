"""
Modulo de Autenticacion — Mi Director Financiero PTY
Valida JWT de Supabase y extrae identidad del usuario.
Soporta DEMO_MODE para desarrollo local sin Supabase Auth.
"""
import os
from typing import Optional
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Representa un usuario validado desde un JWT de Supabase."""

    def __init__(self, id: str, email: str, role: str = "owner"):
        self.id = id
        self.email = email
        self.role = role

    def __repr__(self) -> str:
        return f"AuthenticatedUser(id={self.id!r}, email={self.email!r}, role={self.role!r})"


def _is_demo_mode() -> bool:
    """Verifica si la app esta en modo demo/desarrollo."""
    return os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")


def _get_demo_user() -> AuthenticatedUser:
    """Retorna el usuario demo hardcodeado para desarrollo."""
    return AuthenticatedUser(
        id="demo-user-001",
        email="demo@midf.local",
        role="owner",
    )


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> AuthenticatedUser:
    """
    Dependencia FastAPI que extrae y valida el JWT de Supabase.

    En DEMO_MODE:
      - Sin token y sin x-user-id: retorna demo user
      - Con x-user-id legacy: retorna user con ese ID
      - Con Bearer token: valida normalmente

    En produccion:
      - Sin token: HTTP 401
      - Con token: valida contra Supabase GoTrue /auth/v1/user
    """
    # Si hay token Bearer, validar siempre (demo o produccion)
    if credentials is not None:
        return await _validate_supabase_token(credentials.credentials)

    # Sin token Bearer
    if _is_demo_mode():
        # Buscar header legacy x-user-id
        legacy_id = request.headers.get("x-user-id")
        if legacy_id:
            return AuthenticatedUser(id=legacy_id, email="legacy@midf.local")
        return _get_demo_user()

    # Produccion sin token = no autorizado
    raise HTTPException(
        status_code=401,
        detail="Token de autenticacion requerido. Inicia sesion primero.",
    )


async def _validate_supabase_token(token: str) -> AuthenticatedUser:
    """Valida un Bearer token contra Supabase GoTrue."""
    supabase_url = os.environ.get("SUPABASE_URL")
    anon_key = os.environ.get("SUPABASE_ANON_KEY")

    if not supabase_url or not anon_key:
        raise HTTPException(
            status_code=500,
            detail="Configuracion de Supabase incompleta en el servidor.",
        )

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": anon_key,
                },
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=503,
                detail="Servicio de autenticacion no disponible. Intenta de nuevo.",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Error de conexion con servicio de autenticacion: {str(e)[:100]}",
            )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Token invalido o expirado. Inicia sesion de nuevo.",
        )

    user_data = response.json()
    return AuthenticatedUser(
        id=user_data["id"],
        email=user_data.get("email", ""),
        role=user_data.get("user_metadata", {}).get("role", "owner"),
    )
