-- ============================================================
-- MÓDULOS: Pesquisa de Preços, Trade Marketing, Promotores,
--          Cliente Oculto, Expansão, Concorrência
-- ============================================================

-- 1. PESQUISA DE PREÇOS ─────────────────────────────────────
CREATE TABLE price_collections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id),
  campaign_id      UUID REFERENCES campaigns(id),
  store_name       TEXT NOT NULL,
  store_address    TEXT,
  city             TEXT NOT NULL,
  product_name     TEXT NOT NULL,
  product_brand    TEXT,
  product_category TEXT,
  barcode          TEXT,
  unit             TEXT NOT NULL DEFAULT 'un',
  current_price    DECIMAL(10,2) NOT NULL CHECK (current_price >= 0),
  reference_price  DECIMAL(10,2),
  in_stock         BOOLEAN NOT NULL DEFAULT true,
  photo_url        TEXT,
  collected_by     UUID NOT NULL REFERENCES profiles(id),
  collected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pc_company  ON price_collections(company_id);
CREATE INDEX idx_pc_date     ON price_collections(company_id, collected_at DESC);
CREATE INDEX idx_pc_campaign ON price_collections(campaign_id);

ALTER TABLE price_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_select" ON price_collections FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "pc_insert" ON price_collections FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "pc_update" ON price_collections FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','supervisor'));

-- 2. TRADE MARKETING ────────────────────────────────────────
CREATE TABLE trade_marketing_visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  campaign_id   UUID REFERENCES campaigns(id),
  store_name    TEXT NOT NULL,
  store_address TEXT,
  city          TEXT NOT NULL,
  visit_type    TEXT NOT NULL DEFAULT 'pdv_check',
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_progress','completed','cancelled')),
  score         INTEGER CHECK (score BETWEEN 0 AND 100),
  checklist     JSONB NOT NULL DEFAULT '[]',
  photos_count  INTEGER NOT NULL DEFAULT 0,
  visited_by    UUID NOT NULL REFERENCES profiles(id),
  visited_at    TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tm_company ON trade_marketing_visits(company_id);
CREATE INDEX idx_tm_date    ON trade_marketing_visits(company_id, visited_at DESC);

ALTER TABLE trade_marketing_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tm_select" ON trade_marketing_visits FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "tm_insert" ON trade_marketing_visits FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "tm_update" ON trade_marketing_visits FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE TRIGGER tm_updated_at BEFORE UPDATE ON trade_marketing_visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. PROMOTORES ─────────────────────────────────────────────
CREATE TABLE promoter_visits (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id),
  promoter_id    UUID NOT NULL REFERENCES profiles(id),
  store_name     TEXT NOT NULL,
  store_address  TEXT,
  city           TEXT NOT NULL,
  product_count  INTEGER NOT NULL DEFAULT 0,
  photos_count   INTEGER NOT NULL DEFAULT 0,
  goal           INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','checked_in','completed','missed')),
  checked_in_at  TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  latitude       DECIMAL(10,8),
  longitude      DECIMAL(11,8),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pv_company   ON promoter_visits(company_id);
CREATE INDEX idx_pv_promoter  ON promoter_visits(promoter_id);
CREATE INDEX idx_pv_date      ON promoter_visits(company_id, created_at DESC);

ALTER TABLE promoter_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_select" ON promoter_visits FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "pv_insert" ON promoter_visits FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "pv_update" ON promoter_visits FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE TRIGGER pv_updated_at BEFORE UPDATE ON promoter_visits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. CLIENTE OCULTO ─────────────────────────────────────────
CREATE TABLE mystery_shopper_evaluations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  store_name        TEXT NOT NULL,
  store_address     TEXT,
  city              TEXT NOT NULL,
  evaluator_id      UUID NOT NULL REFERENCES profiles(id),
  attended_score    INTEGER CHECK (attended_score BETWEEN 0 AND 10),
  cleanliness_score INTEGER CHECK (cleanliness_score BETWEEN 0 AND 10),
  queue_score       INTEGER CHECK (queue_score BETWEEN 0 AND 10),
  variety_score     INTEGER CHECK (variety_score BETWEEN 0 AND 10),
  price_score       INTEGER CHECK (price_score BETWEEN 0 AND 10),
  total_score       DECIMAL(4,1)
                      GENERATED ALWAYS AS (
                        ROUND((COALESCE(attended_score,0) + COALESCE(cleanliness_score,0) +
                               COALESCE(queue_score,0)    + COALESCE(variety_score,0) +
                               COALESCE(price_score,0))::DECIMAL / 5, 1)
                      ) STORED,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','in_progress','completed')),
  evaluated_at      TIMESTAMPTZ,
  photos_count      INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ms_company ON mystery_shopper_evaluations(company_id);
