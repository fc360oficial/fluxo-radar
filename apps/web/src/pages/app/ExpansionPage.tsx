import { useState } from 'react'
import { Building2, MapPin, TrendingUp, Plus, Search, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useExpansion, useApproveStudy, useRejectStudy } from '@/hooks/useExpansion'

const STATUS_MAP = {
  studying:  { label: 'Em Estudo',  color: 'bg-blue-100 text-blue-700',    icon: Clock },
  approved:  { label: 'Aprovado',   color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:  { label: 'Reprovado',  color: 'bg-red-100 text-red-700',      icon: XCircle },
  on_hold:   { label: 'Suspenso',   color: 'bg-amber-100 text-amber-700',  icon: AlertCircle },
}

export function ExpansionPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: studies, isLoading } = useExpansion(statusFilter ? { status: statusFilter } : undefined)
  const approve = useApproveStudy()
  const reject  = useRejectStudy()

  const filtered = (studies ?? []).filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase()) ||
    s.region.toLowerCase().includes(search.toLowerCase())
  )

  const total    = studies?.length ?? 0
  const approved = studies?.filter(s => s.status === 'approved').length ?? 0
  const avgScore = (() => {
    const with_score = (studies ?? []).filter(s => s.viability_score !== null)
    if (!with_score.length) return null
    return (with_score.reduce((a, s) => a + (s.viability_score ?? 0), 0) / with_score.length).toFixed(1)
  })()

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expansão</h1>
          <p className="text-sm text-muted-foreground mt-1">Estudos de viabilidade para novas unidades</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Novo Estudo</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Estudos', value: isLoading ? '...' : total,    icon: Building2,  color: 'text-primary' },
          { label: 'Aprovados',        value: isLoading ? '...' : approved,  icon: CheckCircle,color: 'text-green-600' },
          { label: 'Em Estudo',        value: isLoading ? '...' : studies?.filter(s => s.status === 'studying').length ?? 0, icon: Clock, color: 'text-blue-500' },
          { label: 'Viabilidade Média',value: isLoading ? '...' : avgScore ? `${avgScore}/10` : '—', icon: TrendingUp, color: 'text-amber-500' },
        ].map((k) => (
          <div key={k.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar região, cidade ou estudo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['', 'studying', 'approved', 'rejected', 'on_hold'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
              {s === '' ? 'Todos' : STATUS_MAP[s as keyof typeof STATUS_MAP]?.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">{total === 0 ? 'Nenhum estudo registrado ainda.' : 'Nenhum resultado.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const st = STATUS_MAP[s.status] ?? STATUS_MAP.studying
            const score = s.viability_score ?? 0
            return (
              <div key={s.id} className="bg-card border rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />{s.city}, {s.state}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.color}`}>{st.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {s.population && <div><p className="text-muted-foreground">População</p><p className="font-semibold">{s.population.toLocaleString('pt-BR')}</p></div>}
                  {s.avg_income && <div><p className="text-muted-foreground">Renda Média</p><p className="font-semibold">R$ {s.avg_income.toLocaleString('pt-BR')}</p></div>}
                  <div><p className="text-muted-foreground">Concorrentes</p><p className="font-semibold">{s.competition_count}</p></div>
                  <div><p className="text-muted-foreground">Região</p><p className="font-semibold">{s.region}</p></div>
                </div>

                {s.viability_score !== null && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Viabilidade</span>
                      <span className={`font-bold ${score >= 7 ? 'text-green-600' : score >= 5 ? 'text-amber-500' : 'text-red-500'}`}>{score}/10</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${score * 10}%` }} />
                    </div>
                  </div>
                )}

                {s.status === 'studying' && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 h-8 text-xs"
                      onClick={() => approve.mutate(s.id)} disabled={approve.isPending}>
                      Aprovar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                      onClick={() => reject.mutate(s.id)} disabled={reject.isPending}>
                      Reprovar
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
