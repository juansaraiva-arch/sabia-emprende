-- ============================================
-- GAP-4: Proyecciones Financieras 12 Meses
-- Mi Director Financiero PTY
-- 2026-03-04
-- ============================================

-- Proyecciones financieras editables por mes y empresa
CREATE TABLE IF NOT EXISTS forecast_proyecciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id      UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.users(id),
  anio            SMALLINT NOT NULL,
  mes             SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  revenue_auto    NUMERIC(14,2),
  revenue_manual  NUMERIC(14,2),
  revenue_final   NUMERIC(14,2) GENERATED ALWAYS AS (COALESCE(revenue_manual, revenue_auto)) STORED,
  cogs_pct        NUMERIC(5,2),
  opex_pct        NUMERIC(5,2),
  nomina_pct      NUMERIC(5,2),
  es_editado      BOOLEAN DEFAULT false,
  metodo_calculo  TEXT DEFAULT 'regresion_lineal',
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(society_id, anio, mes)
);

-- Supuestos base por empresa
CREATE TABLE IF NOT EXISTS forecast_supuestos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id      UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  tasa_crecimiento_mensual NUMERIC(5,2) DEFAULT 5.0,
  cogs_pct_base   NUMERIC(5,2),
  opex_pct_base   NUMERIC(5,2),
  nomina_pct_base NUMERIC(5,2),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(society_id)
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE forecast_proyecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_supuestos ENABLE ROW LEVEL SECURITY;

-- Politica: usuario solo ve/edita sus propias proyecciones
CREATE POLICY "Usuario ve su forecast"
  ON forecast_proyecciones
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Politica: usuario solo ve/edita supuestos de sus sociedades
CREATE POLICY "Usuario ve sus supuestos"
  ON forecast_supuestos
  FOR ALL
  TO authenticated
  USING (
    society_id IN (
      SELECT id FROM public.societies WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- INDICES para performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_forecast_proy_society_period
  ON forecast_proyecciones(society_id, anio, mes);

CREATE INDEX IF NOT EXISTS idx_forecast_supuestos_society
  ON forecast_supuestos(society_id);
