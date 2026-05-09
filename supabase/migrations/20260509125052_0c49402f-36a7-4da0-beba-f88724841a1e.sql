
-- Enums
DO $$ BEGIN
  CREATE TYPE public.template_strictness AS ENUM ('flexivel', 'rigoroso', 'molde');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_source AS ENUM ('upload', 'url', 'texto', 'transcricao', 'biblioteca');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- library_items extensions
ALTER TABLE public.library_items
  ADD COLUMN IF NOT EXISTS template_strictness public.template_strictness,
  ADD COLUMN IF NOT EXISTS ocr_status text,
  ADD COLUMN IF NOT EXISTS ocr_text text,
  ADD COLUMN IF NOT EXISTS source public.document_source NOT NULL DEFAULT 'upload';

-- workspace_context_items extensions
ALTER TABLE public.workspace_context_items
  ADD COLUMN IF NOT EXISTS library_item_id uuid,
  ADD COLUMN IF NOT EXISTS strictness public.template_strictness,
  ADD COLUMN IF NOT EXISTS ocr_required boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS workspace_context_items_ws_order_idx
  ON public.workspace_context_items(workspace_id, display_order);

-- user_integrations (BYOK Mike)
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'mike',
  endpoint text,
  api_key_encrypted text,
  model text,
  monthly_token_cap bigint,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_integrations own all"
  ON public.user_integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- token_usage telemetry
CREATE TABLE IF NOT EXISTS public.token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  piece_id uuid,
  workspace_id uuid,
  provider text NOT NULL,
  model text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_usd_estimate numeric(12,6),
  purpose text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "token_usage own select"
  ON public.token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "token_usage own insert"
  ON public.token_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS token_usage_user_month_idx
  ON public.token_usage(user_id, created_at DESC);

-- Storage policies for library-files subfolders
DO $$ BEGIN
  CREATE POLICY "library-files own read"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'library-files'
      AND auth.uid()::text = (storage.foldername(name))[2]
      AND (storage.foldername(name))[1] IN ('documentos', 'modelos', 'transcricoes')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "library-files own write"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'library-files'
      AND auth.uid()::text = (storage.foldername(name))[2]
      AND (storage.foldername(name))[1] IN ('documentos', 'modelos', 'transcricoes')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "library-files own update"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'library-files'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "library-files own delete"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'library-files'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
