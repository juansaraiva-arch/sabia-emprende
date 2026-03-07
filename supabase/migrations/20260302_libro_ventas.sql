-- ============================================================
-- LIBRO DE VENTAS — Tabla unificada de ventas
-- Migration: 2026-03-02
-- Modulo: Mi Director Financiero PTY
--
-- Recibe datos de los 3 segmentos de facturacion electronica
-- de Panama (Resolucion 201-6299 DGI):
--   Segmento 1: Manual / libro fiscal
--   Segmento 2: Equipo fiscal (importacion CSV DGI)
--   Segmento 3: PAC (facturacion electronica certificada)
-- ============================================================

-- ============================================================
-- 1. TABLA: ventas
-- Registro unificado de ventas, independiente del segmento
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relaciones principales
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),

    -- Datos de la transaccion
    fecha DATE NOT NULL,
    hora TIME,
    cliente TEXT NOT NULL DEFAULT 'Consumidor Final',
    concepto TEXT NOT NULL DEFAULT '',
    monto_base NUMERIC(14,2) NOT NULL DEFAULT 0,
    itbms NUMERIC(14,2) NOT NULL DEFAULT 0,
    monto_total NUMERIC(14,2) GENERATED ALWAYS AS (monto_base + itbms) STORED,

    -- Metodo de pago
    metodo_pago TEXT NOT NULL DEFAULT 'efectivo'
        CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'yappy', 'otro')),

    -- Origen del dato: manual (Segmento 1), importacion CSV DGI (Segmento 2), PAC (Segmento 3)
    origen TEXT NOT NULL DEFAULT 'manual'
        CHECK (origen IN ('manual', 'importacion_dgi', 'pac')),

    -- Estado de la venta
    anulada BOOLEAN DEFAULT false,

    -- ============================================================
    -- Campos especificos de importacion DGI (Segmento 2)
    -- Se llenan al importar el CSV del equipo fiscal
    -- ============================================================
    dgi_num_factura TEXT,               -- Numero de factura del equipo fiscal
    dgi_serie TEXT,                     -- Serie del equipo fiscal
    dgi_ruc_cliente TEXT,               -- RUC del cliente (si aplica)
    dgi_tipo_doc TEXT,                  -- Tipo de documento fiscal
    importacion_id UUID,               -- ID del lote de importacion

    -- ============================================================
    -- Campos especificos de PAC (Segmento 3)
    -- Se llenan al sincronizar con el proveedor autorizado
    -- ============================================================
    cufe TEXT UNIQUE,                   -- Codigo Unico de Facturacion Electronica
    xml_firmado TEXT,                   -- XML firmado por el PAC
    pdf_url TEXT,                       -- URL del PDF generado
    estado_pac TEXT,                    -- Estado en el PAC: pendiente, autorizada, rechazada

    -- Notas adicionales
    notas TEXT,

    -- Version de la aplicacion que genero el registro
    version_app TEXT DEFAULT '1.0.0',

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDICES para rendimiento
-- ============================================================

-- Consultas por sociedad (principal filtro en todas las vistas)
CREATE INDEX IF NOT EXISTS idx_ventas_society
    ON public.ventas(society_id);

-- Consultas por fecha (resumen diario, mensual, anual)
CREATE INDEX IF NOT EXISTS idx_ventas_fecha
    ON public.ventas(society_id, fecha DESC);

-- Consultas por usuario (mis ventas de hoy)
CREATE INDEX IF NOT EXISTS idx_ventas_user
    ON public.ventas(user_id, fecha DESC);

-- Filtro por origen (separar manual vs importacion vs PAC)
CREATE INDEX IF NOT EXISTS idx_ventas_origen
    ON public.ventas(society_id, origen);

-- Filtro por metodo de pago (reportes de conciliacion)
CREATE INDEX IF NOT EXISTS idx_ventas_metodo_pago
    ON public.ventas(society_id, metodo_pago);

-- Busqueda por CUFE (PAC — consulta unica)
CREATE INDEX IF NOT EXISTS idx_ventas_cufe
    ON public.ventas(cufe) WHERE cufe IS NOT NULL;

-- Filtro de ventas no anuladas (la mayoria de reportes excluye anuladas)
CREATE INDEX IF NOT EXISTS idx_ventas_activas
    ON public.ventas(society_id, fecha DESC) WHERE anulada = false;

