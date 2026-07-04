-- Views e Triggers

-- View: Progresso de campanha em tempo real
CREATE OR REPLACE VIEW campaign_progress AS
SELECT
  c.id,
  c.company_id,
  c.name,
  c.city,
  c.neighborhood,
  c.state,
  c.goal,
  c.status,
  c.start_date,
  c.end_date,
  c.responsible_id,
  COUNT(s.id) FILTER (WHERE s.is_valid = true)                              AS total_surveys,
  ROUND(COUNT(s.id) FILTER (WHERE s.is_valid = true) * 100.0 / c.goal, 1) AS percent_complete,
  GREATEST(c.goal - COUNT(s.id) FILTER (WHERE s.is_valid = true), 0)       AS remaining,
  COUNT(s.id) FILTER (WHERE s.is_valid = true AND s.surveyed_at::date = CURRENT_DATE) AS surveys_today,
  AVG(s.interview_duration_secs) FILTER (WHERE s.is_valid = true)          AS avg_duration_secs
FROM campaigns c
LEFT JOIN surveys s ON s.campaign_id = c.id
GROUP BY c.id;

-- View: Ranking de entrevistadores por campanha
CREATE OR REPLACE VIEW interviewer_ranking AS
SELECT
  ci.campaign_id,
  p.id   AS interviewer_id,
  p.name,
  p.avatar_url,
  ci.individual_goal,
  COUNT(s.id) FILTER (WHERE s.is_valid = true)                             AS total,
  COUNT(s.id) FILTER (WHERE s.is_valid = true AND s.surveyed_at::date = CURRENT_DATE) AS today,
  ROUND(AVG(s.interview_duration_secs) FILTER (WHERE s.is_valid = true))  AS avg_duration_secs,
  MAX(s.surveyed_at)                                                       AS last_survey_at
FROM campaign_interviewers ci
JOIN profiles p ON p.id = ci.interviewer_id
LEFT JOIN surveys s ON s.interviewer_id = p.id AND s.campaign_id = ci.campaign_id
WHERE ci.status = 'active'
GROUP BY ci.campaign_id, p.id, p.name, p.avatar_url, ci.individual_goal;

-- Trigger: Encerramento automático da campanha ao atingir a meta
CREATE OR REPLACE FUNCTION check_campaign_goal()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign  campaigns%ROWTYPE;
  v_count     INTEGER;
  v_remaining INTEGER;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = NEW.campaign_id;

  IF v_campaign.status != 'active' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM surveys
  WHERE campaign_id = NEW.campaign_id AND is_valid = true;

  v_remaining := v_campaign.goal - v_count;

  -- Meta atingida: encerra a campanha
  IF v_remaining <= 0 THEN
    UPDATE campaigns
    SET status = 'completed', completed_at = now(), updated_at = now()
    WHERE id = NEW.campaign_id;

    INSERT INTO notifications (company_id, campaign_id, type, title, message)
    VALUES (
      v_campaign.company_id,
      v_campaign.id,
      'campaign_completed',
      'Meta atingida!',
      'A campanha "' || v_campaign.name || '" atingiu ' || v_campaign.goal || ' pesquisas e foi concluída.'
    );

  -- Alertas de proximidade da meta
  ELSIF v_remaining IN (50, 20, 10) THEN
    INSERT INTO notifications (company_id, campaign_id, type, title, message)
    VALUES (
      v_campaign.company_id,
      v_campaign.id,
      'goal_warning',
      'Faltam apenas ' || v_remaining || ' pesquisas!',
      'A campanha "' || v_campaign.name || '" está quase no fim. Faltam ' || v_remaining || ' pesquisas para concluir.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_survey_insert
  AFTER INSERT ON surveys
  FOR EACH ROW EXECUTE FUNCTION check_campaign_goal();

-- Trigger: Bloqueia inserção quando campanha não está ativa
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

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
