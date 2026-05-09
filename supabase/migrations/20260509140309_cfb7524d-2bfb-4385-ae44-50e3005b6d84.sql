
INSERT INTO public.system_settings (key, value, is_secret, description) VALUES
  ('inventaria_outbound_url', 'https://inventariaai.lovable.app/api/public/peticione-import', false, 'URL do webhook do Inventaria.AI para receber peças geradas.'),
  ('inventaria_outbound_secret', NULL, true, 'Secret enviado no header x-webhook-secret ao Inventaria.AI.'),
  ('inventaria_inbound_secret', NULL, true, 'Secret esperado no header x-webhook-secret quando o Inventaria.AI envia contexto para Peticione.AI.'),
  ('inventaria_auto_send', 'false', false, 'Quando true, envia automaticamente os PDFs de Visual Law gerados ao Inventaria.AI.')
ON CONFLICT (key) DO NOTHING;
