import { supabase } from '@/lib/supabase'
import type { ExpansionStudy } from '@/types/database'

export const expansionService = {
  async list(filters?: { status?: string }) {
    let q = supabase
      .from('expansion_studies')
      .select('*, creator:profiles!created_by(name)')
      .order('created_at', { ascending: false })

    if (filters?.status) q = q.eq('status', filters.status)

    const { data, error } = await q
    if (error) throw error
    return data as (ExpansionStudy & { creator: { name: string } })[]
  },

  async create(payload: Omit<ExpansionStudy, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('expansion_studies')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as ExpansionStudy
  },

  async update(id: string, payload: Partial<ExpansionStudy>) {
    const { data, error } = await supabase
      .from('expansion_studies')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ExpansionStudy
  },

  async approve(id: string) {
    return this.update(id, { status: 'approved' })
  },

  async reject(id: string) {
    return this.update(id, { status: 'rejected' })
  },
}
