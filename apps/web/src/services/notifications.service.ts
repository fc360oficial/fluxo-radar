import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types/database'

export const notificationsService = {
  async list() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data as Notification[]
  },

  async markRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async markAllRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('read', false)
    if (error) throw error
  },

  async countUnread() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
    if (error) throw error
    return count ?? 0
  },
}
