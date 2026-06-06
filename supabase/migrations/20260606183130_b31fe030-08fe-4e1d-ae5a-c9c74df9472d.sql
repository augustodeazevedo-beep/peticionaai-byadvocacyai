
-- Certificados A1 do usuário (PFX criptografado em repouso)
CREATE TABLE public.user_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  pfx_encrypted BYTEA NOT NULL,
  cipher_iv BYTEA NOT NULL,
  cipher_tag BYTEA NOT NULL,
  fingerprint TEXT,
  subject_cn TEXT,
  issuer_cn TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_certificates TO authenticated;
GRANT ALL ON public.user_certificates TO service_role;
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_certificates own all" ON public.user_certificates
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_certificates_set_updated_at BEFORE UPDATE ON public.user_certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Protocolos
CREATE TYPE public.protocolo_status AS ENUM (
  'rascunho','assinado','empacotado','protocolado','confirmado','erro'
);

CREATE TABLE public.protocolos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  piece_id UUID REFERENCES public.pieces(id) ON DELETE SET NULL,
  tribunal_code TEXT NOT NULL,
  sistema TEXT,
  orgao TEXT,
  numero_processo TEXT,
  classe TEXT,
  partes JSONB,
  status public.protocolo_status NOT NULL DEFAULT 'rascunho',
  signed_pdf_path TEXT,
  bundle_path TEXT,
  comprovante_path TEXT,
  protocolado_at TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocolos TO authenticated;
GRANT ALL ON public.protocolos TO service_role;
ALTER TABLE public.protocolos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protocolos own all" ON public.protocolos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER protocolos_set_updated_at BEFORE UPDATE ON public.protocolos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX protocolos_user_idx ON public.protocolos(user_id, created_at DESC);

-- Anexos do protocolo
CREATE TABLE public.protocolo_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id UUID NOT NULL REFERENCES public.protocolos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('library','drive','onedrive','local','upload','case_file')),
  source_ref TEXT,
  storage_path TEXT,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  sha256 TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocolo_attachments TO authenticated;
GRANT ALL ON public.protocolo_attachments TO service_role;
ALTER TABLE public.protocolo_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protocolo_attachments own all" ON public.protocolo_attachments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX protocolo_attachments_proto_idx ON public.protocolo_attachments(protocolo_id, ordem);
