-- ============================================================
-- Funções para os gráficos do dashboard:
-- tipos de coleta, status de visitas, ranking de lojas, IA summary
-- ============================================================

-- 1. TIPOS DE COLETA (HOJE) ─────────────────────────────────
CREATE OR REPLACE FUNCTION get_collection_types_today(p_company_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  RETURN jsonb_build_object(
    'surveys',         (SELECT COUNT(*) FROM surveys                     WHERE company_id = p_company_id AND surveyed_at::date    = CURRENT_DATE AND is_valid = true),
    'prices',          (SELECT COUNT(*) FROM price_collections           WHERE company_id = p_company_id AND collected_at::date   = CURRENT_DATE),
    'trade_marketing', (SELECT COUNT(*) FROM trade_marketing_visits      WHERE company_id = p_company_id AND visited_at::date     = CURRENT_DATE),
    'promoters',       (SELECT COUNT(*) FROM promoter_visits             WHERE company_id = p_company_id AND checked_in_at::date  = CURRENT_DATE),
    'mystery_shopper', (SELECT COUNT(*) FROM mystery_shopper_evaluations WHERE company_id = p_company_id AND evaluated_at::date   = CURRENT_DATE)
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION get_collection_types_today(UUID) TO authenticated;

-- 2. STATUS DAS VISITAS (HOJE) ──────────────────────────────
CREATE OR REPLACE FUNCTION get_visit_status_today(p_company_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_completed   BIGINT := 0;
  v_in_progress BIGINT := 0;
  v_pending     BIGINT := 0;
  v_cancelled   BIGINT := 0;
BEGIN
  -- Trade Marketing (pending | in_progress | completed | cancelled)
  SELECT
    v_completed   + COUNT(*) FILTER (WHERE status = 'completed'),
    v_in_progress + COUNT(*) FILTER (WHERE status = 'in_progress'),
    v_pending     + COUNT(*) FILTER (WHERE status = 'pending'),
    v_cancelled   + COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_completed, v_in_progress, v_pending, v_cancelled
  FROM trade_marketing_visits
  WHERE company_id = p_company_id AND created_at::date = CURRENT_DATE;

  -- Promotores (pending | checked_in → in_progress | completed | missed → cancelled)
  SELECT
    v_completed   + COUNT(*) FILTER (WHERE status = 'completed'),
    v_in_progress + COUNT(*) FILTER (WHERE status = 'checked_in'),
    v_pending     + COUNT(*) FILTER (WHERE status = 'pending'),
    v_cancelled   + COUNT(*) FILTER (WHERE status = 'missed')
  INTO v_completed, v_in_progress, v_pending, v_cancelled
  FROM promoter_visits
  WHERE company_id = p_company_id AND created_at::date = CURRENT_DATE;

  -- Cliente Oculto (pending | in_progress | completed)
  SELECT
    v_completed   + COUNT(*) FILTER (WHERE status = 'completed'),
    v_in_progress + COUNT(*) FILTER (WHERE status = 'in_progress'),
    v_pending     + COUNT(*) FILTER (WHERE status = 'pending'),
    v_cancelled
  INTO v_completed, v_in_progress, v_pending, v_cancelled
  FROM mystery_shopper_evaluations
  WHERE company_id = p_company_id AND created_at::date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'completed',   v_completed,
    'in_progress', v_in_progress,
    'pending',     v_pending,
    'cancelled',   v_cancelled
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION get_visit_status_today(UUID) TO authenticated;

-- 3. RANKING DE LOJAS (por score de Cliente Oculto) ─────────
CREATE OR REPLACE FUNCTION get_store_ranking(p_company_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE(store_name TEXT, score NUMERIC, eval_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  RETURN QUERY
  SELECT
    ms.store_name,
    ROUND(AVG(ms.total_score) * 10, 1),   -- 0-10 → 0-100
    COUNT(*)::BIGINT
  FROM mystery_shopper_evaluations ms
  WHERE ms.company_id = p_company_id AND ms.status = 'completed'
  GROUP BY ms.store_name
  ORDER BY AVG(ms.total_score) DESC NULLS LAST
  LIMIT p_limit;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_store_ranking(UUID, INT) TO authenticated;

-- 4. RESUMO PARA IA RADAR ───────────────────────────────────
CREATE OR REPLACE FUNCTION get_ia_summary(p_company_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_surveys_this_week BIGINT;
  v_surveys_last_week BIGINT;
  v_survey_growth     INTEGER;
  v_competitor_promos BIGINT;
  v_avg_price_delta   DECIMAL(5,1);
  v_best_expansion    TEXT;
  v_out_of_stock      BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_surveys_this_week
    FROM surveys WHERE company_id = p_company_id
    AND surveyed_at >= date_trunc('week', NOW()) AND is_valid = true;

  SELECT COUNT(*) INTO v_surveys_last_week
    FROM surveys WHERE company_id = p_company_id
    AND surveyed_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
    AND surveyed_at <  date_trunc('week', NOW()) AND is_valid = true;

  v_survey_growth := CASE WHEN v_surveys_last_week > 0
    THEN ROUND((v_surveys_this_week - v_surveys_last_week)::DECIMAL / v_surveys_last_week * 100)
    ELSE 0 END;

  SELECT COALESCE(SUM(promotions_count), 0) INTO v_competitor_promos
    FROM competitor_visits WHERE company_id = p_company_id
    AND visited_at >= NOW() - INTERVAL '7 days';

  SELECT COALESCE(ROUND(AVG((current_price / NULLIF(reference_price, 0) - 1) * 100)::DECIMAL, 1), 0)
    INTO v_avg_price_delta
    FROM price_collections WHERE company_id = p_company_id AND reference_price > 0;

  SELECT COALESCE(
    CASE WHEN neighborhood IS NOT NULL THEN neighborhood || ', ' || city ELSE city END,
    'Nenhum estudo em andamento'
  )
  INTO v_best_expansion
  FROM expansion_studies WHERE company_id = p_company_id AND status = 'studying'
  ORDER BY viability_score DESC NULLS LAST LIMIT 1;

  SELECT COUNT(*) INTO v_out_of_stock
    FROM price_collections WHERE company_id = p_company_id AND in_stock = false;

  RETURN jsonb_build_object(
    'survey_growth',      v_survey_growth,
    'competitor_promos',  v_competitor_promos,
    'avg_price_delta',    v_avg_price_delta,
    'best_expansion',     COALESCE(v_best_expansion, 'Nenhum estudo em andamento'),
    'out_of_stock_count', v_out_of_stock
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION get_ia_summary(UUID) TO authenticated;
