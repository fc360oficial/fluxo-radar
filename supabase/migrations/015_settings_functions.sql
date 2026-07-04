-- ============================================================
-- Funções para a página de Configurações
-- ============================================================

-- Retorna os dados da empresa do usuário autenticado
CREATE OR REPLACE FUNCTION get_my_company()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM profiles WHERE id = auth.uid();
  RETURN (
    SELECT jsonb_build_object(
      'id', id, 'name', name, 'cnpj', cnpj,
      'email', email, 'phone', phone,
      'plan', plan, 'status', status, 'logo_url', logo_url
    )
    FROM companies WHERE id = v_company_id
  );
END;
$func$;
GRANT EXECUTE ON FUNCTION get_my_company() TO authenticated;

-- Atualiza dados da empresa (apenas admin)
CREATE OR REPLACE FUNCTION update_my_company(
  p_name  TEXT,
  p_cnpj  TEXT,
  p_email TEXT,
  p_phone TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE v_company_id UUID; v_role TEXT;
BEGIN
  SELECT company_id, role INTO v_company_id, v_role FROM profiles WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'supervisor') THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  UPDATE companies SET
    name       = COALESCE(NULLIF(trim(p_name),  ''), name),
    cnpj       = NULLIF(trim(COALESCE(p_cnpj,  '')), ''),
    email      = COALESCE(NULLIF(trim(p_email), ''), email),
    phone      = NULLIF(trim(COALESCE(p_phone, '')), ''),
    updated_at = NOW()
  WHERE id = v_company_id;
END;
$func$;
GRANT EXECUTE ON FUNCTION update_my_company(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Atualiza dados do perfil do usuário autenticado
CREATE OR REPLACE FUNCTION update_my_profile(p_name TEXT, p_phone TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  UPDATE profiles SET
    name       = COALESCE(NULLIF(trim(p_name), ''), name),
    phone      = NULLIF(trim(COALESCE(p_phone, '')), ''),
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$func$;
GRANT EXECUTE ON FUNCTION update_my_profile(TEXT, TEXT) TO authenticated;
