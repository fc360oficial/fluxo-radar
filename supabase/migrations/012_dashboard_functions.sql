-- ============================================================
-- Funções para o Dashboard: feed de atividades, resumo por
-- módulo e equipe em campo
-- ============================================================

-- 1. FEED DE ATIVIDADE RECENTE ─────────────────────────────
CREATE OR REPLACE FUNCTION get_activity_feed(p_company_id UUID, p_limit INT DEFAULT 12)
RETURNS TABLE(
  actor_name     TEXT,
  action         TEXT,
  location       TEXT,
  activity_time  TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  RETURN QUERY
  SELECT * FROM (

    SELECT p.name,
           'concluiu uma pesquisa'::TEXT,
           c.neighborhood,
           s.surveyed_at
    FROM surveys s
    JOIN profiles p  ON p.id  = s.interviewer_id
    JOIN campaigns c ON c.id  = s.campaign_id
    WHERE s.company_id = p_company_id AND s.is_valid = true

    UNION ALL

    SELECT p.name,
           'coletou preço de produtos'::TEXT,
           pc.store_name,
           pc.collected_at
    FROM price_collections pc
    JOIN profiles p ON p.id = pc.collected_by
    WHERE pc.company_id = p_company_id

    UNION ALL

    SELECT p.name,
           'concluiu visita Trade Marketing'::TEXT,
           tm.store_name,
           tm.visited_at
    FROM trade_marketing_visits tm
    JOIN profiles p ON p.id = tm.visited_by
    WHERE tm.company_id = p_company_id AND tm.status = 'completed' AND tm.visited_at IS NOT NULL

    UNION ALL

    SELECT p.name,
           'fez check-in'::TEXT,
           pv.store_name,
           pv.checked_in_at
    FROM promoter_visits pv
    JOIN profiles p ON p.id = pv.promoter_id
    WHERE pv.company_id = p_company_id AND pv.checked_in_at IS NOT NULL

    UNION ALL

    SELECT p.name,
           'iniciou avaliação Cliente Oculto'::TEXT,
           ms.store_name,
           ms.evaluated_at
    FROM mystery_shopper_evaluations ms
    JOIN profiles p ON p.id = ms.evaluator_id
    WHERE ms.company_id = p_company_id AND ms.evaluated_at IS NOT NULL

  ) combined
  ORDER BY activity_time DESC NULLS LAST
  LIMIT p_limit;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_activity_feed(UUID, INT) TO authenticated;

-- 2. RESUMO POR MÓDULO ─────────────────────────────────────
CREATE OR REPLACE FUNCTION get_module_summary(p_company_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
DECLARE
  v_camp_done  BIGINT; v_camp_goal  BIGINT;
  v_price_done BIGINT; v_price_goal BIGINT;
  v_tm_done    BIGINT; v_tm_goal    BIGINT;
  v_prom_done  BIGINT; v_prom_goal  BIGINT;
  v_ms_done    BIGINT; v_ms_goal    BIGINT;
  v_exp_done   BIGINT; v_exp_goal   BIGINT;
  v_comp_done  BIGINT; v_comp_goal  BIGINT;
BEGIN
  -- Campanhas: soma das pesquisas válidas vs soma das metas ativas
  SELECT COALESCE(SUM(total_surveys),0), COALESCE(SUM(goal),0)
    INTO v_camp_done, v_camp_goal
    FROM campaign_progress WHERE company_id = p_company_id AND status = 'active';

  -- Preços: coletados hoje vs meta diária estimada (total * 1.4 como proxy)
  SELECT COUNT(*) INTO v_price_done FROM price_collections
    WHERE company_id = p_company_id AND collected_at::date = CURRENT_DATE;
  SELECT GREATEST(COUNT(*), 1) INTO v_price_goal FROM price_collections
    WHERE company_id = p_company_id;

  -- Trade Marketing: concluídas vs total
  SELECT COUNT(*) FILTER (WHERE status = 'completed'),
         GREATEST(COUNT(*), 1)
    INTO v_tm_done, v_tm_goal
    FROM trade_marketing_visits WHERE company_id = p_company_id;

  -- Promotores: concluídas vs total
  SELECT COUNT(*) FILTER (WHERE status = 'completed'),
         GREATEST(COUNT(*), 1)
    INTO v_prom_done, v_prom_goal
    FROM promoter_visits WHERE company_id = p_company_id;

  -- Cliente Oculto: concluídas vs total
  SELECT COUNT(*) FILTER (WHERE status = 'completed'),
         GREATEST(COUNT(*), 1)
    INTO v_ms_done, v_ms_goal
    FROM mystery_shopper_evaluations WHERE company_id = p_company_id;

  -- Expansão: aprovados+em estudo vs total
  SELECT COUNT(*) FILTER (WHERE status IN ('approved','studying')),
         GREATEST(COUNT(*), 1)
    INTO v_exp_done, v_exp_goal
    FROM expansion_studies WHERE company_id = p_company_id;

  -- Concorrência: últimos 7 dias vs total
  SELECT COUNT(*) FILTER (WHERE visited_at >= NOW() - INTERVAL '7 days'),
         GREATEST(COUNT(*), 1)
    INTO v_comp_done, v_comp_goal
    FROM competitor_visits WHERE company_id = p_company_id;

  RETURN jsonb_build_object(
    'campaigns',      jsonb_build_object('done', v_camp_done,  'goal', GREATEST(v_camp_goal,1),  'unit', 'entrevistas'),
    'price_research', jsonb_build_object('done', v_price_done, 'goal', GREATEST(v_price_goal,1), 'unit', 'produtos'),
    'trade_marketing',jsonb_build_object('done', v_tm_done,    'goal', GREATEST(v_tm_goal,1),    'unit', 'visitas'),
    'promoters',      jsonb_build_object('done', v_prom_done,  'goal', GREATEST(v_prom_goal,1),  'unit', 'visitas'),
    'mystery_shopper',jsonb_build_object('done', v_ms_done,    'goal', GREATEST(v_ms_goal,1),    'unit', 'avaliações'),
    'expansion',      jsonb_build_object('done', v_exp_done,   'goal', GREATEST(v_exp_goal,1),   'unit', 'estudos'),
    'competition',    jsonb_build_object('done', v_comp_done,  'goal', GREATEST(v_comp_goal,1),  'unit', 'visitas')
  );
END;
$func$;

GRANT EXECUTE ON FUNCTION get_module_summary(UUID) TO authenticated;

-- 3. EQUIPE EM CAMPO ───────────────────────────────────────
CREATE OR REPLACE FUNCTION get_team_in_field(p_company_id UUID, p_limit INT DEFAULT 8)
RETURNS TABLE(
  user_id        UUID,
  name           TEXT,
  last_action    TEXT,
  last_location  TEXT,
  last_active_at TIMESTAMPTZ,
  field_status   TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $func$
BEGIN
  RETURN QUERY
  WITH all_activity AS (
    SELECT s.interviewer_id AS uid,
           'pesquisa'::TEXT AS action,
           c.neighborhood   AS location,
           s.surveyed_at    AS at
    FROM surveys s JOIN campaigns c ON c.id = s.campaign_id
    WHERE s.company_id = p_company_id

    UNION ALL

    SELECT pc.collected_by, 'preço coletado', pc.store_name, pc.collected_at
    FROM price_collections pc WHERE pc.company_id = p_company_id

    UNION ALL

    SELECT tm.visited_by, 'Trade Marketing', tm.store_name, tm.visited_at
    FROM trade_marketing_visits tm
    WHERE tm.company_id = p_company_id AND tm.visited_at IS NOT NULL

    UNION ALL

    SELECT pv.promoter_id, 'check-in', pv.store_name, pv.checked_in_at
    FROM promoter_visits pv
    WHERE pv.company_id = p_company_id AND pv.checked_in_at IS NOT NULL

    UNION ALL

    SELECT ms.evaluator_id, 'Cliente Oculto', ms.store_name, ms.evaluated_at
    FROM mystery_shopper_evaluations ms
    WHERE ms.company_id = p_company_id AND ms.evaluated_at IS NOT NULL
  ),
  latest AS (
    SELECT uid, action, location, at,
           ROW_NUMBER() OVER (PARTITION BY uid ORDER BY at DESC) AS rn
    FROM all_activity
  )
  SELECT
    p.id,
    p.name,
    l.action,
    l.location,
    l.at,
    CASE
      WHEN l.at > NOW() - INTERVAL '15 minutes' THEN 'online'
      WHEN l.at > NOW() - INTERVAL '1 hour'     THEN 'paused'
      ELSE 'offline'
    END
  FROM latest l
  JOIN profiles p ON p.id = l.uid
  WHERE l.rn = 1 AND p.company_id = p_company_id
  ORDER BY l.at DESC NULLS LAST
  LIMIT p_limit;
END;
$func$;

GRANT EXECUTE ON FUNCTION get_team_in_field(UUID, INT) TO authenticated;
