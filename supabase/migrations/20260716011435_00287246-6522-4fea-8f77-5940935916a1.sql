
CREATE TABLE public.detectai_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text,
  scope text NOT NULL CHECK (scope IN ('text','regex','citation')),
  pattern text NOT NULL CHECK (length(pattern) BETWEEN 1 AND 500),
  category text CHECK (category IN ('prompt_injection','jailbreak','fake_citation','fake_jurisprudence','hallucination','pii_leak')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX detectai_whitelist_user_client_idx
  ON public.detectai_whitelist (user_id, lower(coalesce(client_name,'')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.detectai_whitelist TO authenticated;
GRANT ALL ON public.detectai_whitelist TO service_role;

ALTER TABLE public.detectai_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own whitelist select" ON public.detectai_whitelist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own whitelist insert" ON public.detectai_whitelist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own whitelist update" ON public.detectai_whitelist
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own whitelist delete" ON public.detectai_whitelist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER detectai_whitelist_set_updated_at
  BEFORE UPDATE ON public.detectai_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
