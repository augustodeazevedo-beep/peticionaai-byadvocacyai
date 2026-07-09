-- Fase 1: GRANTs
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

GRANT SELECT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.useful_links TO authenticated;
GRANT ALL ON public.useful_links TO service_role;

-- Fase 2: RLS limpa e específica

-- user_roles
DROP POLICY IF EXISTS "user_roles admin all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles select own" ON public.user_roles;

CREATE POLICY "user_roles select own or admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- (INSERT/UPDATE/DELETE admin policies já existem como RESTRICTIVE — mantidas)

-- system_settings
DROP POLICY IF EXISTS "system_settings admin all" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings read non-secret" ON public.system_settings;

CREATE POLICY "system_settings select"
  ON public.system_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR is_secret = false);

CREATE POLICY "system_settings insert admin"
  ON public.system_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "system_settings update admin"
  ON public.system_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "system_settings delete admin"
  ON public.system_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- integration_logs
DROP POLICY IF EXISTS "integration_logs admin all" ON public.integration_logs;
DROP POLICY IF EXISTS "integration_logs select own" ON public.integration_logs;

CREATE POLICY "integration_logs select own or admin"
  ON public.integration_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "integration_logs insert admin"
  ON public.integration_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "integration_logs update admin"
  ON public.integration_logs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "integration_logs delete admin"
  ON public.integration_logs FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- useful_links
DROP POLICY IF EXISTS "useful_links admin all" ON public.useful_links;
DROP POLICY IF EXISTS "useful_links read auth" ON public.useful_links;

CREATE POLICY "useful_links select"
  ON public.useful_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR is_active = true);

CREATE POLICY "useful_links insert admin"
  ON public.useful_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "useful_links update admin"
  ON public.useful_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "useful_links delete admin"
  ON public.useful_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));