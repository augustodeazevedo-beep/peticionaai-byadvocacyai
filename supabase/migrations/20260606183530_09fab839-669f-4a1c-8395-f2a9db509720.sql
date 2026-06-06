
CREATE TABLE public.user_encryption_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salt BYTEA NOT NULL,
  verifier_hash TEXT NOT NULL,
  verifier_salt BYTEA NOT NULL,
  kdf_iterations INTEGER NOT NULL DEFAULT 210000,
  hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_encryption_keys TO authenticated;
GRANT ALL ON public.user_encryption_keys TO service_role;
ALTER TABLE public.user_encryption_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_encryption_keys own all" ON public.user_encryption_keys
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_encryption_keys_set_updated_at BEFORE UPDATE ON public.user_encryption_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
