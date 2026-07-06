import { useNavigate } from 'react-router-dom'
import {
  Users, Megaphone, MapPin, ClipboardCheck, Tag, DollarSign,
  AlertTriangle, Sparkles, Search, ShoppingBag, UserCheck, Eye,
  Building2, BarChart2, TrendingUp, TrendingDown, ArrowRight,
  Star, ChevronRight, ListTodo,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  useDashboardKpis, useDailySurveys, useActivityFeed, useModuleSummary, useTeamInField,
  useCollectionTypesToday, useVisitStatusToday, useStoreRanking, useIaSummary,
} from '@/hooks/useDashboard'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

// ─── mock data ────────────────────────────────────────────────────────────────

// Fallback data shown while loading or when DB has no entries yet
const TIPOS_COLETA_EMPTY = [
  { name: 'Pesquisas',       value: 0, color: '#6366f1' },
  { name: 'Preços',          value: 0, color: '#f59e0b' },
  { name: 'Trade Marketing', value: 0, color: '#10b981' },
  { name: 'Promotores',      value: 0, color: '#3b82f6' },
  { name: 'Cliente Oculto',  value: 0, color: '#ec4899' },
]

const STATUS_VISITAS_EMPTY = [
  { name: 'Concluídas',   value: 0, color: '#10b981' },
  { name: 'Em andamento', value: 0, color: '#3b82f6' },
  { name: 'Pendentes',    value: 0, color: '#f59e0b' },
  { name: 'Canceladas',   value: 0, color: '#ef4444' },
]

