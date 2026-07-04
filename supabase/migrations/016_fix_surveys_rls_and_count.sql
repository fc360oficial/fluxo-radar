-- Fix 1: surveys INSERT policy
-- Antes exigia role='interviewer', bloqueando admins/supervisors no teste
-- Agora: qualquer usuário autenticado da mesma empresa pode inserir seus próprios surveys
DROP POLICY IF EXISTS surveys_insert ON surveys;
CREATE POLICY surveys_insert ON surveys
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND interviewer_id = auth.uid()
  );

-- Fix 2: is_valid default true
-- A view campaign_progress conta só is_valid=TRUE, mas o campo chegava como NULL
ALTER TABLE surveys ALTER COLUMN is_valid SET DEFAULT true;

-- Atualiza surveys já existentes sem is_valid definido
UPDATE surveys SET is_valid = true WHERE is_valid IS NULL;
