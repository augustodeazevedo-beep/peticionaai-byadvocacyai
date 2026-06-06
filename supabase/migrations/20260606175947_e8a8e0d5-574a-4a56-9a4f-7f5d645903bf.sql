
-- 1) Public shared pieces view (definer, safe columns only)
DROP POLICY IF EXISTS "pieces public read shared safe" ON public.pieces;

CREATE OR REPLACE VIEW public.public_shared_pieces AS
SELECT id, title, piece_type, area, public_slug, content_html, content_text, updated_at
FROM public.pieces
WHERE is_shared = true AND public_slug IS NOT NULL;

GRANT SELECT ON public.public_shared_pieces TO anon, authenticated;

-- 2) Public shared VL versions view (definer, safe columns only)
DROP POLICY IF EXISTS "vl_versions public read shared safe" ON public.vl_versions;

CREATE OR REPLACE VIEW public.public_shared_vl_versions AS
SELECT v.id, v.piece_id, v.content, v.config, v.direction, v.created_at
FROM public.vl_versions v
JOIN public.pieces p ON p.id = v.piece_id
WHERE p.is_shared = true AND p.public_slug IS NOT NULL;

GRANT SELECT ON public.public_shared_vl_versions TO anon, authenticated;

-- 3) Prevent self-promotion to admin: restrictive policies on user_roles
CREATE POLICY "user_roles restrict insert to admin"
  ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles restrict update to admin"
  ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles restrict delete to admin"
  ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Allow users to read their own integration logs
CREATE POLICY "integration_logs select own"
  ON public.integration_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
