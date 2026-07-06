import { Sparkles, TrendingUp, AlertTriangle, MapPin, DollarSign, BarChart2, Eye, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useIaSummary, useModuleSummary } from '@/hooks/useDashboard'

const PRIORITY_COLORS: Record<string, string> = {
  crítica: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  alta:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  média:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  baixa:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const MODULE_CONFIG = [
  { key: 'campaigns',       name: 'Pesquisa de Mercado', color: '#6366f1' },
  { key: 'price_research',  name: 'Pesquisa de Preços',  color: '#f59e0b' },
  { key: 'trade_marketing', name: 'Trade Marketing',     color: '#10b981' },
  { key: 'promoters',       name: 'Promotores',          color: '#3b82f6' },
  { key: 'mystery_shopper', name: 'Cliente Oculto',      color: '#ec4899' },
  { key: 'expansion',       name: 'Expansão',            color: '#8b5cf6' },
  { key: 'competition',     name: 'Concorrência',        color: '#64748b' },
] as const

export function AIRadarPage() {
  const { data: iaSummary, refetch, isFetching } = useIaSummary()
  const { data: moduleSummary } = useModuleSummary()

  const insights = [
    {
      icon: TrendingUp,
      color: iaSummary && iaSummary.survey_growth >= 0 ? 'text-green-600' : 'text-red-600',
      bg: iaSummary && iaSummary.survey_growth >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
      border: iaSummary && iaSummary.survey_growth >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800',
      tag: 'Mercado',
      priority: iaSummary ? (iaSummary.survey_growth > 10 ? 'alta' : 'média') : 'média',
      title: 'Intenção de compra',
      desc: iaSummary
        ? `${iaSummary.survey_growth >= 0 ? '+' : ''}${iaSummary.survey_growth}% em pesquisas comparado à semana passada.`
        : 'Carregando dados…',
    },
    {
      icon: iaSummary && iaSummary.out_of_stock_count > 0 ? AlertTriangle : Eye,
      color: iaSummary && iaSummary.out_of_stock_count > 0 ? 'text-red-600' : 'text-emerald-600',
      bg: iaSummary && iaSummary.out_of_stock_count > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20',
      border: iaSummary && iaSummary.out_of_stock_count > 0 ? 'border-red-200 dark:border-red-800' : 'border-emerald-200 dark:border-emerald-800',
      tag: 'Ruptura',
      priority: iaSummary && iaSummary.out_of_stock_count > 5 ? 'crítica' : iaSummary && iaSummary.out_of_stock_count > 0 ? 'alta' : 'baixa',
      title: 'Estoque',
      desc: iaSummary
        ? iaSummary.out_of_stock_count > 0
          ? `${iaSummary.out_of_stock_count} produto${iaSummary.out_of_stock_count !== 1 ? 's' : ''} sem estoque identificado${iaSummary.out_of_stock_count !== 1 ? 's' : ''}.`
          : 'Nenhuma ruptura de estoque identificada.'
        : 'Carregando dados…',
    },
    {
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      tag: 'Preços',
      priority: iaSummary && Math.abs(iaSummary.avg_price_delta) > 5 ? 'alta' : 'média',
      title: 'Preço médio vs referência',
      desc: iaSummary
        ? `Preços ${iaSummary.avg_price_delta >= 0 ? 'acima' : 'abaixo'} da referência em ${Math.abs(iaSummary.avg_price_delta)}%.`
        : 'Carregando dados…',
    },
    {
      icon: MapPin,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      tag: 'Expansão',
      priority: 'alta' as const,
      title: 'Oportunidade de expansão',
      desc: iaSummary
        ? `Maior potencial identificado: ${iaSummary.best_expansion}.`
        : 'Carregando dados…',
    },
    {
      icon: BarChart2,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      tag: 'Concorrência',
      priority: iaSummary && iaSummary.competitor_promos > 10 ? 'alta' : 'média',
      title: 'Promoções dos concorrentes',
      desc: iaSummary
        ? `${iaSummary.competitor_promos} promoção${iaSummary.competitor_promos !== 1 ? 'ões' : ''} registrada${iaSummary.competitor_promos !== 1 ? 's' : ''} nos últimos 7 dias.`
        : 'Carregando dados…',
    },
  ]

  const recommendations = [
    iaSummary && iaSummary.out_of_stock_count > 0
      ? `Corrigir ruptura de ${iaSummary.out_of_stock_count} produto(s) sem estoque identificados.`
      : 'Manter monitoramento de estoque nas lojas visitadas.',
    iaSummary && iaSummary.survey_growth < 0
      ? 'Aumentar frequência de coleta de pesquisas — queda detectada esta semana.'
      : 'Manter ritmo de coleta de pesquisas.',
    iaSummary && iaSummary.best_expansion !== 'Nenhum estudo em andamento'
      ? `Priorizar estudo de expansão em ${iaSummary.best_expansion}.`
      : 'Iniciar novos estudos de viabilidade de expansão.',
    iaSummary && Math.abs(iaSummary.avg_price_delta) > 5
      ? `Revisar estratégia de preços — variação de ${Math.abs(iaSummary.avg_price_delta)}% vs referência.`
      : 'Preços dentro da faixa esperada. Continuar monitoramento.',
  ]

  const criticalCount = insights.filter(i => i.priority === 'crítica').length
  const highCount = insights.filter(i => i.priority === 'alta').length

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">IA Radar</h1>
            <span className="text-xs font-bold bg-primary text-primary-foreground rounded px-2 py-0.5">Beta</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-10">
            Inteligência calculada automaticamente com base nos dados coletados
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Insights calculados</p>
          <p className="text-2xl font-bold mt-1 text-primary">{insights.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">baseados em dados reais</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Alertas críticos</p>
          <p className={`text-2xl font-bold mt-1 ${criticalCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{criticalCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{criticalCount > 0 ? 'Requerem atenção' : 'Tudo sob controle'}</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Prioridade alta</p>
          <p className={`text-2xl font-bold mt-1 ${highCount > 0 ? 'text-orange-600' : 'text-foreground'}`}>{highCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">pontos de atenção</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Sem estoque</p>
          <p className={`text-2xl font-bold mt-1 ${(iaSummary?.out_of_stock_count ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {iaSummary?.out_of_stock_count ?? '—'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">produtos identificados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Insights feed */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Insights</h2>
          {insights.map((insight, i) => (
            <div key={i} className={`rounded-xl border p-4 ${insight.bg} ${insight.border}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 dark:bg-black/20 mt-0.5">
                  <insight.icon className={`h-4 w-4 ${insight.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-semibold">{insight.title}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[insight.priority]}`}>
                      {insight.priority}
                    </span>
                    <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">{insight.tag}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Score por Módulo</h2>
          <div className="bg-card border rounded-xl p-4 space-y-4">
            {MODULE_CONFIG.map((cfg) => {
              const stats = moduleSummary?.[cfg.key]
              const score = stats ? Math.min(100, Math.round((stats.done / Math.max(stats.goal, 1)) * 100)) : 0
              return (
                <div key={cfg.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{cfg.name}</span>
                    <span className={`text-sm font-bold ${score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {moduleSummary ? `${score}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: cfg.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-semibold mb-3">Recomendações</p>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
