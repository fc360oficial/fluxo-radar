-- Tabela de empresas (tenants)

CREATE TABLE companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  cnpj       TEXT UNIQUE,
  email      TEXT NOT NULL,
  phone      TEXT,
  logo_url   TEXT,
  plan       TEXT NOT NULL DEFAULT 'starter',
  status     TEXT NOT NULL DEFAULT 'active',
  settings   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_status ON companies(status);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Admins podem ver/editar sua própria empresa
CREATE POLICY "company_select" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "company_update" ON companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
