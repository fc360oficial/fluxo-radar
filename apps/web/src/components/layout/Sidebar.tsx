import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Search, Tag, ShoppingBag, UserCheck, Eye,
  Building2, BarChart2, Map, FileText, Sparkles, Bell, Settings,
  ChevronLeft, HelpCircle, LogOut, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const mainItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
]

const moduleItems = [
  { to: '/app/campaigns',        icon: Search,      label: 'Pesquisa de Mercado' },
  { to: '/app/price-research',   icon: Tag,         label: 'Pesquisa de Preços' },
  { to: '/app/trade-marketing',  icon: ShoppingBag, label: 'Trade Marketing' },
  { to: '/app/promoters',        icon: UserCheck,   label: 'Promotores' },
  { to: '/app/mystery-shopper',  icon: Eye,         label: 'Cliente Oculto' },
  { to: '/app/expansion',        icon: Building2,   label: 'Expansão' },
  { to: '/app/competition',      icon: BarChart2,   label: 'Concorrência' },
]

const operationItems = [
  { to: '/app/map',      icon: Map,      label: 'Mapa' },
  { to: '/app/reports',  icon: FileText, label: 'Relatórios' },
  { to: '/app/ai',       icon: Sparkles, label: 'IA Radar', isNew: true },
  { to: '/app/alerts',   icon: Bell,     label: 'Alertas' },
  { to: '/app/settings', icon: Settings, label: 'Configurações' },
]

function NavItem({ item, collapsed, isActive }: {
  item: { to: string; icon: React.ElementType; label: string; isNew?: boolean }
  collapsed: boolean
  isActive: boolean
}) {
  return (
    <NavLink
      to={item.to}
      end={false}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
        'text-primary-foreground/75 hover:bg-primary-foreground/15 hover:text-primary-foreground',
        isActive && 'bg-primary-foreground/20 text-primary-foreground font-semibold',
        collapsed && 'justify-center px-0'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.isNew && (
        <span className="text-[9px] font-bold bg-primary-foreground text-primary rounded px-1 py-0.5 shrink-0 leading-none">
          Novo
        </span>
      )}
    </NavLink>
  )
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1 border-t border-primary-foreground/20" />
  return (
    <p className="px-2.5 pt-3 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground/40">
      {label}
    </p>
  )
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  function isActive(item: { to: string; exact?: boolean }) {
    return item.exact
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className={cn(
      'relative flex flex-col bg-primary transition-all duration-300 ease-in-out border-r border-primary-foreground/10',
      collapsed ? 'w-14' : 'w-56'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex h-12 items-center border-b border-primary-foreground/20 px-3 gap-2 shrink-0',
        collapsed && 'justify-center px-0'
      )}>
        {collapsed ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-foreground/20">
            <BarChart3 className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Fluxo Radar" className="h-7 w-7 object-contain mix-blend-multiply shrink-0" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[13px] font-black tracking-tight text-primary-foreground">Fluxo Radar</span>
              <span className="text-[8px] text-primary-foreground/60 font-medium tracking-wider uppercase">Pesquisa de Mercado</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav
        className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {mainItems.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} isActive={isActive(item)} />
        ))}

        <SectionLabel label="Módulos" collapsed={collapsed} />
        {moduleItems.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} isActive={isActive(item)} />
        ))}

        <SectionLabel label="Operações" collapsed={collapsed} />
        {operationItems.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} isActive={isActive(item)} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-primary-foreground/20 px-2 py-1 space-y-0.5 shrink-0">
        {!collapsed && (
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors">
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span>Central de Ajuda</span>
          </button>
        )}
        <button
          onClick={handleSignOut}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-primary-foreground/70 hover:bg-primary-foreground/15 hover:text-primary-foreground transition-colors',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex w-full items-center justify-center rounded-lg py-1 text-primary-foreground/40 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all',
            collapsed && 'rotate-180'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  )
}
