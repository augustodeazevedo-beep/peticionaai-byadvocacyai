
-- Recreate views with security_invoker=on (run with caller's privileges)
DROP VIEW IF EXISTS public.public_shared_pieces;
CREATE VIEW public.public_shared_pieces
  WITH (security_invoker = on) AS
SELECT id, title, piece_type, area, public_slug, content_html, content_text, updated_at
FROM public.pieces
WHERE is_shared = true AND public_slug IS NOT NULL;

DROP VIEW IF EXISTS public.public_shared_vl_versions;
CREATE VIEW public.public_shared_vl_versions
  WITH (security_invoker = on) AS
SELECT v.id, v.piece_id, v.content, v.config, v.direction, v.created_at
FROM public.vl_versions v
JOIN public.pieces p ON p.id = v.piece_id
WHERE p.is_shared = true AND p.public_slug IS NOT NULL;

GRANT SELECT ON public.public_shared_pieces TO anon, authenticated;
GRANT SELECT ON public.public_shared_vl_versions TO anon, authenticated;

-- Re-add row-level access for anon on shared rows, but ONLY on safe columns via column GRANTs.
CREATE POLICY "pieces anon read shared safe"
  ON public.pieces FOR SELECT TO anon
  USING (is_shared = true AND public_slug IS NOT NULL);

CREATE POLICY "vl_versions anon read shared safe"
  ON public.vl_versions FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.pieces p
    WHERE p.id = vl_versions.piece_id
      AND p.is_shared = true
      AND p.public_slug IS NOT NULL
  ));

-- Restrict anon column access on base tables to safe columns only.
REVOKE SELECT ON public.pieces FROM anon;
GRANT SELECT (id, title, piece_type, area, public_slug, content_html, content_text, updated_at, is_shared)
  ON public.pieces TO anon;

REVOKE SELECT ON public.vl_versions FROM anon;
GRANT SELECT (id, piece_id, content, config, direction, created_at)
  ON public.vl_versions TO anon;
