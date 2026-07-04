-- Notificações

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  campaign_id UUID REFERENCES campaigns(id),
  user_id     UUID REFERENCES profiles(id),
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  read        BOOLEAN DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user    ON notifications(user_id, read);
CREATE INDEX idx_notifications_company ON notifications(company_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Auditoria
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_user    ON audit_logs(user_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);
