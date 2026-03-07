-- ============================================================
-- Tracking de Engagement y Churn — MDF PTY
-- GAP-5: Tablas para medir retencion y churn rate
-- Usa society_id (no empresa_id) para consistencia con el schema existente
-- ============================================================

-- Sesiones de usuario
CREATE TABLE IF NOT EXISTS user_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  society_id      UUID,
  iniciada_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizada_en   TIMESTAMPTZ,
  duracion_seg    INTEGER,
  modulos_visitados TEXT[],
  acciones_count  INTEGER DEFAULT 0,
  device_type     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Acciones individuales del usuario
CREATE TABLE IF NOT EXISTS user_acciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  society_id      UUID,
  tipo_accion     TEXT NOT NULL,
  modulo          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_date ON user_sessions(iniciada_en);
CREATE INDEX IF NOT EXISTS idx_user_acciones_user ON user_acciones(user_id);
CREATE INDEX IF NOT EXISTS idx_user_acciones_date ON user_acciones(created_at);

-- RLS: cada usuario solo ve sus propios datos
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_acciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve sus sesiones"
  ON user_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuario ve sus acciones"
  ON user_acciones FOR ALL TO authenticated
  USING (user_id = auth.uid());
