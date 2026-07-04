-- ============================================================
-- FLUXO PESQUISA DE MERCADO — Schema Completo
-- Cole este SQL no SQL Editor do Supabase e clique em Run
-- ============================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;

-- 2. ENUMERAÇÕES
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'viewer', 'interviewer');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
CREATE TYPE survey_reason AS ENUM ('price','quality','butcher','bakery','location','service','promotions','other');
CREATE TYPE survey_transport AS ENUM ('foot','car','motorcycle','bicycle','uber','bus');
CREATE TYPE survey_switch AS ENUM ('price','better_butcher','better_bakery','more_variety','service','delivery','promotions','organized_store');
CREATE TYPE survey_frequency AS ENUM ('daily','2_3_week','weekly','monthly');
CREATE TYPE survey_intention AS ENUM ('yes','maybe','no');
CREATE TYPE report_status AS ENUM ('generating','completed','failed');
CREATE TYPE notification_type AS ENUM ('campaign_alert','campaign_completed','sync_error','goal_warning');

-- 3. EMPRESAS (tenants)
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

-- 4. PERFIS (extensão da auth.users)
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

-- 5. CAMPANHAS
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

CREATE INDEX idx_campaigns_company     ON campaigns(company_id);
CREATE INDEX idx_campaigns_status      ON campaigns(company_id, status);
CREATE INDEX idx_campaigns_responsible ON campaigns(responsible_id);

-- 6. ENTREVISTADORES POR CAMPANHA
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

CREATE INDEX idx_ci_campaign     ON campaign_interviewers(campaign_id);
CREATE INDEX idx_ci_interviewer  ON campaign_interviewers(interviewer_id);

-- 7. PESQUISAS
CREATE TABLE surveys (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id              UUID NOT NULL REFERENCES campaigns(id),
  interviewer_id           UUID NOT NULL REFERENCES profiles(id),
  company_id               UUID NOT NULL REFERENCES companies(id),
  q1_main_supermarket      TEXT NOT NULL,
  q2_main_reason           survey_reason NOT NULL,
  q2_main_reason_other     TEXT,
  q3_complaint             TEXT NOT NULL,
  q4_transport             survey_transport NOT NULL,
  q5_switch_reasons        survey_switch[] NOT NULL,
  q6_frequency             survey_frequency NOT NULL,
  q7_intention             survey_intention NOT NULL,
  latitude                 DECIMAL(10, 8) NOT NULL,
  longitude                DECIMAL(11, 8) NOT NULL,
  address                  TEXT,
  gps_accuracy             DECIMAL(6, 2),
  surveyed_at              TIMESTAMPTZ NOT NULL,
  interview_duration_secs  INTEGER NOT NULL,
  device_model             TEXT,
  app_version              TEXT,
  local_id                 TEXT NOT NULL,
  synced_at                TIMESTAMPTZ DEFAULT now(),
  is_valid                 BOOLEAN DEFAULT true,
  validation_flags         TEXT[],
  created_at               TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, local_id)
);

CREATE INDEX idx_surveys_campaign    ON surveys(campaign_id);
CREATE INDEX idx_surveys_interviewer ON surveys(interviewer_id);
CREATE INDEX idx_surveys_company     ON surveys(company_id);
CREATE INDEX idx_surveys_valid       ON surveys(campaign_id, is_valid);
CREATE INDEX idx_surveys_date        ON surveys(campaign_id, surveyed_at DESC);

-- 8. RELATÓRIOS IA
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

-- 9. RELATÓRIOS PDF
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

-- 10. NOTIFICAÇÕES
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

-- 11. LOGS DE AUDITORIA
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

