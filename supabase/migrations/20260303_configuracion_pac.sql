-- ============================================================
-- CONFIGURACION PAC — Historial de segmentos + funcion de calculo
-- Migration: 2026-03-03
-- Modulo: Mi Director Financiero PTY
--
-- NO recrea pac_configuration (ya existe en 20260228_f2v10_tables.sql).
-- Agrega:
--   1. society_segmento_historial — registro historico de cambios de segmento
--   2. calcular_segmento_society() — funcion que determina segmento actual
--   3. society_estado_facturacion — vista consolidada con estado PAC
-- ============================================================

-- ============================================================
-- 1. TABLA: society_segmento_historial
-- Rastrea cambios de segmento de facturacion a lo largo del tiempo.
-- Segun Resolucion 201-6299 DGI, los umbrales son:
--   Segmento 1: ingresos < B/.36,000/ano Y < 100 docs/mes
--   Segmento 2: ingresos >= B/.36,000/ano O >= 100 docs/mes (equipo fiscal)
--   Segmento 3: ingresos >= B/.36,000/ano Y PAC activo (facturacion electronica)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.society_segmento_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relacion con la sociedad
    society_id UUID NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE,

    -- Fecha en que se realizo el calculo
    fecha_calculo DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Datos del calculo
    ingresos_anuales NUMERIC(14,2),     -- Suma de monto_total ultimos 12 meses
    facturas_mes INTEGER,               -- Cantidad de facturas del mes actual

    -- Segmento detectado: 1 (manual), 2 (equipo fiscal), 3 (PAC)
    segmento_detectado SMALLINT NOT NULL
        CHECK (segmento_detectado IN (1, 2, 3)),

    -- Indica si se notifico al usuario sobre el cambio de segmento
    alerta_enviada BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_segmento_historial_society
    ON public.society_segmento_historial(society_id, fecha_calculo DESC);

CREATE INDEX IF NOT EXISTS idx_segmento_historial_segmento
    ON public.society_segmento_historial(segmento_detectado);

COMMENT ON TABLE public.society_segmento_historial IS 'Historial de segmentos de facturacion por sociedad. Permite rastrear cuando una sociedad cruza umbrales DGI (Resolucion 201-6299).';
COMMENT ON COLUMN public.society_segmento_historial.segmento_detectado IS 'Segmento segun Resolucion 201-6299: 1=manual (<B/.36k, <100 docs), 2=equipo fiscal, 3=PAC electronico.';

-- ============================================================
-- 2. RLS: society_segmento_historial
-- El usuario solo ve el historial de sus propias sociedades
-- ============================================================
ALTER TABLE public.society_segmento_historial ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario ve historial de sus sociedades
CREATE POLICY "segmento_historial_select_own" ON public.society_segmento_historial
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = society_segmento_historial.society_id
            AND s.user_id = auth.uid()
        )
    );

-- INSERT: usuario inserta registros en sus sociedades
CREATE POLICY "segmento_historial_insert_own" ON public.society_segmento_historial
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = society_segmento_historial.society_id
            AND s.user_id = auth.uid()
        )
    );

-- UPDATE: usuario actualiza registros de sus sociedades (ej: marcar alerta_enviada)
CREATE POLICY "segmento_historial_update_own" ON public.society_segmento_historial
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = society_segmento_historial.society_id
            AND s.user_id = auth.uid()
        )
    );

-- DELETE: usuario elimina registros de sus sociedades
CREATE POLICY "segmento_historial_delete_own" ON public.society_segmento_historial
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.societies s
            WHERE s.id = society_segmento_historial.society_id
            AND s.user_id = auth.uid()
        )
    );

-- ============================================================
-- 3. FUNCION: calcular_segmento_society
-- Determina el segmento de facturacion de una sociedad
-- basandose en los datos reales de la tabla ventas.
--
-- Logica (Resolucion 201-6299 DGI):
--   - Suma monto_total de ventas NO anuladas, ultimos 12 meses
--   - Cuenta facturas NO anuladas del mes actual
--   - Si ingresos >= B/.36,000/ano O facturas >= 100/mes => Segmento 2
--   - Si ademas tiene PAC activo => Segmento 3
--   - Caso contrario => Segmento 1
-- ============================================================
CREATE OR REPLACE FUNCTION public.calcular_segmento_society(p_society_id UUID)
RETURNS SMALLINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_ingresos_12m NUMERIC(14,2);
    v_facturas_mes INTEGER;
    v_pac_activo BOOLEAN;
    v_segmento SMALLINT;
