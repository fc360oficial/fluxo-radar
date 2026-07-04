-- ============================================================
-- SEED: Cria empresa e usuário admin inicial
-- Cole no SQL Editor do Supabase e clique em Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id    UUID := gen_random_uuid();
  v_company_id UUID := gen_random_uuid();
BEGIN

  -- 1. Cria a empresa
  INSERT INTO public.companies (id, name, email, plan, status)
  VALUES (
    v_company_id,
    'Fluxo Tecnologia',
    'tiago.freire.silva@gmail.com',
    'pro',
    'active'
  );

  -- 2. Cria o usuário no Supabase Auth
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    aud,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'tiago.freire.silva@gmail.com',
    crypt('FluxoPesquisa@2026', gen_salt('bf')),
    now(),
    'authenticated',
    'authenticated',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Tiago Freire"}',
    now(),
    now()
  );

  -- 3. Cria o perfil admin
  INSERT INTO public.profiles (id, company_id, name, email, role, status)
  VALUES (
    v_user_id,
    v_company_id,
    'Tiago Freire',
    'tiago.freire.silva@gmail.com',
    'admin',
    'active'
  );

  RAISE NOTICE 'Usuário admin criado com sucesso! ID: %', v_user_id;

END $$;
