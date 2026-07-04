import { supabase } from '@/lib/supabase'

export interface MobileProfile {
  id: string
  name: string
  email: string
  role: string
  company_id: string
  interviewer_pin: string | null
}

export async function getProfile(): Promise<MobileProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, name, email, role, company_id, interviewer_pin')
    .eq('id', user.id)
    .single()
  return data as MobileProfile | null
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}
