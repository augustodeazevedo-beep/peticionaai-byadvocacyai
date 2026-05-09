ALTER TABLE public.librarians
  ADD COLUMN IF NOT EXISTS practice_area text,
  ADD COLUMN IF NOT EXISTS piece_type text,
  ADD COLUMN IF NOT EXISTS reasoning_prompt text,
  ADD COLUMN IF NOT EXISTS formatting_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS visual_law_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS model_piece_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];