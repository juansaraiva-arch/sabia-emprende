-- ============================================================
-- SAVIA EMPRENDE / LEGADO PTY
-- Schema SQL para Supabase (PostgreSQL)
-- Sprint 1: Tablas core + RLS + Audit Logging
-- ============================================================

-- 0. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLA: users
-- Extiende auth.users de Supabase con datos de negocio
-- ============================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
    kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
    cedula TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Perfil extendido del usuario. Se vincula a auth.users de Supabase.';
COMMENT ON COLUMN public.users.role IS 'Rol dentro de la plataforma: owner (dueño), admin, accountant (contador), viewer (solo lectura).';
COMMENT ON COLUMN public.users.kyc_status IS 'Estado de verificación KYC: pending, submitted, verified, rejected.';

-- ============================================================
-- 2. TABLA: societies
-- Entidades legales (SA, SRL, SE) constituidas en Panamá
-- ============================================================
CREATE TABLE public.societies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Datos legales
    entity_type TEXT NOT NULL CHECK (entity_type IN ('SA', 'SRL', 'SE')),
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    tax_id TEXT,                    -- RUC / NIT
    incorporation_date DATE,
    governing_law TEXT,             -- Ej: "Ley 32 de 1927"

    -- Estado
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'active', 'suspended', 'dissolved')),

    -- Datos operativos (del motor SG Consulting)
    industry TEXT,
    fiscal_regime TEXT DEFAULT 'general' CHECK (fiscal_regime IN ('general', 'simplified', 'se_exempt')),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_societies_user_id ON public.societies(user_id);
CREATE INDEX idx_societies_entity_type ON public.societies(entity_type);

COMMENT ON TABLE public.societies IS 'Sociedades/empresas constituidas. Cada usuario puede tener múltiples sociedades.';
COMMENT ON COLUMN public.societies.entity_type IS 'SA = Sociedad Anónima, SRL = Resp. Limitada, SE = Sociedad de Emprendimiento (Ley 186).';
COMMENT ON COLUMN public.societies.fiscal_regime IS 'Régimen fiscal: general (ITBMS >$36k), simplified (<$36k), se_exempt (Ley 186 exoneración).';

-- ============================================================
-- 3. TABLA: financial_records
-- Registros financieros mensuales (Motor de Verdad Financiera)
-- ============================================================
CREATE TABLE public.financial_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

    -- Periodo
    period_year INT NOT NULL,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),

    -- P&L (Cascada de Rentabilidad)
    revenue NUMERIC(15,2) NOT NULL DEFAULT 0,           -- Ventas totales
    cogs NUMERIC(15,2) NOT NULL DEFAULT 0,              -- Costo de ventas (variable)

    -- OPEX desglosado
    opex_rent NUMERIC(15,2) NOT NULL DEFAULT 0,         -- Alquiler + CAM
    opex_payroll NUMERIC(15,2) NOT NULL DEFAULT 0,      -- Planilla (costo real con cargas)
    opex_other NUMERIC(15,2) NOT NULL DEFAULT 0,        -- Servicios, software, marketing

    -- Bajo la línea
    depreciation NUMERIC(15,2) NOT NULL DEFAULT 0,
    interest_expense NUMERIC(15,2) NOT NULL DEFAULT 0,
    tax_expense NUMERIC(15,2) NOT NULL DEFAULT 0,       -- ISR estimado

    -- Balance (foto del mes)
    cash_balance NUMERIC(15,2) DEFAULT 0,               -- Caja y bancos
    accounts_receivable NUMERIC(15,2) DEFAULT 0,        -- Cuentas por cobrar
    inventory NUMERIC(15,2) DEFAULT 0,                  -- Inventario
    accounts_payable NUMERIC(15,2) DEFAULT 0,           -- Cuentas por pagar
    bank_debt NUMERIC(15,2) DEFAULT 0,                  -- Deuda bancaria total

    -- Campos calculados (se persisten para queries rápidos)
    gross_profit NUMERIC(15,2) GENERATED ALWAYS AS (revenue - cogs) STORED,
    total_opex NUMERIC(15,2) GENERATED ALWAYS AS (opex_rent + opex_payroll + opex_other) STORED,
    ebitda NUMERIC(15,2) GENERATED ALWAYS AS (revenue - cogs - opex_rent - opex_payroll - opex_other) STORED,
    net_income NUMERIC(15,2) GENERATED ALWAYS AS (
        revenue - cogs - opex_rent - opex_payroll - opex_other - depreciation - interest_expense - tax_expense
    ) STORED,

    -- Metadata
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'csv_upload', 'natural_language', 'api')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Un solo registro por sociedad/periodo
    UNIQUE(society_id, period_year, period_month)
);

