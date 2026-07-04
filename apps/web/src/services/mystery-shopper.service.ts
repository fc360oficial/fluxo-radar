import { supabase } from '@/lib/supabase'
import type { MysteryShopperEvaluation } from '@/types/database'

export const mysteryShopperService = {
  async list(filters?: { status?: string; city?: string }) {
    let q = supabase
      .from('mystery_shopper_evaluations')
      .select('*, evaluator:profiles!evaluator_id(name, avatar_url)')
      .order('created_at', { ascending: false })

    if (filters?.status) q = q.eq('status', filters.status)
    if (filters?.city) q = q.ilike('city', `%${filters.city}%`)

    const { data, error } = await q
    if (error) throw error
    return data as (MysteryShopperEvaluation & { evaluator: { name: string; avatar_url: string | null } })[]
  },

  async create(payload: Omit<MysteryShopperEvaluation, 'id' | 'total_score' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('mystery_shopper_evaluations')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as MysteryShopperEvaluation
  },

  async complete(id: string, scores: {
    attended_score: number; cleanliness_score: number
    queue_score: number; variety_score: number; price_score: number
    notes?: string
  }) {
    const { data, error } = await supabase
      .from('mystery_shopper_evaluations')
      .update({ ...scores, status: 'completed', evaluated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as MysteryShopperEvaluation
  },
}
