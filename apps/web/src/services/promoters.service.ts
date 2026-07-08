import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PromoterVisitRow {
  id:             string
  company_id:     string
  supplier_name:  string | null
  promoter_name:  string | null
  promoter_phone: string | null
  promoter_email: string | null
  store_name:     string
  visit_date:     string | null  // YYYY-MM-DD
  scheduled_time: string | null  // HH:MM:SS
  checked_in_at:  string | null  // ISO timestamp
  checked_out_at: string | null  // ISO timestamp
  status:         string
  latitude:       number | null
  longitude:      number | null
  notes:          string | null
  created_at:     string
}

export interface PromoterSupplierRow {
  id:           string
  company_id:   string
  name:         string
  phone:        string | null
  email:        string | null
  days_of_week: string[] | null
  periodicity:  string | null
  stores:       string[] | null
  notes:        string | null
  active:       boolean
  created_at:   string
}

export interface CreateVisitInput {
  supplier_name:   string
  promoter_name:   string
  promoter_phone?: string
  promoter_email?: string
  store_name:      string
  visit_date:      string        // YYYY-MM-DD
  scheduled_time?: string        // HH:MM
  status?:         string
  notes?:          string
}

export interface CreateSupplierInput {
  name:           string
  phone?:         string
  email?:         string
  days_of_week?:  string[]
  periodicity?:   string
  stores?:        string[]
  notes?:         string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoToTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function mapStatus(s: string): string {
  const m: Record<string, string> = {
    pending:    'scheduled',
    scheduled:  'scheduled',
    checked_in: 'in_store',
    in_store:   'in_store',
    completed:  'completed',
    missed:     'missed',
    weekend:    'weekend',
  }
  return m[s] ?? 'scheduled'
}

function rowToVisit(row: PromoterVisitRow) {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id:             row.id,
    date:           row.visit_date ?? today,
    supplier:       row.supplier_name ?? '—',
    promoter_name:  row.promoter_name ?? '—',
    store:          row.store_name,
    scheduled_time: row.scheduled_time?.slice(0, 5) ?? undefined,
    check_in_at:    isoToTime(row.checked_in_at),
    check_out_at:   isoToTime(row.checked_out_at),
    status:         mapStatus(row.status) as 'scheduled' | 'in_store' | 'completed' | 'missed' | 'weekend',
    lat:            row.latitude,
    lng:            row.longitude,
    notes:          row.notes,
  }
}

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')
  const { data } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  if (!data?.company_id) throw new Error('no_company')
  return data.company_id as string
}

// ── Service ───────────────────────────────────────────────────────────────────
export const promotersService = {

  async listVisits(dateFrom?: string, dateTo?: string) {
    const company_id = await getCompanyId()
    let q = supabase
      .from('promoter_visits')
      .select('*')
      .eq('company_id', company_id)
      .order('visit_date', { ascending: false })

    if (dateFrom) q = q.gte('visit_date', dateFrom)
    if (dateTo)   q = q.lte('visit_date', dateTo)

    const { data, error } = await q
    if (error) throw error
    return (data as PromoterVisitRow[]).map(rowToVisit)
  },

  async createVisit(input: CreateVisitInput) {
    const company_id = await getCompanyId()
    const { data, error } = await supabase
      .from('promoter_visits')
      .insert({
        company_id,
        supplier_name:  input.supplier_name,
        promoter_name:  input.promoter_name,
        promoter_phone: input.promoter_phone ?? null,
        promoter_email: input.promoter_email ?? null,
        store_name:     input.store_name,
        visit_date:     input.visit_date,
        scheduled_time: input.scheduled_time ?? null,
        status:         input.status ?? 'scheduled',
        notes:          input.notes ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return rowToVisit(data as PromoterVisitRow)
  },

  async checkIn(id: string, lat?: number, lng?: number) {
    const { error } = await supabase
      .from('promoter_visits')
      .update({
        status:        'in_store',
        checked_in_at: new Date().toISOString(),
        latitude:  lat ?? null,
        longitude: lng ?? null,
      })
      .eq('id', id)
    if (error) throw error
  },

  async checkOut(id: string) {
    const { error } = await supabase
      .from('promoter_visits')
      .update({ status: 'completed', checked_out_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async markMissed(id: string) {
    const { error } = await supabase
      .from('promoter_visits')
      .update({ status: 'missed' })
      .eq('id', id)
    if (error) throw error
  },

  async deleteVisit(id: string) {
    const { error } = await supabase.from('promoter_visits').delete().eq('id', id)
    if (error) throw error
  },

  // ── Fornecedores ────────────────────────────────────────────
  async listSuppliers() {
    const company_id = await getCompanyId()
    const { data, error } = await supabase
      .from('promoter_suppliers')
      .select('*')
      .eq('company_id', company_id)
      .eq('active', true)
      .order('name')
    if (error) throw error
    return (data ?? []) as PromoterSupplierRow[]
  },

  async upsertSupplier(input: CreateSupplierInput) {
    const company_id = await getCompanyId()
    const { data, error } = await supabase
      .from('promoter_suppliers')
      .upsert({
        company_id,
        name:         input.name,
        phone:        input.phone ?? null,
        email:        input.email ?? null,
        days_of_week: input.days_of_week ?? null,
        periodicity:  input.periodicity ?? 'weekly',
        stores:       input.stores ?? null,
        notes:        input.notes ?? null,
      }, { onConflict: 'company_id,name' })
      .select()
      .single()
    if (error) throw error
    return data as PromoterSupplierRow
  },

  async deleteSupplier(id: string) {
    const { error } = await supabase
      .from('promoter_suppliers')
      .update({ active: false })
      .eq('id', id)
    if (error) throw error
  },
}