BEGIN
    -- 1. Sumar ingresos de los ultimos 12 meses (ventas no anuladas)
    SELECT COALESCE(SUM(monto_total), 0)
    INTO v_ingresos_12m
    FROM public.ventas
    WHERE society_id = p_society_id
      AND anulada = false
      AND fecha >= (CURRENT_DATE - INTERVAL '12 months');

    -- 2. Contar facturas del mes actual (no anuladas)
    SELECT COUNT(*)
    INTO v_facturas_mes
    FROM public.ventas
    WHERE society_id = p_society_id
      AND anulada = false
      AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE);

    -- 3. Verificar si tiene PAC activo (tabla pac_configuration de f2v10)
    SELECT COALESCE(is_active, false)
    INTO v_pac_activo
    FROM public.pac_configuration
    WHERE society_id = p_society_id;

    -- Si no existe registro en pac_configuration, PAC no esta activo
    IF NOT FOUND THEN
        v_pac_activo := false;
    END IF;

    -- 4. Determinar segmento segun umbrales de Resolucion 201-6299
    IF (v_ingresos_12m >= 36000 OR v_facturas_mes >= 100) THEN
        IF v_pac_activo THEN
            v_segmento := 3;    -- Segmento 3: PAC electronico
        ELSE
            v_segmento := 2;    -- Segmento 2: Equipo fiscal
        END IF;
    ELSE
        v_segmento := 1;        -- Segmento 1: Manual / libro fiscal
    END IF;

    RETURN v_segmento;
END;
$$;

COMMENT ON FUNCTION public.calcular_segmento_society(UUID) IS 'Calcula el segmento de facturacion DGI (1, 2 o 3) de una sociedad basado en ingresos 12 meses y volumen de facturas mensual. Resolucion 201-6299.';

-- ============================================================
-- 4. VISTA: society_estado_facturacion
-- Vista consolidada que muestra el estado de facturacion
-- de cada sociedad, combinando:
--   - Segmento actual (calculado en tiempo real)
--   - Estado del PAC (de pac_configuration existente)
--   - Metricas de ingresos y volumen
-- ============================================================
CREATE OR REPLACE VIEW public.society_estado_facturacion AS
SELECT
    s.id AS society_id,
    s.legal_name,
    s.entity_type,
    s.fiscal_regime,

    -- Segmento actual calculado en tiempo real
    public.calcular_segmento_society(s.id) AS segmento_actual,

    -- Estado del PAC (de tabla pac_configuration existente en f2v10)
    COALESCE(pc.is_active, false) AS pac_activo,
    COALESCE(pc.pac_provider, 'MANUAL') AS pac_proveedor,
    COALESCE(pc.pac_environment, 'SANDBOX') AS pac_ambiente,

    -- Ingresos de los ultimos 12 meses (ventas no anuladas)
    COALESCE(ventas_12m.total_ingresos, 0) AS ingresos_12m,

    -- Facturas del mes actual (no anuladas)
    COALESCE(ventas_mes.total_facturas, 0) AS facturas_mes_actual

FROM public.societies s

-- JOIN con pac_configuration (puede no existir registro)
LEFT JOIN public.pac_configuration pc
    ON pc.society_id = s.id

-- Subquery: ingresos ultimos 12 meses
LEFT JOIN LATERAL (
    SELECT SUM(v.monto_total) AS total_ingresos
    FROM public.ventas v
    WHERE v.society_id = s.id
      AND v.anulada = false
      AND v.fecha >= (CURRENT_DATE - INTERVAL '12 months')
) ventas_12m ON true

-- Subquery: facturas del mes actual
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_facturas
    FROM public.ventas v
    WHERE v.society_id = s.id
      AND v.anulada = false
      AND EXTRACT(YEAR FROM v.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM v.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
) ventas_mes ON true;

COMMENT ON VIEW public.society_estado_facturacion IS 'Vista consolidada del estado de facturacion por sociedad: segmento DGI actual, estado PAC, ingresos 12 meses y facturas del mes. RLS se hereda de las tablas subyacentes.';
