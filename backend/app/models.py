"""
Modelos Pydantic para validación de datos.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from enum import Enum


# --- Enums ---
class EntityType(str, Enum):
    SA = "SA"
    SRL = "SRL"
    SE = "SE"


class ContractType(str, Enum):
    PAYROLL = "payroll"
    FREELANCE = "freelance"


class FiscalRegime(str, Enum):
    GENERAL = "general"
    SIMPLIFIED = "simplified"
    SE_EXEMPT = "se_exempt"


# --- Societies ---
class SocietyCreate(BaseModel):
    entity_type: EntityType
    legal_name: str = Field(min_length=3, max_length=200)
    trade_name: Optional[str] = None
    tax_id: Optional[str] = None
    incorporation_date: Optional[date] = None
    governing_law: Optional[str] = None
    industry: Optional[str] = None
    fiscal_regime: FiscalRegime = FiscalRegime.GENERAL


class SocietyResponse(SocietyCreate):
    id: str
    user_id: str
    status: str


# --- Financial Records ---
class FinancialRecordCreate(BaseModel):
    society_id: str
    period_year: int = Field(ge=2020, le=2030)
    period_month: int = Field(ge=1, le=12)
    revenue: float = Field(ge=0, default=0)
    cogs: float = Field(ge=0, default=0)
    opex_rent: float = Field(ge=0, default=0)
    opex_payroll: float = Field(ge=0, default=0)
    opex_other: float = Field(ge=0, default=0)
    depreciation: float = Field(ge=0, default=0)
    interest_expense: float = Field(ge=0, default=0)
    tax_expense: float = Field(ge=0, default=0)
    cash_balance: float = Field(ge=0, default=0)
    accounts_receivable: float = Field(ge=0, default=0)
    inventory: float = Field(ge=0, default=0)
    accounts_payable: float = Field(ge=0, default=0)
    bank_debt: float = Field(ge=0, default=0)
    source: str = "manual"


class FinancialRecordResponse(FinancialRecordCreate):
    id: str
    gross_profit: float
    total_opex: float
    ebitda: float
    net_income: float


# --- Payroll ---
class PayrollEntryCreate(BaseModel):
    society_id: str
    employee_name: str
    contract_type: ContractType
    gross_salary: float = Field(gt=0)


class PayrollEntryResponse(PayrollEntryCreate):
    id: str
    employer_cost: float
    employee_net: float
    total_deductions: float


# --- NLP ---
class NLPQuery(BaseModel):
    """Input del usuario en lenguaje natural (español)."""
    query: str = Field(
        min_length=3,
        max_length=500,
        description="Descripción en español plano del resultado financiero deseado",
        json_schema_extra={
            "examples": [
                "Mis ventas de enero fueron 50 mil y gasté 30 mil en mercancía",
                "Quiero ver cuánto me queda después de pagar todo",
                "Si subo el precio un 10%, qué pasa con mi margen",
            ]
        },
    )
    society_id: str


class NLPResponse(BaseModel):
    """Respuesta interpretada del motor NLP."""
    understood: bool
    action: str
    description: str
    data: Optional[dict] = None
    suggestion: Optional[str] = None


# --- Audit ---
class AuditLogEntry(BaseModel):
    id: str
    user_id: str
    action_type: str
    action_description: str
    field_changed: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    formula_changed: Optional[str] = None
    nlp_raw_input: Optional[str] = None
    created_at: str