CREATE INDEX idx_financial_records_society ON public.financial_records(society_id);
CREATE INDEX idx_financial_records_period ON public.financial_records(period_year, period_month);

COMMENT ON TABLE public.financial_records IS 'Datos financieros mensuales. Alimenta la Cascada, Mandíbulas, Semáforo y Simulador.';
COMMENT ON COLUMN public.financial_records.source IS 'Origen del dato: manual, csv_upload, natural_language (NLP layer), api.';

-- ============================================================
-- 4. TABLA: audit_logs
-- Session Logging: Rastreo de cambios en lógica financiera
-- ============================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Quién
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    session_id TEXT,                         -- ID de sesión del navegador
    ip_address INET,

    -- Qué
    action_type TEXT NOT NULL CHECK (action_type IN (
        'financial_record_created',
        'financial_record_updated',
        'financial_record_deleted',
        'assumption_changed',           -- Cambio en supuestos (ej: multiplicador EBITDA)
        'simulation_run',               -- Corrida de simulador
        'formula_override',             -- Override manual de fórmula
        'society_created',
        'society_updated',
        'csv_uploaded',
        'nlp_query_executed'            -- Query en lenguaje natural
    )),
    action_description TEXT NOT NULL,        -- Descripción legible en español

    -- Contexto del cambio
    target_table TEXT,                       -- Tabla afectada
    target_id UUID,                          -- ID del registro afectado

    -- Rastreo de valores (auditoría financiera)
    field_changed TEXT,                      -- Campo específico modificado
    previous_value TEXT,                     -- Valor anterior (serializado)
    new_value TEXT,                          -- Valor nuevo (serializado)
    formula_changed TEXT,                    -- Si aplica, la fórmula que cambió

    -- NLP tracking
    nlp_raw_input TEXT,                      -- Input original del usuario en español
    nlp_interpreted_action TEXT,             -- Acción interpretada por el motor NLP

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action_type);
CREATE INDEX idx_audit_logs_target ON public.audit_logs(target_table, target_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Log inmutable de auditoría. Cada cambio en datos financieros queda registrado.';
COMMENT ON COLUMN public.audit_logs.formula_changed IS 'Registra cambios en la lógica de cálculo (ej: "margen_ebitda" fórmula anterior vs nueva).';
COMMENT ON COLUMN public.audit_logs.nlp_raw_input IS 'Captura la frase original del usuario cuando usa la Capa de Lenguaje Natural.';

-- ============================================================
-- 5. TABLA: payroll_entries
-- Detalle de nómina (Motor de Talento de SG Consulting)
-- ============================================================
CREATE TABLE public.payroll_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

    employee_name TEXT NOT NULL,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('payroll', 'freelance')),
    gross_salary NUMERIC(12,2) NOT NULL,

    -- Calculados por el motor Panamá
    employer_cost NUMERIC(12,2),            -- Costo real empresa (con SS, SE, RP, XIII)
    employee_net NUMERIC(12,2),             -- Neto al empleado
    total_deductions NUMERIC(12,2),         -- Retenciones totales

    is_active BOOLEAN DEFAULT TRUE,

    -- Campos extendidos (Fase 1: Nomina Completa)
    cedula TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    exit_date DATE,
    exit_reason TEXT CHECK (exit_reason IN ('renuncia', 'despido', 'mutuo_acuerdo', 'fin_contrato')),
    years_worked INT DEFAULT 0,
    vacation_days_accrued NUMERIC(6,2) DEFAULT 0,
    vacation_days_taken NUMERIC(6,2) DEFAULT 0,
    xiii_mes_accumulated NUMERIC(12,2) DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_society ON public.payroll_entries(society_id);

