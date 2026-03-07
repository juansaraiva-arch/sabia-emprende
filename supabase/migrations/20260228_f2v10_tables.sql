-- ============================================================
-- F2 V10 — Tablas para borrador automatico + facturacion electronica
-- Migration: 2026-02-28
-- ============================================================

-- 1. SOCIOS / DIRECTIVOS de la sociedad
CREATE TABLE IF NOT EXISTS public.society_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  id_number VARCHAR(50),
  id_type VARCHAR(20) DEFAULT 'CEDULA',
  role VARCHAR(50) NOT NULL CHECK (role IN ('SOCIO', 'REPRESENTANTE_LEGAL', 'DIRECTOR', 'ADMINISTRADOR')),
  ownership_pct DECIMAL(5,2),
  email VARCHAR(255),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ownership_pct_range
    CHECK (ownership_pct IS NULL OR (ownership_pct >= 0 AND ownership_pct <= 100))
);

CREATE INDEX IF NOT EXISTS idx_society_members_society
  ON public.society_members(society_id);

COMMENT ON TABLE public.society_members IS 'Socios, directivos y representante legal de cada sociedad. Usado por F2 V10 seccion distribucion de utilidades.';

-- 2. DIRECCION FISCAL en societies
ALTER TABLE public.societies
  ADD COLUMN IF NOT EXISTS fiscal_address TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_province VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fiscal_district VARCHAR(50);

-- 3. FACTURAS ELECTRONICAS
CREATE TABLE IF NOT EXISTS public.electronic_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Identificacion del documento
  document_type VARCHAR(2) NOT NULL DEFAULT '01',
  internal_number VARCHAR(50),
  dgi_number VARCHAR(50),
  cufe VARCHAR(100) UNIQUE,

  -- Receptor
  receptor_type VARCHAR(20) DEFAULT 'CONSUMIDOR_FINAL',
  receptor_ruc VARCHAR(50),
  receptor_name VARCHAR(255),
  receptor_email VARCHAR(255),

  -- Montos
  subtotal_taxable DECIMAL(12,2) DEFAULT 0,
  subtotal_exempt DECIMAL(12,2) DEFAULT 0,
  total_discounts DECIMAL(12,2) DEFAULT 0,
  total_itbms DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,

  -- Estado
  status VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
    CHECK (status IN ('MANUAL', 'DRAFT', 'SENT_TO_PAC', 'AUTHORIZED', 'CANCELLED')),

  -- Trazabilidad PAC
  pac_provider VARCHAR(50) DEFAULT 'MANUAL',
  pac_transaction_id VARCHAR(100),
  issue_date TIMESTAMPTZ NOT NULL,
  authorization_date TIMESTAMPTZ,
  cancellation_date TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Referencia (notas credito/debito)
  reference_cufe VARCHAR(100),
  reference_document_type VARCHAR(2),

  -- Documento completo (futuro PAC)
  signed_xml TEXT,
  pdf_url TEXT,
  full_data JSONB,

  -- Origen
  origin VARCHAR(20) DEFAULT 'MANUAL_INPUT'
    CHECK (origin IN ('MANUAL_INPUT', 'PAC_SYNC', 'IMPORT')),
  synced_with_pac BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_einvoices_society_period
  ON public.electronic_invoices(society_id, issue_date, status);
CREATE INDEX IF NOT EXISTS idx_einvoices_cufe
  ON public.electronic_invoices(cufe) WHERE cufe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_einvoices_type_status
  ON public.electronic_invoices(document_type, status);

COMMENT ON TABLE public.electronic_invoices IS 'Facturas electronicas emitidas. Hoy: entrada manual. Futuro: sincronizado con PAC certificado DGI.';

-- 4. ITEMS DE FACTURA
CREATE TABLE IF NOT EXISTS public.electronic_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.electronic_invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  code VARCHAR(50),
  description TEXT NOT NULL,
  quantity DECIMAL(12,4) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(12,2) DEFAULT 0,
  is_exempt_itbms BOOLEAN DEFAULT FALSE,
  itbms_rate DECIMAL(5,2) DEFAULT 0,
  itbms_amount DECIMAL(12,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_einvoice_items_invoice
  ON public.electronic_invoice_items(invoice_id);

-- 5. CONFIGURACION PAC (vacia hoy, lista para el futuro)
CREATE TABLE IF NOT EXISTS public.pac_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE UNIQUE,
  pac_provider VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
  pac_environment VARCHAR(20) DEFAULT 'SANDBOX',
  pac_api_key_encrypted TEXT,
  pac_api_secret_encrypted TEXT,
  pac_base_url TEXT,
  pac_ruc_emisor VARCHAR(50),
  pac_webhook_id VARCHAR(100),
  cert_expiration TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT FALSE,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pac_configuration IS 'Configuracion del PAC (Proveedor Autorizado Calificado) por sociedad. Inactiva por defecto.';

-- 6. LOG DE SINCRONIZACION PAC
CREATE TABLE IF NOT EXISTS public.pac_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  society_id UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  sync_type VARCHAR(50),
  pac_provider VARCHAR(50),
  processed_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. BORRADORES DE DECLARACION
CREATE TABLE IF NOT EXISTS public.borradores_declaracion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
  formulario VARCHAR(10) NOT NULL,
  version VARCHAR(10) NOT NULL,
  periodo_fiscal INTEGER NOT NULL,
  datos_borrador JSONB NOT NULL,
  completitud INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'revisado', 'presentado')),
  notas_usuario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borradores_user_periodo
  ON public.borradores_declaracion(user_id, periodo_fiscal, formulario);

COMMENT ON TABLE public.borradores_declaracion IS 'Borradores de declaracion de renta generados automaticamente. F2 V10 para S.E.P.';
