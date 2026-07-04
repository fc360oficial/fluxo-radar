import { supabase } from '@/lib/supabase'
import type { DashboardKpis } from '@/types/database'

export interface ActivityItem {
  actor_name: string
  action: string
  location: string
  activity_time: string
}

export interface ModuleStats {
  done: number
  goal: number
  unit: string
}

export interface ModuleSummary {
  campaigns:       ModuleStats
  price_research:  ModuleStats
  trade_marketing: ModuleStats
  promoters:       ModuleStats
  mystery_shopper: ModuleStats
  expansion:       ModuleStats
  competition:     ModuleStats
}

export interface TeamMember {
  user_id:        string
  name:           string
  last_action:    string
  last_location:  string
  last_active_at: string
  field_status:   'online' | 'paused' | 'offline'
}

export interface ChartPoint { name: string; value: number; color: string }

export interface VisitStatusData {
  completed: number
  in_progress: number
  pending: number
  cancelled: number
}

export interface StoreRankingItem { store_name: string; score: number; eval_count: number }

export interface IaSummary {
  survey_growth: number
  competitor_promos: number
  avg_price_delta: number
  best_expansion: string
  out_of_stock_count: number
}

export const dashboardService = {
  async getKpis(company_id: string): Promise<DashboardKpis> {
    const { data, error } = await supabase.rpc('get_dashboard_kpis', { p_company_id: company_id })
    if (error) throw error
    return data as DashboardKpis
  },

  async getActivityFeed(company_id: string): Promise<ActivityItem[]> {
    const { data, error } = await supabase.rpc('get_activity_feed', {
      p_company_id: company_id,
      p_limit: 12,
    })
    if (error) throw error
    return (data ?? []) as ActivityItem[]
  },

  async getModuleSummary(company_id: string): Promise<ModuleSummary> {
    const { data, error } = await supabase.rpc('get_module_summary', { p_company_id: company_id })
    if (error) throw error
    return data as ModuleSummary
  },

  async getTeamInField(company_id: string): Promise<TeamMember[]> {
    const { data, error } = await supabase.rpc('get_team_in_field', {
      p_company_id: company_id,
      p_limit: 8,
    })
    if (error) throw error
    return (data ?? []) as TeamMember[]
  },

  async getCollectionTypesToday(company_id: string): Promise<ChartPoint[]> {
    const { data, error } = await supabase.rpc('get_collection_types_today', { p_company_id: company_id })
    if (error) throw error
    const d = data as { surveys: number; prices: number; trade_marketing: number; promoters: number; mystery_shopper: number }
    return [
      { name: 'Pesquisas',       value: Number(d.surveys),         color: '#6366f1' },
      { name: 'Preços',          value: Number(d.prices),          color: '#f59e0b' },
      { name: 'Trade Marketing', value: Number(d.trade_marketing),  color: '#10b981' },
      { name: 'Promotores',      value: Number(d.promoters),       color: '#3b82f6' },
      { name: 'Cliente Oculto',  value: Number(d.mystery_shopper), color: '#ec4899' },
    ]
  },

  async getVisitStatusToday(company_id: string): Promise<ChartPoint[]> {
    const { data, error } = await supabase.rpc('get_visit_status_today', { p_company_id: company_id })
    if (error) throw error
    const d = data as VisitStatusData
    return [
      { name: 'Concluídas',   value: Number(d.completed),   color: '#10b981' },
      { name: 'Em andamento', value: Number(d.in_progress), color: '#3b82f6' },
      { name: 'Pendentes',    value: Number(d.pending),     color: '#f59e0b' },
      { name: 'Canceladas',   value: Number(d.cancelled),   color: '#ef4444' },
    ]
  },

  async getStoreRanking(company_id: string): Promise<StoreRankingItem[]> {
    const { data, error } = await supabase.rpc('get_store_ranking', { p_company_id: company_id, p_limit: 5 })
    if (error) throw error
    return (data ?? []) as StoreRankingItem[]
  },

  async getIaSummary(company_id: string): Promise<IaSummary> {
    const { data, error } = await supabase.rpc('get_ia_summary', { p_company_id: company_id })
    if (error) throw error
    return data as IaSummary
  },

  async getDailySurveys() {
    const { data, error } = await supabase
      .from('surveys')
      .select('surveyed_at')
      .gte('surveyed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .eq('is_valid', true)
    if (error) throw error

    const counts: Record<string, number> = {}
    for (const s of data ?? []) {
      const d = s.surveyed_at.slice(0, 10)
      counts[d] = (counts[d] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ d: date.slice(5).replace('-', '/'), v: count }))
  },
}
