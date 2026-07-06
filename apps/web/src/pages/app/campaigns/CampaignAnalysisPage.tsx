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

// ── AI analysis ────────────────────────────────────────────────────────────────
function AIAnalysis({ surveys, campaignName }: { surveys: Record<string, unknown>[]; campaignName: string }) {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  async function analyze() {
    if (!surveys.length) return
    setLoading(true)
    setResult('')

    const summary = {
      total: surveys.length,
      supermercados: countValues(surveys, 'q1_main_supermarket').slice(0, 5),
      motivos: countValues(surveys, 'q2_main_reason'),
      reclamacoes: topText(surveys, 'q3_complaint', 5),
      transporte: countValues(surveys, 'q4_transport'),
      razoes_troca: countValues(surveys, 'q5_switch_reasons'),
      frequencia: countValues(surveys, 'q6_frequency'),
      intencao: countValues(surveys, 'q7_intention'),
      diferenciais: countValues(surveys, 'q8_new_store_features'),
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ campaignName, summary }),
      })
      const json = await res.json()
      setResult(json.analysis ?? 'Erro ao gerar análise.')
    } catch {
      setResult('Erro ao conectar com a IA. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Análise por IA
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Baseada em {surveys.length} entrevista{surveys.length !== 1 ? 's' : ''} coletadas
            </p>
          </div>
          <Button onClick={analyze} disabled={loading || surveys.length === 0} className="gap-2 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Analisando...' : result ? 'Reanalisar' : 'Gerar análise'}
          </Button>
        </div>

        {surveys.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Colete pelo menos 1 pesquisa para gerar a análise.
          </p>
        )}

        {!result && !loading && surveys.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Clique em "Gerar análise" para obter insights inteligentes dos dados coletados.</p>
          </div>
        )}

        {result && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {result.split('\n').map((line, i) => (
              <p key={i} className={`text-sm ${line.startsWith('**') ? 'font-semibold text-foreground' : 'text-muted-foreground'} mb-2`}>
                {line.replace(/\*\*/g, '')}
              </p>
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
