import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Megaphone,
  ClipboardList,
  Users,
  Map,
  Sparkles,
  FileText,
  Settings,
  ChevronLeft,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/app',             icon: LayoutDashboard, label: 'Dashboard',       exact: true },
  { to: '/app/campaigns',   icon: Megaphone,       label: 'Campanhas' },
  { to: '/app/surveys',     icon: ClipboardList,   label: 'Pesquisas' },
  { to: '/app/interviewers',icon: Users,           label: 'Entrevistadores' },
  { to: '/app/map',         icon: Map,             label: 'Mapa' },
  { to: '/app/ai',          icon: Sparkles,        label: 'Inteligência Artificial' },
  { to: '/app/reports',     icon: FileText,        label: 'Relatórios' },
  { to: '/app/settings',    icon: Settings,        label: 'Configurações' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-sidebar-background transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex h-14 items-center border-b px-3 gap-3',
        collapsed && 'justify-center px-0'
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <BarChart3 className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm truncate">Fluxo Pesquisa</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-primary/10 text-sidebar-primary',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full h-8 text-muted-foreground hover:text-foreground transition-transform',
            collapsed && 'rotate-180'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  )
}
