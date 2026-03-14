-- ============================================================
-- Expand entity_type and fiscal_regime CHECK constraints
-- Add onboarding_flag column to societies
-- ============================================================

-- Expandir entity_type para incluir EIRL, persona_natural, fundacion
ALTER TABLE public.societies DROP CONSTRAINT IF EXISTS societies_entity_type_check;
ALTER TABLE public.societies ADD CONSTRAINT societies_entity_type_check
  CHECK (entity_type IN ('SA','SRL','SE','EIRL','persona_natural','fundacion','otro'));

-- Expandir fiscal_regime para incluir regimenes onboarding
ALTER TABLE public.societies DROP CONSTRAINT IF EXISTS societies_fiscal_regime_check;
ALTER TABLE public.societies ADD CONSTRAINT societies_fiscal_regime_check
  CHECK (fiscal_regime IN ('general','simplified','se_exempt','renta_estimada','renta_declarada','regimen_especial'));

-- Agregar onboarding_flag para routing post-onboarding
ALTER TABLE public.societies ADD COLUMN IF NOT EXISTS onboarding_flag TEXT DEFAULT NULL;
