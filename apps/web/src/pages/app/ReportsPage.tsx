import { FileText, Download, Search, Clock, CheckCircle, BarChart3, RefreshCw, Tag, ShoppingBag, UserCheck, Eye, Building2, BarChart2, Megaphone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaigns } from '@/hooks/useCampaigns'
import { useModuleSummary } from '@/hooks/useDashboard'
import type { ModuleSummary } from '@/services/dashboard.service'

const TYPE_COLORS: Record<string, string> = {
  'Pesquisa de Mercado': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Pesquisa de Preços':  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Trade Marketing':     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Cliente Oculto':      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Expansão':            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Concorrência':        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Promotores':          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

const MODULE_SUMMARY_CONFIG: { key: keyof ModuleSummary; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'campaigns',       label: 'Pesquisa de Mercado', icon: Megaphone,   color: '#6366f1' },
  { key: 'price_research',  label: 'Pesquisa de Preços',  icon: Tag,         color: '#f59e0b' },
  { key: 'trade_marketing', label: 'Trade Marketing',     icon: ShoppingBag, color: '#10b981' },
  { key: 'promoters',       label: 'Promotores',          icon: UserCheck,   color: '#3b82f6' },
  { key: 'mystery_shopper', label: 'Cliente Oculto',      icon: Eye,         color: '#ec4899' },
  { key: 'expansion',       label: 'Expansão',            icon: Building2,   color: '#8b5cf6' },
  { key: 'competition',     label: 'Concorrência',        icon: BarChart2,   color: '#64748b' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ReportsPage() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { data: campaigns = [], isLoading } = useCampaigns()
  const { data: moduleSummary } = useModuleSummary()

  // Each campaign maps to a "report" entry
  const reports = campaigns.map((c) => ({
    id:     c.id,
    name:   `${c.name} — ${c.neighborhood}, ${c.city}`,
    type:   'Pesquisa de Mercado' as const,
    status: c.status === 'completed' ? 'pronto' : c.status === 'active' ? 'andamento' : 'aguardando',
    date:   formatDate(c.start_date),
    surveys: null as number | null,
  }))

  const filtered = reports.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  )

  const ready = reports.filter(r => r.status === 'pronto').length

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumo por módulo e histórico de campanhas</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total de campanhas</p>
          <p className="text-2xl font-bold mt-1">{campaigns.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">cadastradas</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Concluídas</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{ready}</p>
          <p className="text-xs text-muted-foreground mt-0.5">campanhas finalizadas</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Ativas agora</p>
          <p className="text-2xl font-bold mt-1 text-primary">{campaigns.filter(c => c.status === 'active').length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">em andamento</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total de pesquisas</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">
            {moduleSummary ? moduleSummary.campaigns.done : '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">entrevistas validadas</p>
        </div>
      </div>

      {/* Module summary cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Resumo por Módulo</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {MODULE_SUMMARY_CONFIG.map((cfg) => {
            const stats = moduleSummary?.[cfg.key]
            const pct = stats ? Math.min(100, Math.round((stats.done / Math.max(stats.goal, 1)) * 100)) : 0
            return (
              <div key={cfg.key} className="bg-card border rounded-xl p-4 space-y-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: cfg.color + '1a' }}>
                  <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{cfg.label}</p>
                  <p className="text-lg font-bold mt-0.5">{stats ? stats.done : '—'}</p>
                  <p className="text-[10px] text-muted-foreground">{stats ? `/${stats.goal} ${stats.unit}` : ''}</p>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Campaign table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Campanhas</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar campanha..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Campanha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Tipo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Início</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-3" colSpan={5}><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Nenhuma campanha encontrada</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[r.type] ?? ''}`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.status === 'pronto' && (
                        <span className="flex items-center justify-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" /> Concluída
                        </span>
                      )}
                      {r.status === 'andamento' && (
                        <span className="flex items-center justify-center gap-1 text-xs font-medium text-blue-600">
                          <RefreshCw className="h-3.5 w-3.5" /> Em andamento
                        </span>
                      )}
                      {r.status === 'aguardando' && (
                        <span className="flex items-center justify-center gap-1 text-xs font-medium text-amber-600">
                          <Clock className="h-3.5 w-3.5" /> Rascunho
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">{r.date}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ver análise" onClick={() => navigate(`/app/campaigns/${r.id}/analysis`)}>
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Exportar — em desenvolvimento" disabled>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
