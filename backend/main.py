"""
Mi Director Financiero PTY - FastAPI Backend
Motor financiero + Capa de Lenguaje Natural + Session Logging
"""
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import get_supabase
from app.middleware import RateLimitMiddleware, get_cors_origins
from app.routers import financial, societies, nlp, audit, ai_agents, payroll, accounting, reports, budget


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Mi Director Financiero PTY API iniciando...")
    yield
    print("Mi Director Financiero PTY API cerrando...")


app = FastAPI(
    title="Mi Director Financiero PTY API",
    description="Motor financiero y legal para emprendedores en Panamá",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(RateLimitMiddleware, requests_per_minute=60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(societies.router, prefix="/api/societies", tags=["Sociedades"])
app.include_router(financial.router, prefix="/api/financial", tags=["Motor Financiero"])
app.include_router(nlp.router, prefix="/api/nlp", tags=["Lenguaje Natural"])
app.include_router(audit.router, prefix="/api/audit", tags=["Auditoría"])
app.include_router(ai_agents.router, prefix="/api/ai", tags=["Inteligencia Artificial"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["Nómina"])
app.include_router(accounting.router, prefix="/api/accounting", tags=["Contabilidad"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reportes PDF"])
app.include_router(budget.router, prefix="/api/budget", tags=["Presupuesto"])


@app.get("/")
async def root():
    return {"status": "ok", "app": "Mi Director Financiero PTY", "version": "0.1.0"}
