-- Adicionar campos estendidos à tabela librarians
-- Esses campos são usados pelo frontend mas não estavam presentes na migration original.
ALTER TABLE public.librarians
  ADD COLUMN IF NOT EXISTS practice_area TEXT,
  ADD COLUMN IF NOT EXISTS piece_type TEXT,
  ADD COLUMN IF NOT EXISTS reasoning_prompt TEXT,
  ADD COLUMN IF NOT EXISTS formatting_rules TEXT,
  ADD COLUMN IF NOT EXISTS visual_law_defaults JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS model_piece_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN public.librarians.practice_area IS 'Área do direito (civil, trabalhista, etc.)';
COMMENT ON COLUMN public.librarians.piece_type IS 'Tipo de peça principal do bibliotecário';
COMMENT ON COLUMN public.librarians.reasoning_prompt IS 'Prompt de raciocínio jurídico personalizado';
COMMENT ON COLUMN public.librarians.formatting_rules IS 'Regras de formatação específicas';
COMMENT ON COLUMN public.librarians.visual_law_defaults IS 'Configurações padrão de visual law';
COMMENT ON COLUMN public.librarians.model_piece_ids IS 'IDs de peças modelo para referência';
