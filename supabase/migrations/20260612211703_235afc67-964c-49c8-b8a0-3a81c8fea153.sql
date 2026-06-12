
CREATE TABLE public.jurisprudencia_buscas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  court text,
  page integer NOT NULL DEFAULT 0,
  total_results integer,
  pub_from date,
  pub_to date,
  trial_from date,
  trial_to date,
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurisprudencia_buscas TO authenticated;
GRANT ALL ON public.jurisprudencia_buscas TO service_role;
ALTER TABLE public.jurisprudencia_buscas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jurisprudencia_buscas own all" ON public.jurisprudencia_buscas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX jurisprudencia_buscas_user_executed_idx
  ON public.jurisprudencia_buscas (user_id, executed_at DESC);

CREATE TABLE public.jurisprudencia_selecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  piece_id uuid REFERENCES public.pieces(id) ON DELETE SET NULL,
  decision_id text NOT NULL,
  court text NOT NULL,
  process_number text NOT NULL,
  judging_body text,
  rapporteur text,
  judgment_date text,
  publication_date text,
  syllabus text NOT NULL,
  url text,
  decision_type text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurisprudencia_selecoes TO authenticated;
GRANT ALL ON public.jurisprudencia_selecoes TO service_role;
ALTER TABLE public.jurisprudencia_selecoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jurisprudencia_selecoes own all" ON public.jurisprudencia_selecoes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX jurisprudencia_selecoes_user_idx
  ON public.jurisprudencia_selecoes (user_id, created_at DESC);
CREATE INDEX jurisprudencia_selecoes_piece_idx
  ON public.jurisprudencia_selecoes (piece_id);
CREATE TRIGGER jurisprudencia_selecoes_set_updated_at
  BEFORE UPDATE ON public.jurisprudencia_selecoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
