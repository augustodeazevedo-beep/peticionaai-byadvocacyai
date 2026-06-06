CREATE TABLE public.ai_governance_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  defensive_mode boolean NOT NULL DEFAULT true,
  human_in_loop boolean NOT NULL DEFAULT false,
  temporary_chats boolean NOT NULL DEFAULT false,
  ai_disclosure_enabled boolean NOT NULL DEFAULT true,
  ai_disclosure_text text NOT NULL DEFAULT 'Este documento foi produzido com auxílio de Inteligência Artificial e revisado pelo advogado responsável.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_governance_prefs TO authenticated;
GRANT ALL ON public.ai_governance_prefs TO service_role;

ALTER TABLE public.ai_governance_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prefs" ON public.ai_governance_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER ai_gov_set_updated_at
  BEFORE UPDATE ON public.ai_governance_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();