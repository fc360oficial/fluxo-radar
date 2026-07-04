import { Bell, Moon, Sun, Calendar, ChevronDown, Check, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/useTheme'
import { useUnreadCount, useNotifications, useMarkAllRead } from '@/hooks/useNotifications'
import { useCampaigns } from '@/hooks/useCampaigns'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  viewer: 'Visualizador',
  interviewer: 'Entrevistador',
}

export function Header() {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  const { data: unreadCount = 0 } = useUnreadCount()
  const { data: notifications = [] } = useNotifications()
  const { data: campaigns = [] } = useCampaigns()
  const markAllRead = useMarkAllRead()

  const initials = profile?.name
    ?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() ?? '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const selectedName = campaigns.find(c => c.id === selectedCampaign)?.name ?? 'Todas as campanhas'

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-5 gap-4 shrink-0">

      {/* Date range */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-lg px-3 py-1.5 cursor-default">
        <Calendar className="h-4 w-4" />
        <span className="font-medium text-foreground">{fmt(firstOfMonth)} – {fmt(today)}</span>
      </div>

      <div className="flex items-center gap-2 ml-auto">

        {/* Campaign filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-sm font-medium border rounded-lg px-3 py-1.5 hover:bg-muted/50 transition-colors max-w-52">
              <span className="truncate">{selectedName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Filtrar por campanha</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedCampaign(null)}>
              <Check className={`h-3.5 w-3.5 mr-2 ${selectedCampaign === null ? 'opacity-100' : 'opacity-0'}`} />
              Todas as campanhas
            </DropdownMenuItem>
            {campaigns.length === 0 && (
              <DropdownMenuItem disabled>Nenhuma campanha cadastrada</DropdownMenuItem>
            )}
            {campaigns.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => setSelectedCampaign(c.id)}>
                <Check className={`h-3.5 w-3.5 mr-2 shrink-0 ${selectedCampaign === c.id ? 'opacity-100' : 'opacity-0'}`} />
                <span className="truncate">{c.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost" size="sm" className="h-6 text-xs gap-1"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <CheckCheck className="h-3 w-3" /> Marcar tudo lido
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className={`flex flex-col items-start gap-0.5 py-2.5 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    <span className="text-xs font-medium leading-tight">{n.title}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground leading-snug pl-3">{n.message}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dark mode */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 gap-2.5 px-2.5 rounded-xl">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold max-w-28 truncate">{profile?.name ?? 'Usuário'}</span>
                <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[profile?.role ?? ''] ?? ''}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{profile?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{profile?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/app/settings')}>
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}
