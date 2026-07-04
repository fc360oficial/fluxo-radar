import { Bell, LogOut, User, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/useTheme'

export function Header() {
  const { profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const initials = profile?.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? '?'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 gap-4">
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Notificações */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* Dark mode */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium max-w-32 truncate">
                {profile?.name ?? 'Usuário'}
              </span>
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
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
