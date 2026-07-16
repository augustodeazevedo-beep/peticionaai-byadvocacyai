CREATE TABLE public.piece_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id uuid NOT NULL REFERENCES public.pieces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content_hash text NOT NULL,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  score int NOT NULL DEFAULT 100,
  model text,
  stages jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX piece_audits_piece_created_idx ON public.piece_audits (piece_id, created_at DESC);
CREATE INDEX piece_audits_user_idx ON public.piece_audits (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.piece_audits TO authenticated;
GRANT ALL ON public.piece_audits TO service_role;

ALTER TABLE public.piece_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own audits select" ON public.piece_audits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own audits insert" ON public.piece_audits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own audits update" ON public.piece_audits FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own audits delete" ON public.piece_audits FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER piece_audits_set_updated_at BEFORE UPDATE ON public.piece_audits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ai_governance_prefs ADD COLUMN IF NOT EXISTS block_export_on_critical boolean NOT NULL DEFAULT false;