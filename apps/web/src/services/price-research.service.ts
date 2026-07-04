import { supabase } from '@/lib/supabase'
import type { PriceCollection } from '@/types/database'

export const priceResearchService = {
  async list(filters?: { campaign_id?: string; store_name?: string; in_stock?: boolean }) {
    let q = supabase
      .from('price_collections')
      .select('*, collector:profiles!collected_by(name)')
      .order('collected_at', { ascending: false })

    if (filters?.campaign_id) q = q.eq('campaign_id', filters.campaign_id)
    if (filters?.store_name) q = q.ilike('store_name', `%${filters.store_name}%`)
    if (filters?.in_stock !== undefined) q = q.eq('in_stock', filters.in_stock)

    const { data, error } = await q
    if (error) throw error
    return data as (PriceCollection & { collector: { name: string } })[]
  },

  async create(payload: Omit<PriceCollection, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('price_collections')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as PriceCollection
  },

  async update(id: string, payload: Partial<PriceCollection>) {
    const { data, error } = await supabase
      .from('price_collections')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PriceCollection
  },

  async summaryByStore() {
    const { data, error } = await supabase
      .from('price_collections')
      .select('store_name, city, current_price, reference_price, in_stock, product_name, collected_at')
      .order('collected_at', { ascending: false })
    if (error) throw error
    return data
  },
}
