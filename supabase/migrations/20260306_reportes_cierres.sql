-- Reportes y Cierres Mensuales — MDF PTY
CREATE TABLE IF NOT EXISTS reportes_cierres (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id      UUID REFERENCES public.societies(id) ON DELETE CASCADE,
  user_id         UUID,
  periodo_anio    SMALLINT NOT NULL,
  periodo_mes     SMALLINT NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  snapshot_cascada   JSONB,
  snapshot_ventas    JSONB,
  snapshot_nomina    JSONB,
  snapshot_alertas   JSONB,
  snapshot_cb_insights JSONB,
  total_ingresos  NUMERIC(14,2),
  utilidad_neta   NUMERIC(14,2),
  total_empleados INTEGER,
  total_facturas  INTEGER,
  estado          TEXT DEFAULT 'borrador' CHECK (estado IN ('borrador', 'cerrado')),
  cerrado_en      TIMESTAMPTZ,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(society_id, periodo_anio, periodo_mes)
);

CREATE OR REPLACE FUNCTION proteger_cierre() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado = 'cerrado' THEN
    RAISE EXCEPTION 'No se puede modificar un periodo ya cerrado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_proteger_cierre
  BEFORE UPDATE ON reportes_cierres
  FOR EACH ROW EXECUTE FUNCTION proteger_cierre();

ALTER TABLE reportes_cierres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve sus reportes" ON reportes_cierres FOR ALL TO authenticated USING (user_id = auth.uid());
