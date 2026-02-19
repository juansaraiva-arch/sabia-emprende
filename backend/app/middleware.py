"""
Middleware: Rate limiting y configuracion CORS.
SABIA EMPRENDE
"""
import os
import time
from collections import defaultdict
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiter in-memory por IP.
    Ventana deslizante de 60 segundos.
    Para produccion, reemplazar con Redis.
    """

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Excluir health check
        if request.url.path == "/":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - 60

        # Limpiar entradas viejas
        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if t > window_start
        ]

        if len(self.requests[client_ip]) >= self.rpm:
            return JSONResponse(
                status_code=429,
                content={"detail": "Demasiadas solicitudes. Intenta en un minuto."},
            )

        self.requests[client_ip].append(now)
        return await call_next(request)


def get_cors_origins() -> list[str]:
    """Obtiene los origins CORS del environment o usa defaults."""
    origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    return [o.strip() for o in origins_str.split(",") if o.strip()]
