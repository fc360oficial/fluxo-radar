-- Tabela de campanhas

CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  name            TEXT NOT NULL,
  city            TEXT NOT NULL,
  neighborhood    TEXT NOT NULL,
  state           TEXT NOT NULL,
  responsible_id  UUID NOT NULL REFERENCES profiles(id),
  start_date      DATE NOT NULL,
  end_date        DATE,
  goal            INTEGER NOT NULL CHECK (goal > 0),
  status          campaign_status NOT NULL DEFAULT 'draft',
  notes           TEXT,
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancelled_by    UUID REFERENCES profiles(id),
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaigns_company    ON campaigns(company_id);
CREATE INDEX idx_campaigns_status     ON campaigns(company_id, status);
CREATE INDEX idx_campaigns_responsible ON campaigns(responsible_id);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select" ON campaigns
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "campaigns_insert" ON campaigns
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

CREATE POLICY "campaigns_update" ON campaigns
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

-- Tabela pivot campanha <-> entrevistador
CREATE TABLE campaign_interviewers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  interviewer_id   UUID NOT NULL REFERENCES profiles(id),
  individual_goal  INTEGER,
  assigned_at      TIMESTAMPTZ DEFAULT now(),
  assigned_by      UUID REFERENCES profiles(id),
  status           TEXT NOT NULL DEFAULT 'active',
  UNIQUE(campaign_id, interviewer_id)
);

CREATE INDEX idx_campaign_interviewers_campaign     ON campaign_interviewers(campaign_id);
CREATE INDEX idx_campaign_interviewers_interviewer  ON campaign_interviewers(interviewer_id);

ALTER TABLE campaign_interviewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ci_select" ON campaign_interviewers
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "ci_insert" ON campaign_interviewers
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

CREATE POLICY "ci_update" ON campaign_interviewers
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id = (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );
