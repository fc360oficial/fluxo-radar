import { useState } from 'react'
import { Eye, Star, CheckCircle, Clock, Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMysteryShoppers } from '@/hooks/useMysteryShoppers'

const STATUS_MAP = {
  pending:     { label: 'Pendente',     color: 'bg-amber-100 text-amber-700'  },
  in_progress: { label: 'Em andamento', color: 'bg-blue-100 text-blue-700'    },
  completed:   { label: 'Concluída',    color: 'bg-green-100 text-green-700'  },
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${v * 10}%` }} />
      </div>
      <span className="w-5 text-right font-medium">{v}</span>
    </div>
  )
}

export function MysteryShopperPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const { data: evals, isLoading } = useMysteryShoppers(statusFilter ? { status: statusFilter } : undefined)

  const filtered = (evals ?? []).filter(e =>
    !search ||
    e.store_name.toLowerCase().includes(search.toLowerCase()) ||
    e.city.toLowerCase().includes(search.toLowerCase())
  )

  const selectedEval = filtered.find(e => e.id === selected)
  const total     = evals?.length ?? 0
  const completed = evals?.filter(e => e.status === 'completed').length ?? 0
  const avgScore  = (() => {
    const done = (evals ?? []).filter(e => e.total_score !== null)
    if (!done.length) return null
    return (done.reduce((a, e) => a + (e.total_score ?? 0), 0) / done.length).toFixed(1)
  })()

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cliente Oculto</h1>
          <p className="text-sm text-muted-foreground mt-1">Avaliações de qualidade por loja</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Nova Avaliação</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total de Avaliações', value: isLoading ? '...' : total,     icon: Eye,        color: 'text-primary' },
          { label: 'Concluídas',          value: isLoading ? '...' : completed,  icon: CheckCircle,color: 'text-green-600' },
          { label: 'Pendentes',           value: isLoading ? '...' : total - completed, icon: Clock, color: 'text-amber-500' },
          { label: 'Score Médio',         value: isLoading ? '...' : avgScore ? `${avgScore}/10` : '—', icon: Star, color: 'text-blue-500' },
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
          {['', 'pending', 'in_progress', 'completed'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
              {s === '' ? 'Todos' : STATUS_MAP[s as keyof typeof STATUS_MAP]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Lista */}
        <div className="xl:col-span-2 bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Loja', 'Cidade', 'Status', 'Score Total', 'Avaliador', 'Data'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {total === 0 ? 'Nenhuma avaliação registrada ainda.' : 'Nenhum resultado.'}
                </td></tr>
              ) : (
                filtered.map((e, i) => {
                  const st = STATUS_MAP[e.status] ?? STATUS_MAP.pending
                  const stars = e.total_score ? Math.round(e.total_score / 2) : 0
                  return (
                    <tr key={e.id}
                      onClick={() => setSelected(selected === e.id ? null : e.id)}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${selected === e.id ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/30'} ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                      <td className="px-4 py-3 font-medium">{e.store_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.city}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {e.total_score !== null ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm">{e.total_score}</span>
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, s) => (
                                <Star key={s} className={`h-3 w-3 ${s < stars ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                              ))}
                            </div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{(e as any).evaluator?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {e.evaluated_at
                          ? new Date(e.evaluated_at).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Detalhe */}
        <div className="bg-card border rounded-xl p-5">
          {selectedEval ? (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{selectedEval.store_name}</p>
                <p className="text-xs text-muted-foreground">{selectedEval.city}</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-black">{selectedEval.total_score ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Score total (0-10)</p>
              </div>
              <div className="space-y-2">
                <ScoreBar label="Atendimento"  value={selectedEval.attended_score} />
                <ScoreBar label="Limpeza"      value={selectedEval.cleanliness_score} />
                <ScoreBar label="Filas"        value={selectedEval.queue_score} />
                <ScoreBar label="Variedade"    value={selectedEval.variety_score} />
                <ScoreBar label="Preços"       value={selectedEval.price_score} />
              </div>
              {selectedEval.notes && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground leading-snug">{selectedEval.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8">
              <Eye className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Selecione uma avaliação para ver o detalhe</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