-- ============================================================
-- 5b. TABLA: attendance_records
-- Registro de asistencia, vacaciones, faltas y feriados laborados
-- ============================================================
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_entry_id UUID NOT NULL REFERENCES public.payroll_entries(id) ON DELETE CASCADE,
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

    record_date DATE NOT NULL,
    record_type TEXT NOT NULL CHECK (record_type IN (
        'vacation_taken',
        'justified_absence',
        'unjustified_absence',
        'holiday_worked',
        'sunday_worked',
        'compensatory_day'
    )),
    hours NUMERIC(4,1) DEFAULT 8,
    surcharge_pct NUMERIC(5,2) DEFAULT 0,        -- 50% domingo, 150% feriado
    deduction_amount NUMERIC(12,2) DEFAULT 0,     -- Monto descontado del salario
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attendance_payroll ON public.attendance_records(payroll_entry_id);
CREATE INDEX idx_attendance_society ON public.attendance_records(society_id);
CREATE INDEX idx_attendance_date ON public.attendance_records(record_date);

COMMENT ON TABLE public.attendance_records IS 'Registro de novedades laborales: vacaciones, faltas, feriados laborados, dias compensatorios.';

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- Cada usuario solo ve sus propios datos
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- USERS: Solo puede ver/editar su propio perfil
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- SOCIETIES: Solo el dueño puede acceder
CREATE POLICY "societies_select_own" ON public.societies
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "societies_insert_own" ON public.societies
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "societies_update_own" ON public.societies
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "societies_delete_own" ON public.societies
    FOR DELETE USING (auth.uid() = user_id);

-- FINANCIAL_RECORDS: Via la sociedad del usuario
CREATE POLICY "financial_records_select" ON public.financial_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = financial_records.society_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "financial_records_insert" ON public.financial_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = financial_records.society_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "financial_records_update" ON public.financial_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = financial_records.society_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "financial_records_delete" ON public.financial_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = financial_records.society_id
            AND s.user_id = auth.uid()
        )
    );

-- AUDIT_LOGS: Solo lectura del propio usuario (inmutable)
CREATE POLICY "audit_logs_select_own" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "audit_logs_insert_own" ON public.audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PAYROLL: Via la sociedad del usuario
CREATE POLICY "payroll_select" ON public.payroll_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = payroll_entries.society_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "payroll_insert" ON public.payroll_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = payroll_entries.society_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "payroll_update" ON public.payroll_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = payroll_entries.society_id
            AND s.user_id = auth.uid()
        )
    );

-- ATTENDANCE_RECORDS: Via la sociedad del usuario
CREATE POLICY "attendance_select" ON public.attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = attendance_records.society_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "attendance_insert" ON public.attendance_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = attendance_records.society_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "attendance_update" ON public.attendance_records
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = attendance_records.society_id
            AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "attendance_delete" ON public.attendance_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = attendance_records.society_id
            AND s.user_id = auth.uid()
        )
    );

-- ============================================================
-- 7. FUNCIONES AUXILIARES
-- ============================================================

-- Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_societies_updated_at
    BEFORE UPDATE ON public.societies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_financial_records_updated_at
    BEFORE UPDATE ON public.financial_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payroll_updated_at
    BEFORE UPDATE ON public.payroll_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. FUNCIÓN: Audit Logger Automático
