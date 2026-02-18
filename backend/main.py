"""
SABIA EMPRENDE - FastAPI Backend
Motor financiero + Capa de Lenguaje Natural + Session Logging
"""
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import get_supabase
from app.routers import financial, societies, nlp, audit, ai_agents


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("SABIA EMPRENDE API iniciando...")
    yield
    print("SABIA EMPRENDE API cerrando...")


app = FastAPI(
    title="SABIA EMPRENDE API",
    description="Motor financiero y legal para emprendedores en Panamá",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(societies.router, prefix="/api/societies", tags=["Sociedades"])
app.include_router(financial.router, prefix="/api/financial", tags=["Motor Financiero"])
app.include_router(nlp.router, prefix="/api/nlp", tags=["Lenguaje Natural"])
app.include_router(audit.router, prefix="/api/audit", tags=["Auditoría"])
app.include_router(ai_agents.router, prefix="/api/ai", tags=["Inteligencia Artificial"])


@app.get("/")
async def root():
    return {"status": "ok", "app": "SABIA EMPRENDE", "version": "0.1.0"}
