import { supabase } from '@/lib/supabase'
import type { CompetitorVisit } from '@/types/database'

export const competitionService = {
  async list(filters?: { competitor_name?: string; city?: string; trend?: string }) {
    let q = supabase
      .from('competitor_visits')
      .select('*, visitor:profiles!visited_by(name, avatar_url)')
      .order('visited_at', { ascending: false })

    if (filters?.competitor_name) q = q.ilike('competitor_name', `%${filters.competitor_name}%`)
    if (filters?.city) q = q.ilike('city', `%${filters.city}%`)
    if (filters?.trend) q = q.eq('trend', filters.trend)

    const { data, error } = await q
    if (error) throw error
    return data as (CompetitorVisit & { visitor: { name: string; avatar_url: string | null } })[]
  },

  async create(payload: Omit<CompetitorVisit, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('competitor_visits')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as CompetitorVisit
  },

  async summaryByCompetitor() {
    const { data, error } = await supabase
      .from('competitor_visits')
      .select('competitor_name, price_index, promotions_count, trend, visited_at')
      .order('visited_at', { ascending: false })
    if (error) throw error
    return data
  },
}
