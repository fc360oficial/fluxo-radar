import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, BarChart3, List, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

const COLORS = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#ef4444','#14b8a6','#f97316','#84cc16']

// ── fetch ──────────────────────────────────────────────────────────────────────
async function fetchSurveys(campaignId: string) {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('is_valid', true)
    .order('surveyed_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Record<string, unknown>[]
}

async function fetchCampaignName(id: string) {
  const { data } = await supabase.from('campaigns').select('name,goal').eq('id', id).single()
  return data as { name: string; goal: number } | null
}

// ── helpers ────────────────────────────────────────────────────────────────────
function countValues(surveys: Record<string, unknown>[], field: string) {
  const counts: Record<string, number> = {}
  for (const s of surveys) {
    const v = s[field]
    if (!v) continue
    if (Array.isArray(v)) { for (const item of v) { counts[item] = (counts[item] ?? 0) + 1 } }
    else { counts[String(v)] = (counts[String(v)] ?? 0) + 1 }
  }
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function topText(surveys: Record<string, unknown>[], field: string, n = 8) {
  const counts: Record<string, number> = {}
  for (const s of surveys) {
    const v = String(s[field] ?? '').trim().toLowerCase()
    if (v) counts[v] = (counts[v] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
}

// ── mini components ────────────────────────────────────────────────────────────
function PieCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!data.length) return <EmptyCard title={title} />
  return (
    <div className="bg-card border rounded-xl p-5">
      <p className="text-sm font-semibold mb-4">{title}</p>
      <div className="flex gap-4 items-start">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [`${v} (${Math.round(v/total*100)}%)`, '']} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 min-w-0">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="truncate text-muted-foreground flex-1">{d.name}</span>
              <span className="font-semibold shrink-0">{Math.round(d.value/total*100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BarCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  if (!data.length) return <EmptyCard title={title} />
  return (
    <div className="bg-card border rounded-xl p-5">
      <p className="text-sm font-semibold mb-4">{title}</p>
      <ResponsiveContainer width="100%" height={data.length * 36 + 20}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            <LabelList dataKey="value" position="right" style={{ fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TextCard({ title, items }: { title: string; items: [string, number][] }) {
  if (!items.length) return <EmptyCard title={title} />
  return (
    <div className="bg-card border rounded-xl p-5">
      <p className="text-sm font-semibold mb-3">{title}</p>
      <div className="space-y-1.5">
        {items.map(([text, count]) => (
          <div key={text} className="flex items-center justify-between gap-2 text-xs">
            <span className="capitalize text-muted-foreground truncate">{text}</span>
            <span className="shrink-0 bg-muted px-2 py-0.5 rounded-full font-semibold">{count}x</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyCard({ title }: { title: string }) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <p className="text-sm font-semibold mb-2">{title}</p>
      <p className="text-xs text-muted-foreground">Sem respostas ainda</p>
    </div>
  )
}

// ── label maps ────────────────────────────────────────────────────────────────
const REASON_LABELS: Record<string, string> = {
  price: 'Preço', quality: 'Qualidade', butcher: 'Açougue', bakery: 'Padaria',
  location: 'Localização', service: 'Atendimento', promotions: 'Promoções', other: 'Outro',
}
const TRANSPORT_LABELS: Record<string, string> = {
  foot: 'A pé', car: 'Carro', motorcycle: 'Moto', bicycle: 'Bicicleta', uber: 'Aplicativo', bus: 'Ônibus',
}
const SWITCH_LABELS: Record<string, string> = {
  price: 'Preço melhor', better_butcher: 'Açougue melhor', better_bakery: 'Padaria melhor',
  more_variety: 'Mais variedade', service: 'Melhor atendimento', delivery: 'Delivery',
  promotions: 'Mais promoções', organized_store: 'Loja organizada',
}
const FREQ_LABELS: Record<string, string> = {
  daily: 'Todos os dias', '2_3_week': '2 a 3x por semana', weekly: 'Semanalmente', monthly: 'Mensalmente',
}
const INTENTION_LABELS: Record<string, string> = { yes: 'Sim', maybe: 'Talvez', no: 'Não' }
const FEATURE_LABELS: Record<string, string> = {
  butcher: 'Açougue próprio', bakery: 'Padaria', parking: 'Estacionamento', delivery: 'Delivery',
  self_checkout: 'Autoatendimento', loyalty: 'Programa de fidelidade', organic: 'Produtos orgânicos',
  price: 'Preço baixo', variety: 'Variedade', cleanliness: 'Limpeza', service: 'Bom atendimento',
}

function label(map: Record<string, string>, key: string) {
  return map[key] ?? key
}

interface AnalysisSection { icon: string; title: string; text: string; highlight?: string }

function generateAnalysis(surveys: Record<string, unknown>[], campaignName: string): AnalysisSection[] {
  const n = surveys.length
  if (n === 0) return []

  const pct = (v: number) => Math.round((v / n) * 100)

  // Q1 — supermercados
  const q1 = countValues(surveys, 'q1_main_supermarket')
  const topSuper = q1[0]
  const top3Supers = q1.slice(0, 3).map(d => `${d.name} (${pct(d.value)}%)`).join(', ')

  // Q2 — motivo de escolha
  const q2 = countValues(surveys, 'q2_main_reason')
  const topMotivo = q2[0] ? label(REASON_LABELS, q2[0].name) : '—'
  const topMotivosPct = q2.slice(0, 3).map(d => `${label(REASON_LABELS, d.name)} ${pct(d.value)}%`).join(', ')

  // Q3 — reclamações (texto livre)
  const q3 = topText(surveys, 'q3_complaint', 3)

  // Q4 — transporte
  const q4 = countValues(surveys, 'q4_transport')
  const topTransp = q4[0] ? label(TRANSPORT_LABELS, q4[0].name) : '—'
  const topTranspPct = q4.slice(0, 2).map(d => `${label(TRANSPORT_LABELS, d.name)} (${pct(d.value)}%)`).join(' e ')

  // Q5 — razões de troca
  const q5 = countValues(surveys, 'q5_switch_reasons')
  const topSwitch = q5.slice(0, 3).map(d => `${label(SWITCH_LABELS, d.name)} (${pct(d.value)}%)`).join(', ')

  // Q6 — frequência
  const q6 = countValues(surveys, 'q6_frequency')
  const topFreq = q6[0] ? label(FREQ_LABELS, q6[0].name) : '—'

  // Q7 — intenção
  const q7 = countValues(surveys, 'q7_intention')
  const yesCount = q7.find(d => d.name === 'yes')?.value ?? 0
  const maybeCount = q7.find(d => d.name === 'maybe')?.value ?? 0
  const noCount = q7.find(d => d.name === 'no')?.value ?? 0
  const positiveRate = pct(yesCount + maybeCount)
  const viability = positiveRate >= 70 ? 'ALTA' : positiveRate >= 50 ? 'MÉDIA' : 'BAIXA'
  const viabilityColor = positiveRate >= 70 ? '🟢' : positiveRate >= 50 ? '🟡' : '🔴'

  // Q8 — diferenciais
  const q8 = countValues(surveys, 'q8_new_store_features')
  const topFeatures = q8.slice(0, 3).map(d => `${label(FEATURE_LABELS, d.name)} (${pct(d.value)}%)`).join(', ')

  return [
    {
      icon: '👥',
      title: 'Perfil do consumidor',
      text: `Com base em ${n} entrevistas da campanha ${campaignName}, o comprador típico da área se desloca principalmente ${topTranspPct} e vai ao supermercado ${topFreq.toLowerCase()}. O critério de escolha mais valorizado é ${topMotivo.toLowerCase()} — citado em ${pct(q2[0]?.value ?? 0)}% das respostas.`,
    },
    {
      icon: '🏪',
      title: 'Concorrentes dominantes',
      text: topSuper
        ? `O supermercado mais frequentado é ${topSuper.name}, com ${pct(topSuper.value)}% dos entrevistados. Os 3 líderes da região são: ${top3Supers}. Os consumidores escolhem esses estabelecimentos principalmente por: ${topMotivosPct}.`
        : 'Dados insuficientes para identificar os concorrentes.',
    },
    {
      icon: '⚡',
      title: 'Oportunidades identificadas',
      text: `Os principais fatores que levariam um consumidor a trocar de supermercado são: ${topSwitch || '—'}. ${q3.length ? `As reclamações mais citadas incluem: "${q3[0][0]}"${q3[1] ? ` e "${q3[1][0]}"` : ''} — pontos que representam lacunas que uma nova loja pode explorar.` : ''}`,
    },
    {
      icon: '🎯',
      title: 'O que buscam em uma nova loja',
      text: `Os diferenciais mais desejados são: ${topFeatures || '—'}. Esses itens devem ser priorizados no projeto de uma nova loja para atrair clientes da concorrência.`,
    },
    {
      icon: viabilityColor,
      title: `Viabilidade de abertura — ${viability}`,
      text: `${pct(yesCount)}% afirmaram que comprariam em uma nova loja na área, e ${pct(maybeCount)}% disseram "talvez" — totalizando ${positiveRate}% de intenção positiva. Apenas ${pct(noCount)}% descartam a possibilidade. ${positiveRate >= 70 ? 'Os dados indicam forte receptividade do mercado para uma nova operação.' : positiveRate >= 50 ? 'Há abertura moderada do mercado — uma entrada com proposta diferenciada tem boas chances.' : 'O mercado apresenta menor receptividade — recomenda-se aprofundar a análise antes de prosseguir.'}`,
      highlight: `${positiveRate}% de intenção positiva`,
    },
  ]
}

// ── AI analysis ────────────────────────────────────────────────────────────────
function AIAnalysis({ surveys, campaignName }: { surveys: Record<string, unknown>[]; campaignName: string }) {
  const [generated, setGenerated] = useState(false)

  const sections = useMemo(
    () => generated ? generateAnalysis(surveys, campaignName) : [],
    [generated, surveys, campaignName]
  )

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Análise Radar
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Baseada em {surveys.length} entrevista{surveys.length !== 1 ? 's' : ''} coletadas
            </p>
          </div>
          <Button onClick={() => setGenerated(true)} disabled={surveys.length === 0} className="gap-2 shrink-0">
            <Sparkles className="h-4 w-4" />
            {generated ? 'Reanalisar' : 'Gerar análise'}
          </Button>
        </div>

        {surveys.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Colete pelo menos 1 pesquisa para gerar a análise.
          </p>
        )}

        {!generated && surveys.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Clique em "Gerar análise" para obter insights dos dados coletados.</p>
          </div>
        )}

        {generated && sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((s, i) => (
              <div key={i} className="border rounded-lg p-4">
                <p className="font-semibold text-sm mb-1.5">{s.icon} {s.title}</p>
                {s.highlight && (
                  <div className="inline-flex items-center bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full mb-2">
                    {s.highlight}
                  </div>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── main page ──────────────────────────────────────────────────────────────────
type Tab = 'charts' | 'responses' | 'ai'

export function CampaignAnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('charts')

  const { data: campaign } = useQuery({ queryKey: ['campaign', id], queryFn: () => fetchCampaignName(id!) })
  const { data: surveys = [], isLoading, refetch } = useQuery({
    queryKey: ['surveys', id],
    queryFn: () => fetchSurveys(id!),
    refetchInterval: 30_000,
  })

  const q2 = useMemo(() => countValues(surveys, 'q2_main_reason'), [surveys])
  const q4 = useMemo(() => countValues(surveys, 'q4_transport'), [surveys])
  const q5 = useMemo(() => countValues(surveys, 'q5_switch_reasons'), [surveys])
  const q6 = useMemo(() => countValues(surveys, 'q6_frequency'), [surveys])
  const q7 = useMemo(() => countValues(surveys, 'q7_intention'), [surveys])
  const q8 = useMemo(() => countValues(surveys, 'q8_new_store_features'), [surveys])
  const q1 = useMemo(() => topText(surveys, 'q1_main_supermarket'), [surveys])
  const q3 = useMemo(() => topText(surveys, 'q3_complaint'), [surveys])

  const TABS = [
    { key: 'charts' as Tab,    label: 'Gráficos',  icon: BarChart3 },
    { key: 'responses' as Tab, label: 'Respostas', icon: List },
    { key: 'ai' as Tab,        label: 'IA Radar',  icon: Sparkles },
  ]

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{campaign?.name ?? '...'}</h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Carregando...' : `${surveys.length} entrevistas coletadas de ${campaign?.goal ?? '—'} previstas`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 shrink-0">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Charts tab */}
      {!isLoading && tab === 'charts' && (
        <div className="space-y-4">
          {surveys.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma entrevista coletada ainda.</p>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TextCard title="Q1 — Supermercado mais frequentado" items={q1} />
            <PieCard  title="Q2 — Principal motivo de escolha" data={q2} />
            <TextCard title="Q3 — Reclamações / pontos negativos" items={q3} />
            <PieCard  title="Q4 — Como vai ao supermercado" data={q4} />
            <BarCard  title="Q5 — O que faria trocar de supermercado" data={q5} />
            <PieCard  title="Q6 — Frequência de visitas" data={q6} />
            <PieCard  title="Q7 — Compraria em nova loja na área" data={q7} />
            <BarCard  title="Q8 — O que procura em nova loja" data={q8} />
          </div>
        </div>
      )}

      {/* Responses tab */}
      {!isLoading && tab === 'responses' && (
        <div className="bg-card border rounded-xl overflow-hidden">
          {surveys.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Nenhuma entrevista ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {['Data','Supermercado','Motivo','Reclamação','Transporte','Frequência','Intenção','Diferenciais'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((s, i) => (
                    <tr key={String(s.id)} className={`border-b last:border-0 ${i%2?'bg-muted/10':''}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {new Date(String(s.surveyed_at)).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5 max-w-[140px] truncate">{String(s.q1_main_supermarket ?? '—')}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{String(s.q2_main_reason ?? '—')}</td>
                      <td className="px-3 py-2.5 max-w-[180px] truncate">{String(s.q3_complaint ?? '—')}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{String(s.q4_transport ?? '—')}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{String(s.q6_frequency ?? '—')}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{String(s.q7_intention ?? '—')}</td>
                      <td className="px-3 py-2.5">
                        {Array.isArray(s.q8_new_store_features)
                          ? (s.q8_new_store_features as string[]).join(', ')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* AI tab */}
      {!isLoading && tab === 'ai' && (
        <AIAnalysis surveys={surveys} campaignName={campaign?.name ?? ''} />
      )}
    </div>
  )
}
