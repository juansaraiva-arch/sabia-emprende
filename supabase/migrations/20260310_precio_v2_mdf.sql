-- Mi Precio Justo v2 — Migracion de base de datos MDF PTY
-- Ejecutar en el Supabase de MDF PTY (NO en el de MAF PTY — son instancias separadas)

-- ============================================================
-- Tabla productos: agregar campos para v2
-- ============================================================

-- Tipo: producto o servicio
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'producto'
  CHECK (tipo IN ('producto', 'servicio'));

-- Materiales v2 con unidades de medida
ALTER TABLE productos ADD COLUMN IF NOT EXISTS materiales_v2 JSONB DEFAULT '[]';
-- materiales_v2: [{nombre, costoCompra, cantidadCompra, unidadCompraId, cantidadUso, unidadUsoId, costoCalculado}]

-- Tiempo y tarifa
ALTER TABLE productos ADD COLUMN IF NOT EXISTS duracion_minutos INTEGER DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tarifa_hora NUMERIC(10,2) DEFAULT 3.00;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS fuente_tarifa TEXT DEFAULT 'manual'
  CHECK (fuente_tarifa IN ('manual', 'empleado', 'promedio'));

-- Empleado asignado (referencia a payroll_entries)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS empleado_id UUID REFERENCES payroll_entries(id) ON DELETE SET NULL;

-- Servicios por mes (para tipo servicio)
ALTER TABLE productos ADD COLUMN IF NOT EXISTS servicios_por_mes INTEGER DEFAULT 0;

-- ============================================================
-- Tabla gastos_fijos: agregar campos para tipicos
-- ============================================================

ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'otro';
ALTER TABLE gastos_fijos ADD COLUMN IF NOT EXISTS gasto_fijo_id TEXT;
-- gasto_fijo_id referencia al id del GASTOS_FIJOS_TIPICOS (ej: 'electricidad', 'alquiler')

-- ============================================================
-- payroll_entries: asegurar campo is_active
-- ============================================================

ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================
-- RLS: las politicas existentes deben cubrir los nuevos campos automaticamente
-- ya que se filtran por society_id
-- ============================================================
