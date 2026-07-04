-- Extensão da auth.users com dados do perfil

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'viewer',
  status          TEXT NOT NULL DEFAULT 'active',
  interviewer_pin TEXT,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_role    ON profiles(company_id, role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

-- Trigger para atualizar last_login_at
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_login_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
