-- Tabela de pesquisas (coração do sistema)

CREATE TABLE surveys (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id              UUID NOT NULL REFERENCES campaigns(id),
  interviewer_id           UUID NOT NULL REFERENCES profiles(id),
  company_id               UUID NOT NULL REFERENCES companies(id),

  -- Questão 1: Supermercado principal (aberta)
  q1_main_supermarket      TEXT NOT NULL,

  -- Questão 2: Motivo principal
  q2_main_reason           survey_reason NOT NULL,
  q2_main_reason_other     TEXT,

  -- Questão 3: O que incomoda (aberta)
  q3_complaint             TEXT NOT NULL,

  -- Questão 4: Meio de transporte
  q4_transport             survey_transport NOT NULL,

  -- Questão 5: O que faria trocar (até 3)
  q5_switch_reasons        survey_switch[] NOT NULL,

  -- Questão 6: Frequência de compras
  q6_frequency             survey_frequency NOT NULL,

  -- Questão 7: Intenção de compra na nova loja
  q7_intention             survey_intention NOT NULL,

  -- Dados automáticos de GPS
  latitude                 DECIMAL(10, 8) NOT NULL,
  longitude                DECIMAL(11, 8) NOT NULL,
  address                  TEXT,
  gps_accuracy             DECIMAL(6, 2),

  -- Dados automáticos de contexto
  surveyed_at              TIMESTAMPTZ NOT NULL,
  interview_duration_secs  INTEGER NOT NULL,
  device_model             TEXT,
  app_version              TEXT,

  -- Controle de sincronização
  local_id                 TEXT NOT NULL,
  synced_at                TIMESTAMPTZ DEFAULT now(),

  -- Validação
  is_valid                 BOOLEAN DEFAULT true,
  validation_flags         TEXT[],

  created_at               TIMESTAMPTZ DEFAULT now(),

  UNIQUE(campaign_id, local_id)
);

CREATE INDEX idx_surveys_campaign    ON surveys(campaign_id);
CREATE INDEX idx_surveys_interviewer ON surveys(interviewer_id);
CREATE INDEX idx_surveys_company     ON surveys(company_id);
CREATE INDEX idx_surveys_valid       ON surveys(campaign_id, is_valid);
CREATE INDEX idx_surveys_location    ON surveys USING GIST (
  ll_to_earth(latitude::float8, longitude::float8)
);
CREATE INDEX idx_surveys_date        ON surveys(campaign_id, surveyed_at DESC);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Entrevistadores só veem as próprias pesquisas; demais veem tudo da empresa
CREATE POLICY "surveys_select" ON surveys
  FOR SELECT USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) != 'interviewer'
      OR interviewer_id = auth.uid()
    )
  );

CREATE POLICY "surveys_insert" ON surveys
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND interviewer_id = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'interviewer'
    AND campaign_id IN (
      SELECT campaign_id FROM campaign_interviewers
      WHERE interviewer_id = auth.uid() AND status = 'active'
    )
    AND campaign_id IN (
      SELECT id FROM campaigns WHERE status = 'active'
    )
  );
