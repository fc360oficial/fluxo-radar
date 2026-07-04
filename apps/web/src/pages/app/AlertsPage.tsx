import { useState } from 'react'
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle2, RefreshCw, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications'
import { Skeleton } from '@/components/ui/skeleton'
import type { NotificationType } from '@/types/database'

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  campaign_alert:     { icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50',  label: 'Alerta' },
  campaign_completed: { icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50',  label: 'Concluída' },
  sync_error:         { icon: RefreshCw,     color: 'text-red-600',    bg: 'bg-red-50',    label: 'Erro Sync' },
  goal_warning:       { icon: Megaphone,     color: 'text-blue-600',   bg: 'bg-blue-50',   label: 'Meta' },
}

function formatDate(iso: string) {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'Agora'
  if (diffMin < 60) return `${diffMin} min atrás`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h}h atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function AlertsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { data: notifications, isLoading } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const filtered = (notifications ?? []).filter(n => filter === 'all' || !n.read)
  const unreadCount = (notifications ?? []).filter(n => !n.read).length

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alertas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Notificações e alertas do sistema
            {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                {unreadCount} não lidas
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCheck className="h-4 w-4" />Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}>
            {f === 'all' ? 'Todas' : `Não lidas (${unreadCount})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-xl p-4 flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-full" /></div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="bg-card border rounded-xl p-12 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação encontrada</p>
          </div>
        ) : (
          filtered.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.campaign_alert
            return (
              <div key={n.id} className={`bg-card border rounded-xl p-4 flex items-start gap-3 transition-all ${!n.read ? 'border-primary/20 shadow-sm' : 'opacity-70'}`}>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                  <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{n.message}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(n.created_at)}</span>
                  {!n.read && (
                    <button onClick={() => markRead.mutate(n.id)} className="text-[10px] text-primary hover:underline">
                      Marcar lida
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {filtered.length === 0 && !isLoading && filter === 'all' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
          <Info className="h-4 w-4 shrink-0" />
          As notificações são geradas automaticamente quando campanhas atingem metas ou ocorrem erros de sincronização.
        </div>
      )}
    </div>
  )
}