-- Se llama desde el backend para registrar cada cambio
-- ============================================================
CREATE OR REPLACE FUNCTION log_financial_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log each changed financial field
        IF OLD.revenue IS DISTINCT FROM NEW.revenue THEN
            INSERT INTO public.audit_logs (user_id, action_type, action_description, target_table, target_id, field_changed, previous_value, new_value)
            SELECT s.user_id, 'financial_record_updated',
                   'Ingreso actualizado para ' || NEW.period_month || '/' || NEW.period_year,
                   'financial_records', NEW.id, 'revenue', OLD.revenue::TEXT, NEW.revenue::TEXT
            FROM public.societies s WHERE s.id = NEW.society_id;
        END IF;

        IF OLD.cogs IS DISTINCT FROM NEW.cogs THEN
            INSERT INTO public.audit_logs (user_id, action_type, action_description, target_table, target_id, field_changed, previous_value, new_value)
            SELECT s.user_id, 'financial_record_updated',
                   'Costo de ventas actualizado para ' || NEW.period_month || '/' || NEW.period_year,
                   'financial_records', NEW.id, 'cogs', OLD.cogs::TEXT, NEW.cogs::TEXT
            FROM public.societies s WHERE s.id = NEW.society_id;
        END IF;

        IF OLD.opex_payroll IS DISTINCT FROM NEW.opex_payroll THEN
            INSERT INTO public.audit_logs (user_id, action_type, action_description, target_table, target_id, field_changed, previous_value, new_value)
            SELECT s.user_id, 'financial_record_updated',
                   'Planilla actualizada para ' || NEW.period_month || '/' || NEW.period_year,
                   'financial_records', NEW.id, 'opex_payroll', OLD.opex_payroll::TEXT, NEW.opex_payroll::TEXT
            FROM public.societies s WHERE s.id = NEW.society_id;
        END IF;

    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action_type, action_description, target_table, target_id, field_changed, new_value)
        SELECT s.user_id, 'financial_record_created',
               'Registro financiero creado para ' || NEW.period_month || '/' || NEW.period_year,
               'financial_records', NEW.id, 'full_record', row_to_json(NEW)::TEXT
        FROM public.societies s WHERE s.id = NEW.society_id;

    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action_type, action_description, target_table, target_id, field_changed, previous_value)
        SELECT s.user_id, 'financial_record_deleted',
               'Registro financiero eliminado para ' || OLD.period_month || '/' || OLD.period_year,
               'financial_records', OLD.id, 'full_record', row_to_json(OLD)::TEXT
        FROM public.societies s WHERE s.id = OLD.society_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_financial_records
    AFTER INSERT OR UPDATE OR DELETE ON public.financial_records
    FOR EACH ROW EXECUTE FUNCTION log_financial_change();

-- ============================================================
-- 9. VISTA: Dashboard Financiero (pre-calculada)
-- ============================================================
CREATE OR REPLACE VIEW public.v_financial_dashboard AS
SELECT
    fr.id,
    fr.society_id,
    s.legal_name,
    s.entity_type,
    fr.period_year,
    fr.period_month,
    fr.revenue,
    fr.cogs,
    fr.gross_profit,
    fr.total_opex,
    fr.ebitda,
    fr.net_income,
    -- Ratios calculados
    CASE WHEN fr.revenue > 0 THEN ROUND((fr.gross_profit / fr.revenue) * 100, 2) ELSE 0 END AS gross_margin_pct,
    CASE WHEN fr.revenue > 0 THEN ROUND((fr.ebitda / fr.revenue) * 100, 2) ELSE 0 END AS ebitda_margin_pct,
    CASE WHEN fr.revenue > 0 THEN ROUND((fr.net_income / fr.revenue) * 100, 2) ELSE 0 END AS net_margin_pct,
    CASE WHEN fr.revenue > 0 THEN ROUND((fr.opex_rent / fr.revenue) * 100, 2) ELSE 0 END AS rent_ratio_pct,
    CASE WHEN fr.gross_profit > 0 THEN ROUND((fr.opex_payroll / fr.gross_profit) * 100, 2) ELSE 0 END AS payroll_ratio_pct,
    -- Oxígeno (CCC)
    CASE WHEN fr.revenue > 0 THEN ROUND((fr.accounts_receivable / fr.revenue) * 30, 1) ELSE 0 END AS days_receivable,
    CASE WHEN fr.cogs > 0 THEN ROUND((fr.inventory / fr.cogs) * 30, 1) ELSE 0 END AS days_inventory,
    CASE WHEN fr.cogs > 0 THEN ROUND((fr.accounts_payable / fr.cogs) * 30, 1) ELSE 0 END AS days_payable,
    -- Radar Fiscal ITBMS
    CASE
        WHEN fr.revenue * 12 >= 36000 THEN 'obligatorio'
        WHEN fr.revenue * 12 >= 30000 THEN 'precaucion'
        ELSE 'libre'
    END AS itbms_status,
    fr.source,
    fr.created_at
