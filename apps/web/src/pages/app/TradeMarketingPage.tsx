import { useState } from 'react'
import { ShoppingBag, CheckCircle, Clock, XCircle, Plus, Search, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTradeMarketing } from '@/hooks/useTradeMarketing'

const STATUS_MAP = {
  pending:     { label: 'Pendente',       color: 'bg-amber-100 text-amber-700',  icon: Clock },
  in_progress: { label: 'Em andamento',   color: 'bg-blue-100 text-blue-700',    icon: Clock },
  completed:   { label: 'Concluída',      color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  cancelled:   { label: 'Cancelada',      color: 'bg-red-100 text-red-700',      icon: XCircle },
}

export function TradeMarketingPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: visits, isLoading } = useTradeMarketing(statusFilter ? { status: statusFilter } : undefined)

  const filtered = (visits ?? []).filter(v =>
    !search ||
    v.store_name.toLowerCase().includes(search.toLowerCase()) ||
    v.city.toLowerCase().includes(search.toLowerCase())
  )

  const total     = visits?.length ?? 0
  const completed = visits?.filter(v => v.status === 'completed').length ?? 0
  const pending   = visits?.filter(v => v.status === 'pending').length ?? 0
  const avgScore  = (() => {
    const with_score = (visits ?? []).filter(v => v.score !== null)
    if (!with_score.length) return null
    return Math.round(with_score.reduce((a, v) => a + (v.score ?? 0), 0) / with_score.length)
  })()

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trade Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">Visitas e avaliação de PDVs</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Nova Visita</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Visitas', value: isLoading ? '...' : total,     icon: ShoppingBag, color: 'text-primary' },
          { label: 'Concluídas',       value: isLoading ? '...' : completed,  icon: CheckCircle, color: 'text-green-600' },
          { label: 'Pendentes',        value: isLoading ? '...' : pending,    icon: Clock,       color: 'text-amber-500' },
          { label: 'Score Médio',      value: isLoading ? '...' : avgScore !== null ? `${avgScore}` : '—', icon: Star, color: 'text-blue-500' },
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
          <Input className="pl-9" placeholder="Buscar loja ou cidade..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['', 'pending', 'in_progress', 'completed', 'cancelled'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
              {s === '' ? 'Todos' : STATUS_MAP[s as keyof typeof STATUS_MAP]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {['Loja', 'Cidade', 'Tipo de Visita', 'Status', 'Score', 'Fotos', 'Responsável', 'Data'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                {total === 0 ? 'Nenhuma visita registrada ainda.' : 'Nenhum resultado.'}
              </td></tr>
            ) : (
              filtered.map((v, i) => {
                const st = STATUS_MAP[v.status] ?? STATUS_MAP.pending
                return (
                  <tr key={v.id} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3 font-medium">{v.store_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.city}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{v.visit_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {v.score !== null ? (
                        <span className={`text-sm font-bold ${v.score >= 80 ? 'text-green-600' : v.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                          {v.score}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{v.photos_count}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{(v as any).visitor?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {v.visited_at
                        ? new Date(v.visited_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
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
