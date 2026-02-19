-- ============================================
-- Trigger: Auto-crear public.users al registrarse
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Funcion que crea un registro en public.users cuando se registra
-- un nuevo usuario en auth.users (via magic link, OAuth, etc.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'owner'
  );
  RETURN NEW;
END;
$$;

-- Trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
