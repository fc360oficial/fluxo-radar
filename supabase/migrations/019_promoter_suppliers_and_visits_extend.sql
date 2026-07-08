-- ============================================================
-- 019: Gestão de Promotores — estender promoter_visits e
--      criar promoter_suppliers
-- ============================================================

-- 1. Estender promoter_visits com campos de fornecedor/agendamento
ALTER TABLE public.promoter_visits
  ADD COLUMN IF NOT EXISTS supplier_name   text,
  ADD COLUMN IF NOT EXISTS promoter_name   text,
  ADD COLUMN IF NOT EXISTS promoter_phone  text,
  ADD COLUMN IF NOT EXISTS promoter_email  text,
  ADD COLUMN IF NOT EXISTS visit_date      date,
  ADD COLUMN IF NOT EXISTS scheduled_time  time;

-- Tornar promoter_id nullable (promotores externos não são usuários do sistema)
ALTER TABLE public.promoter_visits ALTER COLUMN promoter_id DROP NOT NULL;
ALTER TABLE public.promoter_visits ALTER COLUMN city         DROP NOT NULL;

-- 2. Ampliar constraint de status para incluir novos valores
ALTER TABLE public.promoter_visits
  DROP CONSTRAINT IF EXISTS promoter_visits_status_check;

ALTER TABLE public.promoter_visits
  ADD CONSTRAINT promoter_visits_status_check
  CHECK (status IN ('pending','scheduled','checked_in','in_store','completed','missed','weekend'));

-- 3. Política de DELETE (faltava)
DROP POLICY IF EXISTS "pv_delete" ON public.promoter_visits;
CREATE POLICY "pv_delete" ON public.promoter_visits FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- 4. Índice auxiliar por data
CREATE INDEX IF NOT EXISTS idx_pv_visit_date
  ON public.promoter_visits (company_id, visit_date DESC);

-- 5. Tabela de fornecedores cadastrados
CREATE TABLE IF NOT EXISTS public.promoter_suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name         text NOT NULL,
  phone        text,
  email        text,
  days_of_week text[],          -- ex: {'Seg','Qua','Sex'}
  periodicity  text DEFAULT 'weekly',
  stores       text[],          -- lojas que atende
  notes        text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

ALTER TABLE public.promoter_suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ps_select" ON public.promoter_suppliers;
DROP POLICY IF EXISTS "ps_insert" ON public.promoter_suppliers;
DROP POLICY IF EXISTS "ps_update" ON public.promoter_suppliers;
DROP POLICY IF EXISTS "ps_delete" ON public.promoter_suppliers;

CREATE POLICY "ps_select" ON public.promoter_suppliers FOR SELECT
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ps_insert" ON public.promoter_suppliers FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ps_update" ON public.promoter_suppliers FOR UPDATE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "ps_delete" ON public.promoter_suppliers FOR DELETE
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
