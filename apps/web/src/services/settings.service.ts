import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

export interface CompanyData {
  id: string; name: string; cnpj: string | null; email: string
  phone: string | null; plan: string; status: string; logo_url: string | null
}

export interface TeamMemberData {
  id: string; name: string; email: string; role: UserRole
  status: string; interviewer_pin: string | null; created_at: string
}

export interface CreateMemberResult {
  user_id: string; pin: string; name: string; email: string
}

export const settingsService = {
  async getCompany(): Promise<CompanyData | null> {
    const { data, error } = await supabase.rpc('get_my_company')
    if (error) throw error
    return data as CompanyData | null
  },

  async updateCompany(p: { name: string; cnpj: string; email: string; phone: string }) {
    const { error } = await supabase.rpc('update_my_company', {
      p_name: p.name, p_cnpj: p.cnpj, p_email: p.email, p_phone: p.phone,
    })
    if (error) throw error
  },

  async updateProfile(p: { name: string; phone: string }) {
    const { error } = await supabase.rpc('update_my_profile', {
      p_name: p.name, p_phone: p.phone,
    })
    if (error) throw error
  },

  async getTeamMembers(company_id: string): Promise<TeamMemberData[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, status, interviewer_pin, created_at')
      .eq('company_id', company_id)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as TeamMemberData[]
  },

  async createMember(p: {
    name: string
    email?: string
    phone?: string
    role: string
  }): Promise<CreateMemberResult> {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ name: p.name, email: p.email, phone: p.phone, role: p.role }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Erro ao criar membro')
    return json as CreateMemberResult
  },

  async deactivateMember(user_id: string): Promise<void> {
    const { error } = await supabase.rpc('deactivate_team_member', { p_user_id: user_id })
    if (error) throw error
  },

  async deleteMember(user_id: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ user_id }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Erro ao excluir membro')
  },

  async changePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },
}
