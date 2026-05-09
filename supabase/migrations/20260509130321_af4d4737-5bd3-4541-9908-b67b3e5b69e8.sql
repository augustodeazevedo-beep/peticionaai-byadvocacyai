-- Wave 1: sharing + CNJ metadata
ALTER TABLE public.pieces 
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_slug text UNIQUE;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cnj_number text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_pieces_public_slug ON public.pieces(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_cnj ON public.projects(cnj_number) WHERE cnj_number IS NOT NULL;

-- Allow anonymous read of shared pieces by slug
CREATE POLICY "pieces public read by slug"
ON public.pieces FOR SELECT
USING (is_shared = true AND public_slug IS NOT NULL);