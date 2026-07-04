import { useState } from 'react'
import { Tag, TrendingUp, TrendingDown, AlertTriangle, Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePriceResearch } from '@/hooks/usePriceResearch'

function variationPct(current: number, ref: number | null) {
  if (!ref || ref === 0) return null
  return ((current - ref) / ref) * 100
}

export function PriceResearchPage() {
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'rupture'>('all')

  const { data: items, isLoading } = usePriceResearch(
    stockFilter === 'rupture' ? { in_stock: false }
    : stockFilter === 'in_stock' ? { in_stock: true }
    : undefined
  )

  const filtered = (items ?? []).filter(p =>
    !search ||
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    p.store_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.product_brand ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const total         = items?.length ?? 0
  const ruptureCount  = items?.filter(p => !p.in_stock).length ?? 0
  const storeCount    = new Set(items?.map(p => p.store_name)).size

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pesquisa de Preços</h1>
          <p className="text-sm text-muted-foreground mt-1">Coleta e monitoramento de preços por loja</p>
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Nova Coleta</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Preços Coletados', value: isLoading ? '...' : total,        icon: Tag,           color: 'text-primary' },
          { label: 'Ruptura',          value: isLoading ? '...' : ruptureCount,  icon: AlertTriangle, color: 'text-red-500' },
          { label: 'Lojas Visitadas',  value: isLoading ? '...' : storeCount,    icon: Search,        color: 'text-blue-500' },
          { label: 'Em Estoque',       value: isLoading ? '...' : total - ruptureCount, icon: TrendingUp, color: 'text-green-600' },
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
          <Input className="pl-9" placeholder="Buscar produto, loja ou marca..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(['all', 'in_stock', 'rupture'] as const).map((f) => (
            <button key={f} onClick={() => setStockFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${stockFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
              {f === 'all' ? 'Todos' : f === 'in_stock' ? 'Em estoque' : 'Ruptura'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {['Produto', 'Marca', 'Loja', 'Cidade', 'Preço Atual', 'Referência', 'Variação', 'Estoque', 'Coletado por', 'Data'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 10 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                {total === 0 ? 'Nenhuma coleta registrada ainda.' : 'Nenhum resultado.'}
              </td></tr>
            ) : (
              filtered.map((p, i) => {
                const pct = variationPct(p.current_price, p.reference_price)
                return (
                  <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-4 py-3 font-medium">{p.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.product_brand ?? '—'}</td>
                    <td className="px-4 py-3">{p.store_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.city}</td>
                    <td className="px-4 py-3 font-semibold">R$ {p.current_price.toFixed(2).replace('.', ',')}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.reference_price ? `R$ ${p.reference_price.toFixed(2).replace('.', ',')}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {pct !== null ? (
                        <span className={`flex items-center gap-0.5 text-xs font-semibold ${pct > 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {pct > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.in_stock
                        ? <span className="text-xs text-green-600 font-medium">Em estoque</span>
                        : <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><AlertTriangle className="h-3 w-3" />Ruptura</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{(p as any).collector?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(p.collected_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
