import { MapPin, Search, Navigation, Clock } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTeamInField } from '@/hooks/useDashboard'
import { relativeTime, initials } from '@/lib/utils'
import { TeamMap } from '@/components/map/TeamMap'

const STATUS_MAP = {
  online:  { label: 'Online',   dot: 'bg-green-500',  text: 'text-green-600' },
  paused:  { label: 'Pausado',  dot: 'bg-amber-400',  text: 'text-amber-600' },
  offline: { label: 'Offline',  dot: 'bg-slate-400',  text: 'text-slate-500' },
} as const

type FieldStatus = keyof typeof STATUS_MAP

const AVATAR_COLORS = ['bg-indigo-500','bg-emerald-500','bg-amber-500','bg-blue-500','bg-pink-500','bg-purple-500','bg-teal-500','bg-rose-500']
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

const FILTERS = ['Todos', 'Online', 'Pausado', 'Offline']

export function MapPage() {
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('Todos')
  const [selected, setSelected] = useState<string | null>(null)
  const { data: teamInField = [], refetch } = useTeamInField()

  const filtered = teamInField.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.last_location ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'Todos' || STATUS_MAP[t.field_status as FieldStatus]?.label === filter
    return matchSearch && matchFilter
  })

  const online  = teamInField.filter(t => t.field_status === 'online').length
  const paused  = teamInField.filter(t => t.field_status === 'paused').length
  const offline = teamInField.filter(t => t.field_status === 'offline').length

  const mapMembers = selected
    ? filtered.filter(m => m.user_id === selected)
    : filtered

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa Inteligente</h1>
          <p className="text-sm text-muted-foreground mt-1">Localização em tempo real da equipe em campo</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { setSelected(null); refetch() }}>
          <Navigation className="h-4 w-4" />Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Em campo',  value: online + paused, color: 'text-green-600' },
          { label: 'Online',    value: online,           color: 'text-green-600' },
          { label: 'Pausados',  value: paused,           color: 'text-amber-600' },
          { label: 'Offline',   value: offline,          color: 'text-slate-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4" style={{ height: '520px' }}>
        {/* Lista da equipe */}
        <div className="xl:col-span-1 bg-card border rounded-xl flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input className="pl-8 h-8 text-sm" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
            )}
            {filtered.map((person) => {
              const st = STATUS_MAP[person.field_status as FieldStatus] ?? STATUS_MAP.offline
              const hasCoords = !!(person.lat && person.lng)
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
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-semibold truncate">{person.name}</p>
                      {!hasCoords && <MapPin className="h-3 w-3 text-muted-foreground shrink-0" title="Sem GPS" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{person.last_location || person.last_action}</p>
                  </div>
                  <div className="shrink-0">
                    <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />{relativeTime(person.last_active_at)}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mapa Leaflet */}
        <div className="xl:col-span-3 bg-card border rounded-xl overflow-hidden relative">
          {filtered.some(m => m.lat && m.lng) ? (
            <TeamMap members={mapMembers} height="100%" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-slate-50 dark:bg-slate-900">
              <MapPin className="h-10 w-10 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">Aguardando localização</p>
                <p className="text-xs opacity-60 mt-1">Os entrevistadores precisam abrir o app mobile para aparecer aqui</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