const MODULE_CONFIG = [
  { key: 'campaigns',       name: 'Pesquisa de Mercado', color: '#6366f1', to: '/app/campaigns' },
  { key: 'price_research',  name: 'Pesquisa de Preços',  color: '#f59e0b', to: '/app/price-research' },
  { key: 'trade_marketing', name: 'Trade Marketing',     color: '#10b981', to: '/app/trade-marketing' },
  { key: 'promoters',       name: 'Promotores',          color: '#3b82f6', to: '/app/promoters' },
  { key: 'mystery_shopper', name: 'Cliente Oculto',      color: '#ec4899', to: '/app/mystery-shopper' },
  { key: 'expansion',       name: 'Expansão',            color: '#8b5cf6', to: '/app/expansion' },
  { key: 'competition',     name: 'Concorrência',        color: '#64748b', to: '/app/competition' },
] as const

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-pink-500', 'bg-purple-500']
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'Agora'
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h atrás` : `${Math.floor(hrs / 24)}d atrás`
}


const modules = [
  { icon: Search,      label: 'Pesquisa de Mercado', sub: 'Ver andamento',     to: '/app/campaigns',       color: 'text-indigo-500 bg-indigo-50' },
  { icon: Tag,         label: 'Pesquisa de Preços',  sub: 'Ver coletados',     to: '/app/price-research',  color: 'text-amber-500 bg-amber-50' },
  { icon: ShoppingBag, label: 'Trade Marketing',     sub: 'Ver visitas',       to: '/app/trade-marketing', color: 'text-emerald-500 bg-emerald-50' },
  { icon: UserCheck,   label: 'Promotores',          sub: 'Ver roteiro',       to: '/app/promoters',       color: 'text-blue-500 bg-blue-50' },
  { icon: Eye,         label: 'Cliente Oculto',      sub: 'Ver avaliações',    to: '/app/mystery-shopper', color: 'text-pink-500 bg-pink-50' },
  { icon: Building2,   label: 'Expansão',            sub: 'Ver estudos',       to: '/app/expansion',       color: 'text-purple-500 bg-purple-50' },
  { icon: BarChart2,   label: 'Concorrência',        sub: 'Ver monitoramento', to: '/app/competition',     color: 'text-slate-500 bg-slate-100' },
]

// ─── sub-components ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, trend, trendUp, onClick, alert }: {
  icon: React.ElementType; label: string; value: string | number; sub: string
  trend?: string; trendUp?: boolean; onClick?: () => void; alert?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-card border rounded-xl p-4 flex flex-col gap-2 min-w-0 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/30 transition-all' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium truncate pr-1">{label}</p>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${alert ? 'bg-red-100' : 'bg-primary/10'}`}>
          <Icon className={`h-3.5 w-3.5 ${alert ? 'text-red-600' : 'text-primary'}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${alert ? 'text-red-600' : ''}`}>{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{sub}</p>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp !== false ? 'text-green-600' : 'text-red-500'}`}>
            {trendUp !== false ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}

function DonutChart({ data, title, total }: { data: { name: string; value: number; color: string }[]; title: string; total: number }) {
  const pieData = total > 0 ? data : [{ name: '', value: 1, color: '#e2e8f0' }]
  return (
    <div className="bg-card border rounded-xl p-4 flex flex-col gap-3 h-full">
      <p className="text-sm font-semibold">{title}</p>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <PieChart width={100} height={100}>
            <Pie data={pieData} cx={45} cy={45} innerRadius={32} outerRadius={46} dataKey="value" strokeWidth={0}>
              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold">{total}</span>
            <span className="text-[9px] text-muted-foreground">Total</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {data.map((d) => (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-muted-foreground truncate">{d.name}</span>
              </div>
              <span className="text-xs font-medium shrink-0">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data: kpis } = useDashboardKpis()
  const { data: dailyChartData } = useDailySurveys()
  const { data: activityFeed } = useActivityFeed()
  const { data: moduleSummary } = useModuleSummary()
  const { data: teamInField } = useTeamInField()
  const { data: colTypes } = useCollectionTypesToday()
  const { data: visitStatus } = useVisitStatusToday()
  const { data: storeRanking } = useStoreRanking()
  const { data: iaSummary } = useIaSummary()

  const tiposColeta = colTypes ?? TIPOS_COLETA_EMPTY
  const statusVisitas = visitStatus ?? STATUS_VISITAS_EMPTY
  const colTotal = tiposColeta.reduce((s, d) => s + d.value, 0)
  const visitTotal = statusVisitas.reduce((s, d) => s + d.value, 0)

  const rankingLojas = (storeRanking ?? []).map((r) => ({
    name: r.store_name,
    score: r.score,
    stars: Math.min(5, Math.max(1, Math.round(r.score / 20))),
  }))

  const iaAlerts = [
    {
      color: 'text-green-600 bg-green-50', icon: TrendingUp, title: 'Intenção de compra',
      desc: iaSummary
        ? `${iaSummary.survey_growth >= 0 ? '+' : ''}${iaSummary.survey_growth}% em pesquisas comparado à semana passada.`
        : 'Carregando…',
    },
    {
      color: 'text-amber-600 bg-amber-50', icon: BarChart2, title: 'Concorrência',
      desc: iaSummary
        ? `${iaSummary.competitor_promos} promoções registradas nos últimos 7 dias.`
        : 'Carregando…',
    },
    {
      color: 'text-blue-600 bg-blue-50', icon: DollarSign, title: 'Preço médio',
      desc: iaSummary
        ? `Preços ${iaSummary.avg_price_delta >= 0 ? 'acima' : 'abaixo'} ${Math.abs(iaSummary.avg_price_delta)}% vs referência.`
        : 'Carregando…',
    },
    {
      color: 'text-purple-600 bg-purple-50', icon: MapPin, title: 'Oportunidade',
      desc: iaSummary ? `Maior potencial: ${iaSummary.best_expansion}.` : 'Carregando…',
    },
    {
      color: 'text-red-600 bg-red-50', icon: AlertTriangle, title: 'Atenção',
      desc: iaSummary
        ? `${iaSummary.out_of_stock_count} produto${iaSummary.out_of_stock_count !== 1 ? 's' : ''} sem estoque identificado${iaSummary.out_of_stock_count !== 1 ? 's' : ''}.`
        : 'Carregando…',
    },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const chartData = dailyChartData ?? []

  return (
    <div className="space-y-6 pb-8">

      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}, {profile?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aqui está o panorama geral das operações em campo.</p>
      </div>

      {/* 8 KPI cards — dados reais via get_dashboard_kpis() */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard
          icon={Users}         label="Pessoas em Campo"      value={kpis?.active_campaigns ?? '—'}  sub="campanhas ativas"
          onClick={() => navigate('/app/campaigns')}
        />
        <StatCard
          icon={Megaphone}     label="Campanhas Ativas"      value={kpis?.active_campaigns ?? '—'}  sub="no momento"
          onClick={() => navigate('/app/campaigns')}
        />
        <StatCard
          icon={MapPin}        label="Visitas Hoje"          value={(kpis ? kpis.tm_visits_today + kpis.promoter_visits_today : '—')}  sub="TM + Promotores"
          onClick={() => navigate('/app/trade-marketing')}
        />
        <StatCard
          icon={ClipboardCheck} label="Pesquisas Concluídas" value={kpis?.surveys_total ?? '—'}     sub="total validadas"
          onClick={() => navigate('/app/campaigns')}
        />
        <StatCard
          icon={Tag}           label="Pesquisas Hoje"        value={kpis?.surveys_today ?? '—'}     sub="coletadas hoje"
          onClick={() => navigate('/app/campaigns')}
        />
        <StatCard
          icon={DollarSign}    label="Preços Coletados"      value={kpis?.prices_total ?? '—'}      sub="registros"
          onClick={() => navigate('/app/price-research')}
        />
        <StatCard
          icon={ListTodo}      label="Pendências"            value={kpis?.pending_tasks ?? '—'}     sub="aguardando ação"
          onClick={() => navigate('/app/alerts')}
        />
        <StatCard
          icon={AlertTriangle} label="Alertas"               value={kpis?.unread_alerts ?? '—'}     sub="não lidos"
          alert={!!kpis?.unread_alerts}  onClick={() => navigate('/app/alerts')}
        />
      </div>

      {/* Módulos em Ação */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Módulos em Ação</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {modules.map((m) => (
            <button
              key={m.to}
              onClick={() => navigate(m.to)}
              className="bg-card border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all text-left group"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl mb-3 ${m.color}`}>
                <m.icon className="h-[18px] w-[18px]" />
              </div>
              <p className="text-sm font-semibold leading-tight mb-0.5">{m.label}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                {m.sub} <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Mapa + Resumo por Módulo + Atividade Recente */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Mapa */}
        <div className="xl:col-span-2 bg-card border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <p className="text-sm font-semibold">Mapa em Tempo Real</p>
              <p className="text-xs text-muted-foreground mt-0.5">Equipe em campo agora</p>
            </div>
            <button
              onClick={() => navigate('/app/map')}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
            >
              Ver mapa completo <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="flex h-64">
            <div className="w-44 border-r overflow-y-auto p-2 space-y-1">
              {(teamInField ?? []).length === 0 && (
                <p className="text-[10px] text-muted-foreground px-2 py-1.5">Nenhuma atividade recente</p>
              )}
              {(teamInField ?? []).map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => navigate('/app/map')}
                  className="flex w-full items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 text-left"
                >
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    p.field_status === 'online' ? 'bg-green-500' : p.field_status === 'paused' ? 'bg-amber-400' : 'bg-slate-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.last_action} · {relativeTime(p.last_active_at)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex-1 relative bg-slate-100 dark:bg-slate-800">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-8 w-8 opacity-30" />
                <p className="text-xs opacity-50">Clique para ver o mapa completo</p>
              </div>
              <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Online</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />Em visita</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />Pausado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo por módulo — clicável */}
        <div className="xl:col-span-1 bg-card border rounded-xl">
          <div className="p-4 border-b">
            <p className="text-sm font-semibold">Resumo por Módulo</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className="p-3 space-y-3">
            {MODULE_CONFIG.map((cfg) => {
              const stats = moduleSummary?.[cfg.key]
              const done = stats?.done ?? 0
              const goal = stats?.goal ?? 1
              const pct = Math.min(100, Math.round((done / goal) * 100))
              const unit = stats?.unit ?? 'itens'
              return (
                <button
                  key={cfg.key}
                  onClick={() => navigate(cfg.to)}
                  className="w-full text-left hover:bg-muted/30 rounded-lg p-1 -mx-1 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">{cfg.name}</span>
                    <span className="text-xs font-bold ml-2 shrink-0">{moduleSummary ? `${pct}%` : '—'}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{done}/{goal} {unit}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="xl:col-span-2 bg-card border rounded-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <p className="text-sm font-semibold">Atividade Recente</p>
            <button
              onClick={() => navigate('/app/alerts')}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {(activityFeed ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma atividade registrada</p>
            )}
            {(activityFeed ?? []).map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${avatarColor(a.actor_name)} text-white text-[10px] font-bold mt-0.5`}>
                  {a.actor_name.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug">
                    <span className="font-semibold">{a.actor_name}</span>{' '}
                    <span className="text-muted-foreground">{a.action}</span>
                    {a.location && <span className="font-medium text-foreground"> · {a.location}</span>}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(a.activity_time)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Gráfico de linha */}
        <div className="xl:col-span-2 bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold">Pesquisas por Dia</p>
            <button
              onClick={() => navigate('/app/reports')}
              className="text-xs text-muted-foreground border rounded-lg px-2 py-1 hover:bg-muted/50 transition-colors"
            >
              Ver relatório →
            </button>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--primary))' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
              Nenhuma pesquisa registrada nos últimos 7 dias
            </div>
          )}
        </div>

        {/* Donuts */}
        <div className="xl:col-span-1">
          <DonutChart data={tiposColeta} title="Tipos de Coleta (Hoje)" total={colTotal} />
        </div>
        <div className="xl:col-span-1">
          <DonutChart data={statusVisitas} title="Status das Visitas (Hoje)" total={visitTotal} />
        </div>

        {/* Ranking de Lojas */}
        <div className="xl:col-span-1 bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Ranking de Lojas</p>
            <button
              onClick={() => navigate('/app/mystery-shopper')}
              className="text-[10px] text-primary hover:underline"
            >
              Ver completo →
            </button>
          </div>
          <div className="space-y-2.5">
            {rankingLojas.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma avaliação concluída</p>
            )}
            {rankingLojas.map((l, i) => (
              <div key={l.name} className="flex items-center gap-2">
                <span className={`text-xs font-bold w-4 shrink-0 ${i === 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{l.name}</p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className={`h-2.5 w-2.5 ${s < l.stars ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
                <span className="text-xs font-bold shrink-0">{l.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* IA Radar */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Resumo Inteligente (IA Radar)</p>
              <p className="text-xs text-muted-foreground">Insights gerados com base nos dados coletados</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/ai')}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
          >
            Ver análise completa <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {iaAlerts.map((alert) => (
            <button
              key={alert.title}
              onClick={() => navigate('/app/ai')}
              className="rounded-xl border p-3 space-y-2 text-left hover:shadow-sm hover:border-primary/30 transition-all"
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${alert.color}`}>
                <alert.icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs font-semibold">{alert.title}</p>
              <p className="text-xs text-muted-foreground leading-snug">{alert.desc}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