FROM public.financial_records fr
JOIN public.societies s ON s.id = fr.society_id;

-- ============================================================
-- 10. TABLA: chart_of_accounts
-- Plan de Cuentas contable (codificacion decimal Panama)
-- ============================================================
CREATE TABLE public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

    account_code TEXT NOT NULL,              -- "1.1.1", "4.1", "5.2.3"
    account_name TEXT NOT NULL,              -- "Caja y Bancos", "Ventas", "Alquiler"
    account_type TEXT NOT NULL CHECK (account_type IN (
        'activo', 'pasivo', 'patrimonio', 'ingreso', 'costo_gasto'
    )),
    parent_code TEXT,                        -- "1.1" es padre de "1.1.1"
    level INT NOT NULL DEFAULT 1,            -- 1 = mayor, 2 = sub, 3 = detalle
    is_header BOOLEAN DEFAULT FALSE,         -- TRUE = cuenta de agrupacion, no se usa en asientos
    normal_balance TEXT NOT NULL DEFAULT 'debe' CHECK (normal_balance IN ('debe', 'haber')),
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(society_id, account_code)
);

CREATE INDEX idx_coa_society ON public.chart_of_accounts(society_id);
CREATE INDEX idx_coa_type ON public.chart_of_accounts(account_type);
CREATE INDEX idx_coa_parent ON public.chart_of_accounts(society_id, parent_code);

COMMENT ON TABLE public.chart_of_accounts IS 'Plan de cuentas contable. Codificacion decimal: 1.x Activos, 2.x Pasivos, 3.x Patrimonio, 4.x Ingresos, 5.x Costos/Gastos.';
COMMENT ON COLUMN public.chart_of_accounts.normal_balance IS 'Saldo normal: activos y gastos = debe; pasivos, patrimonio e ingresos = haber.';

-- ============================================================
-- 11. TABLA: journal_entries (Libro Diario)
-- Encabezado de asientos contables
-- ============================================================
CREATE TABLE public.journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

    entry_number SERIAL,                    -- Consecutivo por sociedad
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,              -- "Venta al contado Factura #123"
    reference TEXT,                          -- # factura, # recibo, etc.
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'nlp', 'auto', 'csv')),

    period_year INT NOT NULL,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),

    is_locked BOOLEAN DEFAULT FALSE,        -- TRUE si el periodo esta cerrado
    attachment_url TEXT,                     -- URL factura/soporte en storage

    total_debe NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_haber NUMERIC(15,2) NOT NULL DEFAULT 0,

    created_by TEXT,                         -- user_id que creo el asiento
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_je_society ON public.journal_entries(society_id);
CREATE INDEX idx_je_date ON public.journal_entries(entry_date);
CREATE INDEX idx_je_period ON public.journal_entries(period_year, period_month);

COMMENT ON TABLE public.journal_entries IS 'Libro Diario: asientos de doble partida. Cada asiento debe tener total_debe == total_haber.';

-- ============================================================
-- 12. TABLA: journal_lines (Detalle de asientos)
-- Lineas DEBE/HABER de cada asiento
-- ============================================================
CREATE TABLE public.journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,

    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    account_code TEXT NOT NULL,             -- Denormalizado para queries rapidos
    description TEXT,                       -- Detalle opcional por linea

    debe NUMERIC(15,2) NOT NULL DEFAULT 0,
    haber NUMERIC(15,2) NOT NULL DEFAULT 0,

    line_order INT NOT NULL DEFAULT 0,

    -- Una linea no puede tener DEBE y HABER al mismo tiempo
    CHECK (NOT (debe > 0 AND haber > 0)),
    -- Al menos uno debe ser mayor a 0
    CHECK (debe > 0 OR haber > 0)
);

CREATE INDEX idx_jl_entry ON public.journal_lines(journal_entry_id);
CREATE INDEX idx_jl_account ON public.journal_lines(account_id);
CREATE INDEX idx_jl_account_code ON public.journal_lines(account_code);

COMMENT ON TABLE public.journal_lines IS 'Lineas de detalle de cada asiento del Libro Diario. Partida doble: debe en una cuenta, haber en otra.';