-- 12. TRIGGER: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. TRIGGER: Encerramento automático ao atingir a meta
CREATE OR REPLACE FUNCTION check_campaign_goal()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign  campaigns%ROWTYPE;
  v_count     INTEGER;
  v_remaining INTEGER;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = NEW.campaign_id;
  IF v_campaign.status != 'active' THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_count
  FROM surveys WHERE campaign_id = NEW.campaign_id AND is_valid = true;

  v_remaining := v_campaign.goal - v_count;

  IF v_remaining <= 0 THEN
    UPDATE campaigns
    SET status = 'completed', completed_at = now(), updated_at = now()
    WHERE id = NEW.campaign_id;

    INSERT INTO notifications (company_id, campaign_id, type, title, message)
    VALUES (
      v_campaign.company_id, v_campaign.id, 'campaign_completed',
      'Meta atingida!',
      'A campanha "' || v_campaign.name || '" atingiu ' || v_campaign.goal || ' pesquisas e foi concluída.'
    );

  ELSIF v_remaining IN (50, 20, 10) THEN
    INSERT INTO notifications (company_id, campaign_id, type, title, message)
    VALUES (
      v_campaign.company_id, v_campaign.id, 'goal_warning',
      'Faltam apenas ' || v_remaining || ' pesquisas!',
      'A campanha "' || v_campaign.name || '" está quase concluída.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_survey_insert
  AFTER INSERT ON surveys
  FOR EACH ROW EXECUTE FUNCTION check_campaign_goal();

-- 14. TRIGGER: Bloqueia pesquisa em campanha encerrada
CREATE OR REPLACE FUNCTION block_survey_if_campaign_closed()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT status FROM campaigns WHERE id = NEW.campaign_id) != 'active' THEN
    RAISE EXCEPTION 'Campanha não está ativa. Novas pesquisas não são permitidas.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_survey_insert
  BEFORE INSERT ON surveys
  FOR EACH ROW EXECUTE FUNCTION block_survey_if_campaign_closed();

-- 15. VIEWS
CREATE OR REPLACE VIEW campaign_progress AS
SELECT
  c.id, c.company_id, c.name, c.city, c.neighborhood, c.state,
  c.goal, c.status, c.start_date, c.end_date, c.responsible_id,
  COUNT(s.id) FILTER (WHERE s.is_valid = true)                              AS total_surveys,
  ROUND(COUNT(s.id) FILTER (WHERE s.is_valid = true) * 100.0 / c.goal, 1) AS percent_complete,
  GREATEST(c.goal - COUNT(s.id) FILTER (WHERE s.is_valid = true), 0)       AS remaining,
  COUNT(s.id) FILTER (WHERE s.is_valid = true AND s.surveyed_at::date = CURRENT_DATE) AS surveys_today,
  AVG(s.interview_duration_secs) FILTER (WHERE s.is_valid = true)          AS avg_duration_secs
FROM campaigns c
LEFT JOIN surveys s ON s.campaign_id = c.id
GROUP BY c.id;

CREATE OR REPLACE VIEW interviewer_ranking AS
SELECT
  ci.campaign_id,
  p.id AS interviewer_id, p.name, p.avatar_url, ci.individual_goal,
  COUNT(s.id) FILTER (WHERE s.is_valid = true)                             AS total,
  COUNT(s.id) FILTER (WHERE s.is_valid = true AND s.surveyed_at::date = CURRENT_DATE) AS today,
  ROUND(AVG(s.interview_duration_secs) FILTER (WHERE s.is_valid = true))  AS avg_duration_secs,
  MAX(s.surveyed_at)                                                       AS last_survey_at
FROM campaign_interviewers ci
JOIN profiles p ON p.id = ci.interviewer_id
LEFT JOIN surveys s ON s.interviewer_id = p.id AND s.campaign_id = ci.campaign_id
WHERE ci.status = 'active'
GROUP BY ci.campaign_id, p.id, p.name, p.avatar_url, ci.individual_goal;

-- 16. ROW LEVEL SECURITY
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_interviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "companies_select" ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "companies_update" ON companies FOR UPDATE
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "campaigns_select" ON campaigns FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','supervisor'));

CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','supervisor'));

CREATE POLICY "ci_select" ON campaign_interviewers FOR SELECT
  USING (campaign_id IN (SELECT id FROM campaigns WHERE company_id =
    (SELECT company_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "ci_insert" ON campaign_interviewers FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM campaigns WHERE company_id =
    (SELECT company_id FROM profiles WHERE id = auth.uid()))
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','supervisor'));

CREATE POLICY "surveys_select" ON surveys FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND ((SELECT role FROM profiles WHERE id = auth.uid()) != 'interviewer'
      OR interviewer_id = auth.uid()));

CREATE POLICY "surveys_insert" ON surveys FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND interviewer_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'interviewer');

CREATE POLICY "ai_reports_select" ON ai_reports FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "ai_reports_insert" ON ai_reports FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','supervisor'));

CREATE POLICY "pdf_reports_select" ON pdf_reports FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (true);
