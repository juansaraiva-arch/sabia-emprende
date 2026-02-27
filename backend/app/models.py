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


class PayrollEntryCreateFull(BaseModel):
    society_id: str
    employee_name: str
    contract_type: ContractType
    gross_salary: float = Field(gt=0)
    cedula: Optional[str] = None
    entry_date: Optional[date] = None
    exit_date: Optional[date] = None
    exit_reason: Optional[str] = None
    years_worked: int = Field(ge=0, default=0)


class PayrollEntryResponse(PayrollEntryCreate):
    id: str
    employer_cost: float
    employee_net: float
    total_deductions: float


class PayrollEntryFullResponse(BaseModel):
    id: str
    society_id: str
    employee_name: str
    contract_type: str
    gross_salary: float
    cedula: Optional[str] = None
    entry_date: Optional[str] = None
    exit_date: Optional[str] = None
    exit_reason: Optional[str] = None
    years_worked: int = 0
    vacation_days_accrued: float = 0
    vacation_days_taken: float = 0
    xiii_mes_accumulated: float = 0
    employer_cost: Optional[float] = None
    employee_net: Optional[float] = None
    total_deductions: Optional[float] = None
    is_active: bool = True


class AttendanceRecordCreate(BaseModel):
    payroll_entry_id: str
    society_id: str
    record_date: date
    record_type: str = Field(
        description="Tipo: vacation_taken, justified_absence, unjustified_absence, holiday_worked, sunday_worked, compensatory_day"
    )
    hours: float = Field(ge=0, default=8)
    surcharge_pct: float = Field(ge=0, default=0)
    notes: Optional[str] = None


# --- Contabilidad ---
class AccountCreate(BaseModel):
    society_id: str
    account_code: str = Field(min_length=1, max_length=20)
    account_name: str = Field(min_length=2, max_length=200)
    account_type: str = Field(description="activo, pasivo, patrimonio, ingreso, costo_gasto")
    parent_code: Optional[str] = None
    level: int = Field(ge=1, le=5, default=3)
    is_header: bool = False
    normal_balance: str = Field(default="debe", description="debe o haber")


class JournalLineCreate(BaseModel):
    account_code: str
    description: Optional[str] = None
    debe: float = Field(ge=0, default=0)
    haber: float = Field(ge=0, default=0)


class JournalEntryCreate(BaseModel):
    society_id: str
    entry_date: date
    description: str = Field(min_length=3, max_length=500)
    reference: Optional[str] = None
    source: str = "manual"
    attachment_url: Optional[str] = None
    lines: list[JournalLineCreate] = Field(min_length=2)


class PeriodCloseRequest(BaseModel):
    society_id: str
    period_year: int = Field(ge=2020, le=2040)
    period_month: int = Field(ge=1, le=12)


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


class ChatMessage(BaseModel):
    """Un mensaje en el historial de conversacion."""
    role: str = Field(description="user o assistant")
    content: str


class NLPChatQuery(BaseModel):
    """Input para el chat conversacional con GPT-4o."""
    query: str = Field(
        min_length=1,
        max_length=2000,
        description="Mensaje del usuario en español plano",
    )
    society_id: str
    system_prompt: str = Field(
        default="",
        max_length=5000,
        description="System prompt del frontend (contexto CFO/Legal)",
    )
    history: list[ChatMessage] = Field(
        default=[],
        max_length=20,
        description="Ultimos mensajes de la conversacion para contexto",
    )


class NLPChatResponse(BaseModel):
    """Respuesta del chat conversacional GPT-4o."""
    reply: str
    action: Optional[str] = None
    data: Optional[dict] = None
    source: str = "gpt-4o"


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


# --- Presupuesto (Fase 10) ---
class BudgetTargetCreate(BaseModel):
    society_id: str
    period_year: int = Field(ge=2020, le=2040)
    period_month: int = Field(ge=1, le=12)
    revenue_target: float = Field(ge=0, default=0)
    cogs_target: float = Field(ge=0, default=0)
    opex_rent_target: float = Field(ge=0, default=0)
    opex_payroll_target: float = Field(ge=0, default=0)
    opex_other_target: float = Field(ge=0, default=0)
    notes: Optional[str] = None


class BudgetTargetUpdate(BaseModel):
    revenue_target: Optional[float] = Field(None, ge=0)
    cogs_target: Optional[float] = Field(None, ge=0)
    opex_rent_target: Optional[float] = Field(None, ge=0)
    opex_payroll_target: Optional[float] = Field(None, ge=0)
    opex_other_target: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


# --- Multi-Periodo (Fase 10) ---
class TrendPoint(BaseModel):
    year: int
    month: int
    label: str
    revenue: float
    cogs: float
    gross_profit: float
    total_opex: float
    ebitda: float
    net_income: float
    gross_margin_pct: float
    ebitda_margin_pct: float
    net_margin_pct: float


class TrendResponse(BaseModel):
    points: list[TrendPoint]
    growth_rates: dict[str, float]
    moving_averages: dict[str, list[Optional[float]]]


class ComparisonResponse(BaseModel):
    period_a: dict
    period_b: dict
    deltas: dict[str, float]
    pct_changes: dict[str, float]
    improvements: list[str]
    deteriorations: list[str]


class ForecastPoint(BaseModel):
    year: int
    month: int
    label: str
    revenue: float
    ebitda: float
    net_income: float
    confidence_low: float
    confidence_high: float


class ForecastResponse(BaseModel):
    historical: list[TrendPoint]
    projected: list[ForecastPoint]
    method: str


class BudgetVarianceItem(BaseModel):
    metric: str
    metric_key: str
    actual: float
    budget: float
    variance: float
    variance_pct: float
    status: str


class BudgetVsActualResponse(BaseModel):
    period_year: int
    period_month: int
    items: list[BudgetVarianceItem]
    overall_score: float
