import { MapPin, Search, Navigation, Clock, UserCheck, ShoppingBag, Eye, BookOpen } from 'lucide-react'
import { useState, useMemo } from 'react'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTeamInField } from '@/hooks/useDashboard'
import { relativeTime, initials } from '@/lib/utils'
import { TeamMap, MODULE_COLOR } from '@/components/map/TeamMap'
import type { Member } from '@/components/map/TeamMap'

// ── Types ─────────────────────────────────────────────────────────────────────
type ModuleKey = 'all' | 'survey' | 'promoters' | 'trade' | 'mystery'

const MODULE_CONFIG: { key: ModuleKey; label: string; icon: React.ElementType; bgClass: string }[] = [
  { key: 'all',       label: 'Todos',                 icon: MapPin,      bgClass: '' },
  { key: 'survey',    label: 'Pesquisa de Mercado',   icon: BookOpen,    bgClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { key: 'promoters', label: 'Gestão de Promotores',  icon: UserCheck,   bgClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'trade',     label: 'Trade Marketing',        icon: ShoppingBag, bgClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { key: 'mystery',   label: 'Cliente Oculto',         icon: Eye,         bgClass: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
]

const STATUS_MAP = {
  online:  { label: 'Online',  dot: 'bg-green-500', text: 'text-green-600' },
  paused:  { label: 'Pausado', dot: 'bg-amber-400', text: 'text-amber-600' },
  offline: { label: 'Offline', dot: 'bg-slate-400', text: 'text-slate-500' },
} as const
type FieldStatus = keyof typeof STATUS_MAP

const AVATAR_COLORS = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-blue-500','bg-pink-500','bg-purple-500','bg-teal-500','bg-rose-500']
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

const STATUS_FILTERS = ['Todos', 'Online', 'Pausado', 'Offline']

// ── Mock promoters em campo (substituir por API quando QR Code for integrado) ──
const MOCK_PROMOTERS: Member[] = [
  {
    user_id: 'prom-paulo',
    name: 'Paulo Santos',
    last_action: 'Check-in em loja · Aurora',
    last_location: 'Atacarejo Sul',
    last_active_at: new Date(Date.now() - 42 * 60_000).toISOString(),
    field_status: 'online',
    module: 'promoters',
    lat: -8.192,
    lng: -34.985,
  },
]

// ── Legend dot ────────────────────────────────────────────────────────────────
function ModuleDot({ moduleKey }: { moduleKey: string }) {
  const color = MODULE_COLOR[moduleKey]
  const isSquare = moduleKey !== 'survey'
  return (
    <span
      className="inline-block shrink-0"
      style={{
        width: 10, height: 10,
        background: color ?? '#94a3b8',
        borderRadius: isSquare ? 2 : '50%',
        border: '1.5px solid white',
        boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }}
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function MapPage() {
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('Todos')
  const [moduleFilter, setModule]   = useState<ModuleKey>('all')
  const [selected, setSelected]     = useState<string | null>(null)
  const { data: teamInField = [], refetch } = useTeamInField()

  // Tag real API members as 'survey' module
  const surveyMembers: Member[] = useMemo(
    () => teamInField.map(m => ({ ...m, module: 'survey' })),
    [teamInField]
  )

  // Merge real + mock
  const allMembers: Member[] = useMemo(
    () => [...surveyMembers, ...MOCK_PROMOTERS],
    [surveyMembers]
  )

  const filtered = useMemo(() => allMembers.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.last_location ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'Todos' || STATUS_MAP[t.field_status as FieldStatus]?.label === statusFilter
    const matchModule = moduleFilter === 'all' || t.module === moduleFilter
    return matchSearch && matchStatus && matchModule
  }), [allMembers, search, statusFilter, moduleFilter])

  // KPI counts (from allMembers)
  const online  = allMembers.filter(t => t.field_status === 'online').length
  const paused  = allMembers.filter(t => t.field_status === 'paused').length
  const offline = allMembers.filter(t => t.field_status === 'offline').length

  const mapMembers = selected ? filtered.filter(m => m.user_id === selected) : filtered

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa Inteligente</h1>
          <p className="text-sm text-muted-foreground mt-1">Localização em tempo real de toda a equipe em campo</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { setSelected(null); refetch() }}>
          <Navigation className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Em campo',  value: online + paused, color: 'text-green-600' },
          { label: 'Online',    value: online,           color: 'text-green-600' },
          { label: 'Pausados',  value: paused,           color: 'text-amber-600' },
          { label: 'Offline',   value: offline,          color: 'text-slate-500' },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Module filter tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {MODULE_CONFIG.map(m => {
          const count = m.key === 'all' ? allMembers.length : allMembers.filter(x => x.module === m.key).length
          const active = moduleFilter === m.key
          return (
            <button
              key={m.key}
              onClick={() => { setModule(m.key); setSelected(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {m.key !== 'all' && !active && <ModuleDot moduleKey={m.key} />}
              <m.icon className={`h-3.5 w-3.5 ${active ? '' : 'opacity-60'}`} />
              {m.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Map + list ── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4" style={{ height: '520px' }}>
        {/* Lista */}
        <div className="xl:col-span-1 bg-card border rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-sm" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button key={f} onClick={() => setStatus(f)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
            )}
            {filtered.map(person => {
              const st = STATUS_MAP[person.field_status as FieldStatus] ?? STATUS_MAP.offline
              const hasCoords = !!(person.lat && person.lng)
              const modCfg = MODULE_CONFIG.find(m => m.key === person.module)
              return (
                <button
                  key={person.user_id}
                  onClick={() => setSelected(selected === person.user_id ? null : person.user_id)}
                  className={`flex w-full items-center gap-2 p-2 rounded-lg transition-colors text-left ${selected === person.user_id ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-muted/50'}`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`${avatarColor(person.name)} text-white text-[10px] font-bold`}>
                        {initials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${st.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="text-xs font-semibold truncate">{person.name}</p>
                      {!hasCoords && <span title="Sem GPS"><MapPin className="h-3 w-3 text-muted-foreground shrink-0" /></span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{person.last_location || person.last_action}</p>
                    {modCfg && modCfg.key !== 'all' && (
                      <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${modCfg.bgClass}`}>
                        {modCfg.label}
                      </span>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />{relativeTime(person.last_active_at)}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="border-t px-3 py-2 space-y-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Legenda</p>
            {MODULE_CONFIG.filter(m => m.key !== 'all').map(m => (
              <div key={m.key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <ModuleDot moduleKey={m.key} />
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Mapa */}
        <div className="xl:col-span-3 bg-card border rounded-xl overflow-hidden relative">
          {filtered.some(m => m.lat && m.lng) ? (
            <TeamMap members={mapMembers} height="100%" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-slate-50 dark:bg-slate-900">
              <MapPin className="h-10 w-10 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">Aguardando localização</p>
                <p className="text-xs opacity-60 mt-1">Os agentes precisam estar com o app mobile ativo para aparecer aqui</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