CREATE INDEX idx_ms_date    ON mystery_shopper_evaluations(company_id, evaluated_at DESC);

ALTER TABLE mystery_shopper_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ms_select" ON mystery_shopper_evaluations FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ms_insert" ON mystery_shopper_evaluations FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ms_update" ON mystery_shopper_evaluations FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE TRIGGER ms_updated_at BEFORE UPDATE ON mystery_shopper_evaluations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. EXPANSÃO ───────────────────────────────────────────────
CREATE TABLE expansion_studies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  name              TEXT NOT NULL,
  region            TEXT NOT NULL,
  city              TEXT NOT NULL,
  neighborhood      TEXT,
  state             TEXT NOT NULL DEFAULT 'SP',
  population        INTEGER,
  avg_income        DECIMAL(10,2),
  competition_count INTEGER NOT NULL DEFAULT 0,
  viability_score   DECIMAL(4,1),
  status            TEXT NOT NULL DEFAULT 'studying'
                      CHECK (status IN ('studying','approved','rejected','on_hold')),
  latitude          DECIMAL(10,8),
  longitude         DECIMAL(11,8),
  notes             TEXT,
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_es_company ON expansion_studies(company_id);

ALTER TABLE expansion_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "es_select" ON expansion_studies FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "es_insert" ON expansion_studies FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','supervisor'));
CREATE POLICY "es_update" ON expansion_studies FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','supervisor'));

CREATE TRIGGER es_updated_at BEFORE UPDATE ON expansion_studies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. CONCORRÊNCIA ───────────────────────────────────────────
CREATE TABLE competitor_visits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id),
  competitor_name  TEXT NOT NULL,
  store_name       TEXT NOT NULL,
  store_address    TEXT,
  city             TEXT NOT NULL,
  price_index      DECIMAL(5,2), -- 100 = mesmo preço, >100 = concorrente mais caro
  promotions_count INTEGER NOT NULL DEFAULT 0,
  trend            TEXT NOT NULL DEFAULT 'stable'
                     CHECK (trend IN ('up','down','stable')),
  observations     TEXT,
  photos_count     INTEGER NOT NULL DEFAULT 0,
  visited_by       UUID NOT NULL REFERENCES profiles(id),
  visited_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cv_company ON competitor_visits(company_id);
CREATE INDEX idx_cv_date    ON competitor_visits(company_id, visited_at DESC);

ALTER TABLE competitor_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv_select" ON competitor_visits FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "cv_insert" ON competitor_visits FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "cv_update" ON competitor_visits FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- 7. FUNÇÃO: KPIs do Dashboard ──────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_kpis(p_company_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'active_campaigns',    (SELECT COUNT(*) FROM campaigns       WHERE company_id = p_company_id AND status = 'active'),
    'surveys_today',       (SELECT COUNT(*) FROM surveys         WHERE company_id = p_company_id AND surveyed_at::date = CURRENT_DATE AND is_valid = true),
    'surveys_total',       (SELECT COUNT(*) FROM surveys         WHERE company_id = p_company_id AND is_valid = true),
    'prices_today',        (SELECT COUNT(*) FROM price_collections WHERE company_id = p_company_id AND collected_at::date = CURRENT_DATE),
    'prices_total',        (SELECT COUNT(*) FROM price_collections WHERE company_id = p_company_id),
    'tm_visits_today',     (SELECT COUNT(*) FROM trade_marketing_visits WHERE company_id = p_company_id AND visited_at::date = CURRENT_DATE),
    'promoter_visits_today',(SELECT COUNT(*) FROM promoter_visits WHERE company_id = p_company_id AND checked_in_at::date = CURRENT_DATE),
    'unread_alerts',       (SELECT COUNT(*) FROM notifications   WHERE company_id = p_company_id AND read = false),
    'pending_tasks',       (
      (SELECT COUNT(*) FROM trade_marketing_visits WHERE company_id = p_company_id AND status = 'pending') +
      (SELECT COUNT(*) FROM promoter_visits        WHERE company_id = p_company_id AND status = 'pending') +
      (SELECT COUNT(*) FROM mystery_shopper_evaluations WHERE company_id = p_company_id AND status = 'pending')
    )
  ) INTO v_result;
  RETURN v_result;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_dashboard_kpis(UUID) TO authenticated;
