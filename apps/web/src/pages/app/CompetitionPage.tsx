import { useState } from 'react'
import { BarChart2, DollarSign, TrendingUp, TrendingDown, Plus, Search, Minus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompetition } from '@/hooks/useCompetition'

const TREND_MAP = {
  up:     { label: 'Subindo',   color: 'text-red-500',    icon: TrendingUp },
  down:   { label: 'Caindo',    color: 'text-green-600',  icon: TrendingDown },
  stable: { label: 'Estável',   color: 'text-slate-500',  icon: Minus },
}

export function CompetitionPage() {
  const [search, setSearch] = useState('')
  const [trendFilter, setTrendFilter] = useState('')

  const { data: visits, isLoading } = useCompetition(trendFilter ? { trend: trendFilter } : undefined)

  const filtered = (visits ?? []).filter(v =>
    !search ||
    v.competitor_name.toLowerCase().includes(search.toLowerCase()) ||
    v.store_name.toLowerCase().includes(search.toLowerCase()) ||
    v.city.toLowerCase().includes(search.toLowerCase())
  )

  const total        = visits?.length ?? 0
  const competitors  = new Set(visits?.map(v => v.competitor_name)).size
  const avgIndex     = (() => {
    const withIdx = (visits ?? []).filter(v => v.price_index !== null)
    if (!withIdx.length) return null
    return (withIdx.reduce((a, v) => a + (v.price_index ?? 0), 0) / withIdx.length).toFixed(1)
  })()
  const totalPromos  = visits?.reduce((a, v) => a + v.promotions_count, 0) ?? 0

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoramento de Concorrência</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhamento de preços e promoções dos concorrentes</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Nova Visita</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Visitas Realizadas', value: isLoading ? '...' : total,       icon: BarChart2,  color: 'text-primary' },
          { label: 'Concorrentes',       value: isLoading ? '...' : competitors,  icon: Search,     color: 'text-blue-500' },
          { label: 'Índice Médio',       value: isLoading ? '...' : avgIndex ? `${avgIndex}` : '—', icon: DollarSign, color: 'text-amber-500' },
          { label: 'Total Promoções',    value: isLoading ? '...' : totalPromos,  icon: TrendingUp, color: 'text-green-600' },
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
          <Input className="pl-9" placeholder="Buscar concorrente, loja ou cidade..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['', 'up', 'down', 'stable'].map((t) => (
            <button key={t} onClick={() => setTrendFilter(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${trendFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
              {t === '' ? 'Todos' : TREND_MAP[t as keyof typeof TREND_MAP]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {['Concorrente', 'Loja', 'Cidade', 'Índice de Preços', 'Promoções', 'Tendência', 'Observações', 'Visitado por', 'Data'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 9 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>)}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                {total === 0 ? 'Nenhuma visita registrada ainda.' : 'Nenhum resultado.'}
              </td></tr>
            ) : (
              filtered.map((v, i) => {
                const tr = TREND_MAP[v.trend] ?? TREND_MAP.stable
                return (
                  <tr key={v.id} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3 font-medium">{v.competitor_name}</td>
                    <td className="px-4 py-3">{v.store_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.city}</td>
                    <td className="px-4 py-3">
                      {v.price_index !== null ? (
                        <span className={`font-semibold ${v.price_index > 102 ? 'text-green-600' : v.price_index < 98 ? 'text-red-500' : 'text-foreground'}`}>
                          {v.price_index.toFixed(1)}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{v.promotions_count}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${tr.color}`}>
                        <tr.icon className="h-3.5 w-3.5" />{tr.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-48 truncate">{v.observations ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{(v as any).visitor?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(v.visited_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
