-- RPC server-side para envio de pesquisa
-- SECURITY DEFINER: bypass completo de RLS, valida identidade server-side
CREATE OR REPLACE FUNCTION submit_survey(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_company_id UUID;
  v_survey_id  UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT company_id INTO v_company_id
    FROM profiles WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  INSERT INTO surveys (
    campaign_id, interviewer_id, company_id,
    q1_main_supermarket,
    q2_main_reason, q2_main_reason_other,
    q3_complaint,
    q4_transport,
    q5_switch_reasons,
    q6_frequency,
    q7_intention,
    q8_new_store_features,
    latitude, longitude, gps_accuracy,
    interview_duration_secs,
    local_id,
    surveyed_at,
    is_valid
  ) VALUES (
    (p_payload->>'campaign_id')::UUID,
    v_user_id,
    v_company_id,
    p_payload->>'q1_main_supermarket',
    p_payload->>'q2_main_reason',
    p_payload->>'q2_main_reason_other',
    p_payload->>'q3_complaint',
    p_payload->>'q4_transport',
    CASE WHEN jsonb_typeof(p_payload->'q5_switch_reasons') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'q5_switch_reasons'))
      ELSE NULL END,
    p_payload->>'q6_frequency',
    p_payload->>'q7_intention',
    CASE WHEN jsonb_typeof(p_payload->'q8_new_store_features') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_payload->'q8_new_store_features'))
      ELSE NULL END,
    COALESCE((p_payload->>'latitude')::NUMERIC, 0),
    COALESCE((p_payload->>'longitude')::NUMERIC, 0),
    NULLIF(p_payload->>'gps_accuracy', '')::NUMERIC,
    COALESCE((p_payload->>'interview_duration_secs')::INTEGER, 0),
    COALESCE(p_payload->>'local_id', gen_random_uuid()::TEXT),
    COALESCE((p_payload->>'surveyed_at')::TIMESTAMPTZ, NOW()),
    TRUE
  )
  RETURNING id INTO v_survey_id;

  RETURN v_survey_id;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_survey(JSONB) TO authenticated;
