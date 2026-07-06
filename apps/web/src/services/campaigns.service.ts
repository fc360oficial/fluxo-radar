import { supabase } from '@/lib/supabase'
import type { Campaign, CampaignProgress } from '@/types/database'

export interface CreateCampaignData {
  name: string
  city: string
  neighborhood: string
  state: string
  responsible_id: string
  start_date: string
  end_date?: string
  goal: number
  notes?: string
}

export const campaignsService = {
  async list() {
    const { data, error } = await supabase
      .from('campaign_progress')
      .select('*')
      .order('created_at' as never, { ascending: false })
    if (error) throw error
    return data as CampaignProgress[]
  },

  async listRaw() {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, responsible:profiles!campaigns_responsible_id_fkey(id, name, avatar_url)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as (Campaign & { responsible: { id: string; name: string; avatar_url: string | null } })[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, responsible:profiles!campaigns_responsible_id_fkey(id, name, avatar_url)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Campaign & { responsible: { id: string; name: string; avatar_url: string | null } }
  },

  async getProgress(id: string) {
    const { data, error } = await supabase
      .from('campaign_progress')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as CampaignProgress
  },

  async create(payload: CreateCampaignData & { company_id: string; created_by: string }) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data as Campaign
  },

  async update(id: string, payload: Partial<CreateCampaignData>) {
    const { data, error } = await supabase
      .from('campaigns')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Campaign
  },

  async activate(id: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Campaign
  },

  async cancel(id: string, cancelled_by: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Campaign
  },

  async getInterviewers(campaign_id: string) {
    const { data: surveys } = await supabase
      .from('surveys')
      .select('interviewer_id, surveyed_at')
      .eq('campaign_id', campaign_id)
      .eq('is_valid', true)

    if (!surveys?.length) return []

    const todayBR = new Date().toLocaleDateString('pt-BR')
    const stats: Record<string, { total: number; today: number; last: string }> = {}
    for (const s of surveys) {
      const id = s.interviewer_id as string
      if (!stats[id]) stats[id] = { total: 0, today: 0, last: '' }
      stats[id].total++
      if (new Date(s.surveyed_at as string).toLocaleDateString('pt-BR') === todayBR) stats[id].today++
      if ((s.surveyed_at as string) > stats[id].last) stats[id].last = s.surveyed_at as string
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', Object.keys(stats))
    if (!profiles) return []

    return profiles.map(p => ({
      interviewer_id: p.id,
      name: p.name,
      avatar_url: p.avatar_url,
      total: stats[p.id]?.total ?? 0,
      today: stats[p.id]?.today ?? 0,
      last_survey_at: stats[p.id]?.last ?? null,
    })).sort((a, b) => b.total - a.total)
  },

  async getSupervisors() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, role')
      .in('role', ['admin', 'supervisor'])
      .eq('status', 'active')
    if (error) throw error
    return data
  },
}
