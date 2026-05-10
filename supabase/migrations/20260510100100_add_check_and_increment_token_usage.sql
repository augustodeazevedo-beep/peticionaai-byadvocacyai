-- Função atômica para verificar e incrementar uso de tokens.
-- Resolve a race condition no cap mensal de tokens da edge function mike-generate:
-- o código anterior fazia SELECT seguido de UPDATE em operações separadas,
-- permitindo que requisições concorrentes ultrapassassem o limite.
--
-- Esta função usa FOR UPDATE para travar a linha antes de decidir se o cap foi atingido,
-- e então incrementa atomicamente com INSERT ... ON CONFLICT DO UPDATE.

CREATE OR REPLACE FUNCTION public.check_and_increment_token_usage(
  p_user_id UUID,
  p_month_year TEXT,
  p_tokens INT,
  p_monthly_cap INT
) RETURNS TABLE(allowed BOOLEAN, current_usage INT) AS $$
DECLARE
  v_current INT;
BEGIN
  -- Garantir que a linha existe antes de tentar o lock
  INSERT INTO public.token_usage (user_id, month_year, tokens_used)
  VALUES (p_user_id, p_month_year, 0)
  ON CONFLICT (user_id, month_year) DO NOTHING;

  -- Lock exclusivo na linha do usuário para o mês atual (evita race condition)
  SELECT COALESCE(tokens_used, 0) INTO v_current
  FROM public.token_usage
  WHERE user_id = p_user_id AND month_year = p_month_year
  FOR UPDATE;

  -- Verificar se o cap mensal já foi atingido
  IF v_current >= p_monthly_cap THEN
    RETURN QUERY SELECT FALSE, v_current;
    RETURN;
  END IF;

  -- Incrementar atomicamente
  UPDATE public.token_usage
  SET tokens_used = tokens_used + p_tokens
  WHERE user_id = p_user_id AND month_year = p_month_year;

  RETURN QUERY SELECT TRUE, v_current + p_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_and_increment_token_usage IS
  'Verifica e incrementa o uso de tokens de forma atômica, evitando race conditions no cap mensal.';
