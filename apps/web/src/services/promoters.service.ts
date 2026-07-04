import { supabase } from '@/lib/supabase'
import type { PromoterVisit, Profile } from '@/types/database'

export const promotersService = {
  async listVisits(filters?: { promoter_id?: string; status?: string }) {
    let q = supabase
      .from('promoter_visits')
      .select('*, promoter:profiles!promoter_id(name, avatar_url, phone)')
      .order('created_at', { ascending: false })

    if (filters?.promoter_id) q = q.eq('promoter_id', filters.promoter_id)
    if (filters?.status) q = q.eq('status', filters.status)

    const { data, error } = await q
    if (error) throw error
    return data as (PromoterVisit & { promoter: Pick<Profile, 'name' | 'avatar_url' | 'phone'> })[]
  },

  async listPromoters() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'interviewer')
      .eq('status', 'active')
      .order('name')
    if (error) throw error
    return data as Profile[]
  },

  async create(payload: Omit<PromoterVisit, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('promoter_visits')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as PromoterVisit
  },

  async checkIn(id: string, coords?: { latitude: number; longitude: number }) {
    const { data, error } = await supabase
      .from('promoter_visits')
      .update({ status: 'checked_in', checked_in_at: new Date().toISOString(), ...coords })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PromoterVisit
  },

  async checkOut(id: string, product_count: number) {
    const { data, error } = await supabase
      .from('promoter_visits')
      .update({ status: 'completed', checked_out_at: new Date().toISOString(), product_count })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PromoterVisit
  },
}
