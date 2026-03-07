-- Progreso de onboarding contextual — MDF PTY
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  society_id      UUID,
  paso_completado TEXT NOT NULL,
  completado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, paso_completado)
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario ve su progreso" ON onboarding_progress FOR ALL TO authenticated USING (user_id = auth.uid());