-- ============================================================
-- 13. TABLA: accounting_periods
-- Control de periodos contables (apertura/cierre)
-- ============================================================
CREATE TABLE public.accounting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

    period_year INT NOT NULL,
    period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reopened')),

    closed_at TIMESTAMPTZ,
    closed_by TEXT,                          -- user_id que cerro el periodo
    reopened_at TIMESTAMPTZ,
    reopened_by TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(society_id, period_year, period_month)
);

CREATE INDEX idx_ap_society ON public.accounting_periods(society_id);

COMMENT ON TABLE public.accounting_periods IS 'Control de periodos contables. Un periodo cerrado bloquea edicion de asientos.';

-- ============================================================
-- 14. TABLA: generated_reports (Fase 6)
-- Registro de reportes PDF generados
-- ============================================================
CREATE TABLE public.generated_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

    report_type TEXT NOT NULL CHECK (report_type IN (
        'libro_diario', 'libro_mayor', 'balance_comprobacion',
        'estado_resultados', 'balance_general',
        'flujo_caja', 'resumen_ejecutivo', 'csv_export'
    )),
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    storage_path TEXT NOT NULL,             -- Ruta en Supabase Storage
    file_size_kb INT,

    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by TEXT
);

CREATE INDEX idx_reports_society ON public.generated_reports(society_id);

-- ============================================================
-- 15. RLS para tablas contables
-- ============================================================

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- chart_of_accounts: via sociedad
CREATE POLICY "coa_select" ON public.chart_of_accounts
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = chart_of_accounts.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "coa_insert" ON public.chart_of_accounts
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = chart_of_accounts.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "coa_update" ON public.chart_of_accounts
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = chart_of_accounts.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "coa_delete" ON public.chart_of_accounts
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = chart_of_accounts.society_id AND s.user_id = auth.uid())
    );

-- journal_entries: via sociedad
CREATE POLICY "je_select" ON public.journal_entries
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = journal_entries.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "je_insert" ON public.journal_entries
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = journal_entries.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "je_update" ON public.journal_entries
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = journal_entries.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "je_delete" ON public.journal_entries
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = journal_entries.society_id AND s.user_id = auth.uid())
    );

-- journal_lines: via entry -> society
CREATE POLICY "jl_select" ON public.journal_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.journal_entries je
            JOIN public.societies s ON s.id = je.society_id
            WHERE je.id = journal_lines.journal_entry_id AND s.user_id = auth.uid()
        )
    );
CREATE POLICY "jl_insert" ON public.journal_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.journal_entries je
            JOIN public.societies s ON s.id = je.society_id
            WHERE je.id = journal_lines.journal_entry_id AND s.user_id = auth.uid()
        )
    );
CREATE POLICY "jl_update" ON public.journal_lines
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.journal_entries je
            JOIN public.societies s ON s.id = je.society_id
            WHERE je.id = journal_lines.journal_entry_id AND s.user_id = auth.uid()
        )
    );
CREATE POLICY "jl_delete" ON public.journal_lines
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.journal_entries je
            JOIN public.societies s ON s.id = je.society_id
            WHERE je.id = journal_lines.journal_entry_id AND s.user_id = auth.uid()
        )
    );

-- accounting_periods: via sociedad
CREATE POLICY "ap_select" ON public.accounting_periods
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = accounting_periods.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "ap_insert" ON public.accounting_periods
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = accounting_periods.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "ap_update" ON public.accounting_periods
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = accounting_periods.society_id AND s.user_id = auth.uid())
    );

-- generated_reports: via sociedad
CREATE POLICY "reports_select" ON public.generated_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = generated_reports.society_id AND s.user_id = auth.uid())
    );
CREATE POLICY "reports_insert" ON public.generated_reports
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.societies s WHERE s.id = generated_reports.society_id AND s.user_id = auth.uid())
    );

-- Triggers updated_at para tablas contables
CREATE TRIGGER trg_coa_updated_at
    BEFORE UPDATE ON public.chart_of_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_je_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ap_updated_at
    BEFORE UPDATE ON public.accounting_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
