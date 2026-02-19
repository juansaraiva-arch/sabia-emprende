-- Fase 10: Tabla de presupuestos (Budget Targets)
-- Almacena metas presupuestarias por sociedad/periodo.

CREATE TABLE IF NOT EXISTS public.budget_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    period_year INT NOT NULL,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    revenue_target NUMERIC(15,2) DEFAULT 0,
    cogs_target NUMERIC(15,2) DEFAULT 0,
    opex_rent_target NUMERIC(15,2) DEFAULT 0,
    opex_payroll_target NUMERIC(15,2) DEFAULT 0,
    opex_other_target NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(society_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_budget_targets_society ON public.budget_targets(society_id);
CREATE INDEX IF NOT EXISTS idx_budget_targets_period ON public.budget_targets(period_year, period_month);
