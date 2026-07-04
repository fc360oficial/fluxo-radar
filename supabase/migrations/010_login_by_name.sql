-- Função pública que retorna email pelo nome do usuário (case-insensitive)
-- Usada na tela de login para permitir autenticação por nome em vez de email
CREATE OR REPLACE FUNCTION public.get_email_by_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM profiles
  WHERE lower(trim(name)) = lower(trim(p_name))
  LIMIT 1;

  RETURN v_email;
END;
$$;

-- Permite que usuários não autenticados chamem esta função
GRANT EXECUTE ON FUNCTION public.get_email_by_name(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_name(TEXT) TO authenticated;