-- Busqueda por lote de importacion DGI
CREATE INDEX IF NOT EXISTS idx_ventas_importacion
    ON public.ventas(importacion_id) WHERE importacion_id IS NOT NULL;

COMMENT ON TABLE public.ventas IS 'Libro de Ventas unificado. Recibe datos de los 3 segmentos DGI: manual, equipo fiscal (CSV) y PAC (facturacion electronica).';
COMMENT ON COLUMN public.ventas.monto_total IS 'Columna generada: monto_base + itbms. No se puede insertar/actualizar directamente.';
COMMENT ON COLUMN public.ventas.cufe IS 'Codigo Unico de Facturacion Electronica. Solo aplica a ventas del Segmento 3 (PAC).';
COMMENT ON COLUMN public.ventas.origen IS 'Segmento de origen: manual (Seg.1), importacion_dgi (Seg.2 equipo fiscal), pac (Seg.3 facturacion electronica).';

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- El usuario solo ve ventas de sus propias sociedades
-- ============================================================
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario ve ventas de sus sociedades
CREATE POLICY "ventas_select_own" ON public.ventas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = ventas.society_id
            AND s.user_id = auth.uid()
        )
    );

-- INSERT: usuario inserta ventas en sus sociedades
CREATE POLICY "ventas_insert_own" ON public.ventas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = ventas.society_id
            AND s.user_id = auth.uid()
        )
    );

-- UPDATE: usuario actualiza ventas de sus sociedades
CREATE POLICY "ventas_update_own" ON public.ventas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = ventas.society_id
            AND s.user_id = auth.uid()
        )
    );

-- DELETE: usuario elimina ventas de sus sociedades
CREATE POLICY "ventas_delete_own" ON public.ventas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = ventas.society_id
            AND s.user_id = auth.uid()
        )
    );

-- ============================================================
-- 4. TRIGGER: auto-actualizar updated_at
-- Reutiliza la funcion update_updated_at() del schema base
-- ============================================================
CREATE TRIGGER trg_ventas_updated_at
    BEFORE UPDATE ON public.ventas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. VISTA: ventas_resumen_mensual
-- Resumen agrupado por mes, origen y metodo de pago
-- Util para reportes gerenciales y conciliacion
-- ============================================================
CREATE OR REPLACE VIEW public.ventas_resumen_mensual AS
SELECT
    v.society_id,
    EXTRACT(YEAR FROM v.fecha)::INT AS anio,
    EXTRACT(MONTH FROM v.fecha)::INT AS mes,
    v.origen,
    v.metodo_pago,
    COUNT(*) FILTER (WHERE NOT v.anulada) AS total_facturas,
    COUNT(*) FILTER (WHERE v.anulada) AS facturas_anuladas,
    COALESCE(SUM(v.monto_base) FILTER (WHERE NOT v.anulada), 0) AS sum_monto_base,
    COALESCE(SUM(v.itbms) FILTER (WHERE NOT v.anulada), 0) AS sum_itbms,
    COALESCE(SUM(v.monto_total) FILTER (WHERE NOT v.anulada), 0) AS sum_monto_total
FROM public.ventas v
GROUP BY
    v.society_id,
    EXTRACT(YEAR FROM v.fecha),
    EXTRACT(MONTH FROM v.fecha),
    v.origen,
    v.metodo_pago;

COMMENT ON VIEW public.ventas_resumen_mensual IS 'Resumen mensual de ventas agrupado por origen y metodo de pago. Excluye ventas anuladas de los totales.';

-- ============================================================
-- 6. VISTA: ventas_hoy
-- Ventas del dia actual para el usuario autenticado
-- Util para el punto de venta y cierre diario
-- ============================================================
CREATE OR REPLACE VIEW public.ventas_hoy AS
SELECT
    v.id,
    v.society_id,
    v.user_id,
    v.fecha,
    v.hora,
    v.cliente,
    v.concepto,
    v.monto_base,
    v.itbms,
    v.monto_total,
    v.metodo_pago,
    v.origen,
    v.anulada,
    v.dgi_num_factura,
    v.cufe,
    v.estado_pac,
    v.notas,
    v.created_at
FROM public.ventas v
WHERE v.fecha = CURRENT_DATE;

COMMENT ON VIEW public.ventas_hoy IS 'Vista filtrada: ventas del dia actual. RLS se hereda de la tabla ventas.';
