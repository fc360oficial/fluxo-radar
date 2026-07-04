import { supabase } from '@/lib/supabase'
import type { TradeMarketingVisit } from '@/types/database'

export const tradeMarketingService = {
  async list(filters?: { status?: string; city?: string }) {
    let q = supabase
      .from('trade_marketing_visits')
      .select('*, visitor:profiles!visited_by(name, avatar_url)')
      .order('created_at', { ascending: false })

    if (filters?.status) q = q.eq('status', filters.status)
    if (filters?.city) q = q.ilike('city', `%${filters.city}%`)

    const { data, error } = await q
    if (error) throw error
    return data as (TradeMarketingVisit & { visitor: { name: string; avatar_url: string | null } })[]
  },

  async create(payload: Omit<TradeMarketingVisit, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('trade_marketing_visits')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as TradeMarketingVisit
  },

  async complete(id: string, score: number) {
    const { data, error } = await supabase
      .from('trade_marketing_visits')
      .update({ status: 'completed', score, visited_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as TradeMarketingVisit
  },

  async cancel(id: string) {
    const { data, error } = await supabase
      .from('trade_marketing_visits')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as TradeMarketingVisit
  },
}
