-- ============================================================
-- Função para registro de nova empresa (chamada após signUp)
-- SECURITY DEFINER: cria company + profile em uma transação
-- usando auth.uid() do usuário recém-criado
-- ============================================================

CREATE OR REPLACE FUNCTION register_company(
  p_company_name TEXT,
  p_user_name    TEXT,
  p_email        TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_company_id UUID;
BEGIN
  -- Cria a empresa em modo trial
  INSERT INTO companies (name, email, plan, status, settings)
  VALUES (
    trim(p_company_name),
    lower(trim(p_email)),
    'trial',
    'active',
    '{}'::jsonb
  )
  RETURNING id INTO v_company_id;

  -- Cria o perfil do admin vinculado à empresa
  INSERT INTO profiles (id, company_id, name, email, role, status)
  VALUES (
    auth.uid(),
    v_company_id,
    trim(p_user_name),
    lower(trim(p_email)),
    'admin',
    'active'
  );

  RETURN jsonb_build_object(
    'company_id', v_company_id,
    'user_id',    auth.uid()
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION register_company(TEXT, TEXT, TEXT) TO authenticated;
