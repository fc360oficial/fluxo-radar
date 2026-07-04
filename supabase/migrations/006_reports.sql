-- Relatórios de IA e PDF

CREATE TABLE ai_reports (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id              UUID NOT NULL REFERENCES campaigns(id),
  company_id               UUID NOT NULL REFERENCES companies(id),
  generated_by             UUID NOT NULL REFERENCES profiles(id),
  status                   report_status NOT NULL DEFAULT 'generating',

  executive_summary        TEXT,
  consumer_profile         JSONB,
  competitors              JSONB,
  opportunities            TEXT[],
  strengths                TEXT[],
  weaknesses               TEXT[],
  risks                    TEXT[],
  success_probability      DECIMAL(5,2),
  strategic_recommendation TEXT,
  final_conclusion         TEXT,

  model_used               TEXT DEFAULT 'gpt-4o',
  tokens_used              INTEGER,
  error_message            TEXT,

  created_at               TIMESTAMPTZ DEFAULT now(),
  completed_at             TIMESTAMPTZ
);

CREATE INDEX idx_ai_reports_campaign ON ai_reports(campaign_id);
CREATE INDEX idx_ai_reports_company  ON ai_reports(company_id);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_reports_select" ON ai_reports
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "ai_reports_insert" ON ai_reports
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );

-- Relatórios PDF
CREATE TABLE pdf_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES campaigns(id),
  ai_report_id   UUID REFERENCES ai_reports(id),
  company_id     UUID NOT NULL REFERENCES companies(id),
  generated_by   UUID NOT NULL REFERENCES profiles(id),
  status         report_status NOT NULL DEFAULT 'generating',
  file_url       TEXT,
  file_size_kb   INTEGER,
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX idx_pdf_reports_campaign ON pdf_reports(campaign_id);

ALTER TABLE pdf_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdf_reports_select" ON pdf_reports
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "pdf_reports_insert" ON pdf_reports
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor')
  );
