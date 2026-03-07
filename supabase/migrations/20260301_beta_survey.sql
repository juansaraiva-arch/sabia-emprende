-- ============================================================
-- TABLA PRINCIPAL DE RESPUESTAS DEL CUESTIONARIO BETA
-- Mi Director Financiero PTY — v1.0.0
-- ============================================================

CREATE TABLE IF NOT EXISTS beta_survey_responses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Datos del evaluador (opcionales)
  nombre                    TEXT,
  empresa                   TEXT,
  perfil                    TEXT,            -- Tipo de usuario

  -- BLOQUE 1: Primera Impresión
  impresion_general         SMALLINT CHECK (impresion_general BETWEEN 1 AND 5),
  claridad_hub              SMALLINT CHECK (claridad_hub BETWEEN 1 AND 10),
  atractivo_visual          SMALLINT CHECK (atractivo_visual BETWEEN 1 AND 5),

  -- BLOQUE 2: Mi Contabilidad
  facilidad_diagnostico     SMALLINT CHECK (facilidad_diagnostico BETWEEN 1 AND 10),
  utilidad_rrhh             SMALLINT CHECK (utilidad_rrhh BETWEEN 1 AND 10),
  inventario_claro          SMALLINT CHECK (inventario_claro BETWEEN 1 AND 10),
  espejo_dgi                TEXT,

  -- BLOQUE 3: Mis Finanzas
  cascada_util              SMALLINT CHECK (cascada_util BETWEEN 1 AND 10),
  simulador_valor           SMALLINT CHECK (simulador_valor BETWEEN 1 AND 10),
  lab_precios               SMALLINT CHECK (lab_precios BETWEEN 1 AND 5),
  herramienta_mas_util      TEXT,

  -- BLOQUE 4: Doc Legales
  vigilante_util            SMALLINT CHECK (vigilante_util BETWEEN 1 AND 10),
  boveda_confianza          SMALLINT CHECK (boveda_confianza BETWEEN 1 AND 10),
  ley186_relevante          TEXT,

  -- BLOQUE 5: Asistente IA
  asistente_util            SMALLINT CHECK (asistente_util BETWEEN 1 AND 5),
  asistente_respuestas      SMALLINT CHECK (asistente_respuestas BETWEEN 1 AND 10),
  asistente_usaria          TEXT,

  -- BLOQUE 6: Experiencia General
  velocidad                 SMALLINT CHECK (velocidad BETWEEN 1 AND 10),
  mobile                    TEXT,
  mobile_experiencia        SMALLINT CHECK (mobile_experiencia BETWEEN 1 AND 10),
  recomendaria              SMALLINT CHECK (recomendaria BETWEEN 0 AND 10),  -- NPS

  -- BLOQUE 7: Tu Voz (abiertos)
  mejor_de_la_app           TEXT,
  mejorar                   TEXT,
  problema_encontrado       TEXT,

  -- Metadatos técnicos
  tiempo_completado_seg     INTEGER,         -- Segundos que tardó en completar
  dispositivo               TEXT,            -- user agent simplificado
  version_app               TEXT DEFAULT '1.0.0',
  completado                BOOLEAN DEFAULT true
);

-- Índices para las consultas estadísticas más frecuentes
CREATE INDEX idx_beta_survey_created_at    ON beta_survey_responses (created_at);
CREATE INDEX idx_beta_survey_recomendaria  ON beta_survey_responses (recomendaria);
CREATE INDEX idx_beta_survey_perfil        ON beta_survey_responses (perfil);

-- Row Level Security: solo el admin puede leer; cualquiera puede insertar
ALTER TABLE beta_survey_responses ENABLE ROW LEVEL SECURITY;

-- Política de inserción pública (cualquier visitante puede enviar)
CREATE POLICY "Insercion publica de respuestas"
  ON beta_survey_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política de lectura solo para usuarios autenticados (admin)
CREATE POLICY "Solo admin puede leer respuestas"
  ON beta_survey_responses FOR SELECT
  TO authenticated
  USING (true);

-- Vista de estadísticas agregadas (para el dashboard)
CREATE OR REPLACE VIEW beta_survey_stats AS
SELECT
  COUNT(*)                                          AS total_respuestas,
  ROUND(AVG(impresion_general)::NUMERIC, 2)         AS avg_impresion_general,
  ROUND(AVG(claridad_hub)::NUMERIC, 2)              AS avg_claridad_hub,
  ROUND(AVG(atractivo_visual)::NUMERIC, 2)          AS avg_atractivo_visual,
  ROUND(AVG(facilidad_diagnostico)::NUMERIC, 2)     AS avg_facilidad_diagnostico,
  ROUND(AVG(utilidad_rrhh)::NUMERIC, 2)             AS avg_utilidad_rrhh,
  ROUND(AVG(inventario_claro)::NUMERIC, 2)          AS avg_inventario_claro,
  ROUND(AVG(cascada_util)::NUMERIC, 2)              AS avg_cascada_util,
  ROUND(AVG(simulador_valor)::NUMERIC, 2)           AS avg_simulador_valor,
  ROUND(AVG(lab_precios)::NUMERIC, 2)               AS avg_lab_precios,
  ROUND(AVG(vigilante_util)::NUMERIC, 2)            AS avg_vigilante_util,
  ROUND(AVG(boveda_confianza)::NUMERIC, 2)          AS avg_boveda_confianza,
  ROUND(AVG(asistente_util)::NUMERIC, 2)            AS avg_asistente_util,
  ROUND(AVG(asistente_respuestas)::NUMERIC, 2)      AS avg_asistente_respuestas,
  ROUND(AVG(velocidad)::NUMERIC, 2)                 AS avg_velocidad,
  ROUND(AVG(mobile_experiencia)::NUMERIC, 2)        AS avg_mobile_experiencia,
  ROUND(AVG(recomendaria)::NUMERIC, 2)              AS avg_nps,
  -- NPS segmentado
  COUNT(*) FILTER (WHERE recomendaria >= 9)         AS nps_promotores,
  COUNT(*) FILTER (WHERE recomendaria BETWEEN 7 AND 8) AS nps_pasivos,
  COUNT(*) FILTER (WHERE recomendaria <= 6)         AS nps_detractores,
  -- Score NPS real = %promotores - %detractores
  ROUND(
    (COUNT(*) FILTER (WHERE recomendaria >= 9)::NUMERIC
     - COUNT(*) FILTER (WHERE recomendaria <= 6)::NUMERIC)
    / NULLIF(COUNT(*), 0)::NUMERIC * 100
  , 1) AS nps_score
FROM beta_survey_responses;
