import { useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Printer, Download, ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

// ── Label maps ────────────────────────────────────────────────────────────────
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
const FEATURE_LABELS: Record<string, string> = {
  butcher: 'Açougue próprio', bakery: 'Padaria', parking: 'Estacionamento', delivery: 'Delivery',
  self_checkout: 'Autoatendimento', loyalty: 'Fidelidade', organic: 'Orgânicos',
  price: 'Preço baixo', variety: 'Variedade', cleanliness: 'Limpeza', service: 'Bom atendimento',
}
const INTENTION_LABELS: Record<string, string> = { yes: 'Compraria', maybe: 'Talvez comprasse', no: 'Não compraria' }

function lbl(map: Record<string, string>, key: string) { return map[key] ?? key }

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetchSurveys(campaignId: string) {
  const { data, error } = await supabase
    .from('surveys').select('*').eq('campaign_id', campaignId).eq('is_valid', true).order('surveyed_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Record<string, unknown>[]
}

async function fetchCampaign(id: string) {
  const { data } = await supabase
    .from('campaigns')
    .select('*, responsible:profiles!campaigns_responsible_id_fkey(name)')
    .eq('id', id).single()
  return data as {
    id: string; name: string; city: string; neighborhood: string; state: string
    start_date: string; end_date: string | null; goal: number; status: string
    responsible: { name: string } | null
  } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function countValues(surveys: Record<string, unknown>[], field: string) {
  const counts: Record<string, number> = {}
  for (const s of surveys) {
    const v = s[field]
    if (!v) continue
    if (Array.isArray(v)) { for (const item of v) { counts[item] = (counts[item] ?? 0) + 1 } }
    else { counts[String(v)] = (counts[String(v)] ?? 0) + 1 }
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

function topText(surveys: Record<string, unknown>[], field: string, n = 8) {
  const counts: Record<string, number> = {}
  for (const s of surveys) {
    const v = String(s[field] ?? '').trim()
    if (v) counts[v] = (counts[v] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
}

// ── Analysis ──────────────────────────────────────────────────────────────────
interface AnalysisSection { icon: string; title: string; text: string; highlight?: string }

function generateAnalysis(surveys: Record<string, unknown>[], campaignName: string): AnalysisSection[] {
  const n = surveys.length
  if (n === 0) return []
  const pct = (v: number) => Math.round((v / n) * 100)

  const q1 = countValues(surveys, 'q1_main_supermarket')
  const topSuper = q1[0]
  const top3Supers = q1.slice(0, 3).map(d => `${d.name} (${pct(d.value)}%)`).join(', ')
  const q2 = countValues(surveys, 'q2_main_reason')
  const topMotivo = q2[0] ? lbl(REASON_LABELS, q2[0].name) : '—'
  const topMotivosPct = q2.slice(0, 3).map(d => `${lbl(REASON_LABELS, d.name)} ${pct(d.value)}%`).join(', ')
  const q3 = topText(surveys, 'q3_complaint', 3)
  const q4 = countValues(surveys, 'q4_transport')
  const topTranspPct = q4.slice(0, 2).map(d => `${lbl(TRANSPORT_LABELS, d.name)} (${pct(d.value)}%)`).join(' e ')
  const q5 = countValues(surveys, 'q5_switch_reasons')
  const topSwitch = q5.slice(0, 3).map(d => `${lbl(SWITCH_LABELS, d.name)} (${pct(d.value)}%)`).join(', ')
  const q6 = countValues(surveys, 'q6_frequency')
  const topFreq = q6[0] ? lbl(FREQ_LABELS, q6[0].name) : '—'
  const q7 = countValues(surveys, 'q7_intention')
  const yesCount = q7.find(d => d.name === 'yes')?.value ?? 0
  const maybeCount = q7.find(d => d.name === 'maybe')?.value ?? 0
  const noCount = q7.find(d => d.name === 'no')?.value ?? 0
  const positiveRate = pct(yesCount + maybeCount)
  const viability = positiveRate >= 70 ? 'ALTA' : positiveRate >= 50 ? 'MÉDIA' : 'BAIXA'
  const viabilityIcon = positiveRate >= 70 ? '🟢' : positiveRate >= 50 ? '🟡' : '🔴'
  const q8 = countValues(surveys, 'q8_new_store_features')
  const topFeatures = q8.slice(0, 3).map(d => `${lbl(FEATURE_LABELS, d.name)} (${pct(d.value)}%)`).join(', ')

  return [
    {
      icon: '👥', title: 'Perfil do consumidor',
      text: `Com base em ${n} entrevistas da campanha ${campaignName}, o comprador típico da área se desloca principalmente ${topTranspPct} e vai ao supermercado ${topFreq.toLowerCase()}. O critério de escolha mais valorizado é ${topMotivo.toLowerCase()} — citado em ${pct(q2[0]?.value ?? 0)}% das respostas.`,
    },
    {
      icon: '🏪', title: 'Concorrentes dominantes',
      text: topSuper
        ? `O supermercado mais frequentado é ${topSuper.name}, com ${pct(topSuper.value)}% dos entrevistados. Os 3 líderes da região são: ${top3Supers}. Os consumidores escolhem esses estabelecimentos principalmente por: ${topMotivosPct}.`
        : 'Dados insuficientes para identificar os concorrentes.',
    },
    {
      icon: '⚡', title: 'Oportunidades identificadas',
      text: `Os principais fatores que levariam um consumidor a trocar de supermercado são: ${topSwitch || '—'}. ${q3.length ? `As reclamações mais citadas incluem: "${q3[0][0]}"${q3[1] ? ` e "${q3[1][0]}"` : ''} — pontos que representam lacunas que uma nova loja pode explorar.` : ''}`,
    },
    {
      icon: '🎯', title: 'O que buscam em uma nova loja',
      text: `Os diferenciais mais desejados são: ${topFeatures || '—'}. Esses itens devem ser priorizados no projeto de uma nova loja para atrair clientes da concorrência.`,
    },
    {
      icon: viabilityIcon, title: `Viabilidade de abertura — ${viability}`,
      text: `${pct(yesCount)}% afirmaram que comprariam em uma nova loja na área, e ${pct(maybeCount)}% disseram "talvez" — totalizando ${positiveRate}% de intenção positiva. Apenas ${pct(noCount)}% descartam a possibilidade. ${positiveRate >= 70 ? 'Os dados indicam forte receptividade do mercado para uma nova operação.' : positiveRate >= 50 ? 'Há abertura moderada do mercado — uma entrada com proposta diferenciada tem boas chances.' : 'O mercado apresenta menor receptividade — recomenda-se aprofundar a análise antes de prosseguir.'}`,
      highlight: `${positiveRate}% de intenção positiva`,
    },
  ]
}

// ── CSV export ────────────────────────────────────────────────────────────────
export function exportCSV(surveys: Record<string, unknown>[], campaignName: string) {
  const headers = ['Data', 'Horário', 'Supermercado principal', 'Motivo de escolha', 'Reclamação', 'Transporte', 'Frequência', 'Intenção nova loja', 'Motivos de troca', 'Diferenciais desejados', 'GPS Lat', 'GPS Lng']
  const rows = surveys.map(s => [
    new Date(String(s.surveyed_at)).toLocaleDateString('pt-BR'),
    new Date(String(s.surveyed_at)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    String(s.q1_main_supermarket ?? ''),
    lbl(REASON_LABELS, String(s.q2_main_reason ?? '')),
    String(s.q3_complaint ?? '').replace(/"/g, "'"),
    lbl(TRANSPORT_LABELS, String(s.q4_transport ?? '')),
    lbl(FREQ_LABELS, String(s.q6_frequency ?? '')),
    lbl(INTENTION_LABELS, String(s.q7_intention ?? '')),
    Array.isArray(s.q5_switch_reasons) ? (s.q5_switch_reasons as string[]).map(k => lbl(SWITCH_LABELS, k)).join('; ') : '',
    Array.isArray(s.q8_new_store_features) ? (s.q8_new_store_features as string[]).map(k => lbl(FEATURE_LABELS, k)).join('; ') : '',
    String(s.latitude ?? ''), String(s.longitude ?? ''),
  ])
  const csv = [headers, ...rows].map(row => row.map(c => `"${String(c)}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${campaignName.replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Mini bar for print ────────────────────────────────────────────────────────
function MiniBar({ name, value, total }: { name: string; value: number; total: number }) {
  const p = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="mb-2">
      <div className="flex justify-between items-baseline gap-2 text-xs mb-0.5">
        <span className="text-gray-700 truncate">{name}</span>
        <span className="shrink-0 font-semibold text-gray-900">{p}% <span className="text-gray-400 font-normal">({value})</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: '#f59e0b' }} />
      </div>
    </div>
  )
}

// ── Question section ──────────────────────────────────────────────────────────
function QSection({ title, data, total, labelMap, isText = false }: {
  title: string
  data: { name: string; value: number }[] | [string, number][]
  total: number
  labelMap?: Record<string, string>
  isText?: boolean
}) {
  const items = isText
    ? (data as [string, number][]).map(([name, value]) => ({ name, value }))
    : (data as { name: string; value: number }[])
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2">{title}</p>
      {items.length === 0
        ? <p className="text-xs text-gray-400 italic">Sem respostas ainda</p>
        : items.slice(0, 6).map((item, i) => (
            <MiniBar key={i} name={labelMap ? lbl(labelMap, item.name) : item.name} value={item.value} total={total} />
          ))
      }
    </div>
  )
}

const STATUS_TEXT: Record<string, string> = {
  draft: 'Rascunho', active: 'Em andamento', completed: 'Concluída', cancelled: 'Cancelada',
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function CampaignReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => { if (!user) navigate('/login') }, [user, navigate])

  const { data: campaign } = useQuery({ queryKey: ['campaign-rpt', id], queryFn: () => fetchCampaign(id!) })
  const { data: surveys = [], isLoading } = useQuery({ queryKey: ['surveys-rpt', id], queryFn: () => fetchSurveys(id!) })

  const analysis = useMemo(() => generateAnalysis(surveys, campaign?.name ?? ''), [surveys, campaign])
  const n = surveys.length
  const pctDone = campaign ? Math.min(100, Math.round((n / campaign.goal) * 100)) : 0

  const q1 = useMemo(() => topText(surveys, 'q1_main_supermarket'), [surveys])
  const q2 = useMemo(() => countValues(surveys, 'q2_main_reason'), [surveys])
  const q3 = useMemo(() => topText(surveys, 'q3_complaint'), [surveys])
  const q4 = useMemo(() => countValues(surveys, 'q4_transport'), [surveys])
  const q5 = useMemo(() => countValues(surveys, 'q5_switch_reasons'), [surveys])
  const q6 = useMemo(() => countValues(surveys, 'q6_frequency'), [surveys])
  const q7 = useMemo(() => countValues(surveys, 'q7_intention'), [surveys])
  const q8 = useMemo(() => countValues(surveys, 'q8_new_store_features'), [surveys])

  return (
    <>
      {/* ── Toolbar (hidden on print) ── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <span className="text-sm text-muted-foreground font-medium truncate">
            Relatório — {campaign?.name ?? '...'}
          </span>
        </div>
        <Button variant="outline" size="sm" disabled={!n} onClick={() => exportCSV(surveys, campaign?.name ?? 'campanha')}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
        </Button>
      </div>

      {/* ── Report body ── */}
      <div className="min-h-screen bg-white pt-16 print:pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#f59e0b' }} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-10 py-10 print:px-6 print:py-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between pb-6 mb-8 border-b-2 border-gray-100">
              <div className="flex items-center gap-5">
                <img src="/logo.png" alt="Fluxo Radar" className="h-16 w-16 object-contain" />
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Fluxo Radar</p>
                  <p className="text-sm font-semibold text-gray-600">Pesquisa de Mercado</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Relatório de Campanha</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Gerado em</p>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">
                  {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* ── Campaign title ── */}
            <div className="flex items-start gap-4 mb-8">
              <div className="w-1.5 rounded-full bg-amber-400 self-stretch shrink-0" style={{ minHeight: 64 }} />
              <div>
                <h1 className="text-3xl font-black text-gray-900 leading-tight">{campaign?.name}</h1>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-sm text-gray-500">
                  <span>📍 {campaign?.neighborhood}, {campaign?.city} — {campaign?.state}</span>
                  <span>
                    📅 {campaign?.start_date ? new Date(campaign.start_date).toLocaleDateString('pt-BR') : '—'}
                    {campaign?.end_date ? ` até ${new Date(campaign.end_date).toLocaleDateString('pt-BR')}` : ' · Em andamento'}
                  </span>
                  {campaign?.responsible?.name && <span>👤 {campaign.responsible.name}</span>}
                </div>
              </div>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-4 gap-3 mb-10">
              {([
                { label: 'Entrevistas coletadas', value: n, sub: `de ${campaign?.goal ?? '—'} previstas`, hi: false },
                { label: 'Meta', value: campaign?.goal ?? '—', sub: 'entrevistas planejadas', hi: false },
                { label: 'Progresso', value: `${pctDone}%`, sub: 'da meta concluída', hi: true },
                { label: 'Status', value: STATUS_TEXT[campaign?.status ?? 'draft'], sub: '', hi: false },
              ] as { label: string; value: string | number; sub: string; hi: boolean }[]).map((k, i) => (
                <div key={i} className="border-2 border-gray-100 rounded-xl p-4 text-center bg-gray-50/50">
                  <p className={`text-2xl font-black ${k.hi ? 'text-amber-500' : 'text-gray-900'}`}>{k.value}</p>
                  <p className="text-xs font-semibold text-gray-600 mt-1">{k.label}</p>
                  {k.sub && <p className="text-[10px] text-gray-400 mt-0.5">{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* ── Dados coletados ── */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-500 px-2">Dados Coletados</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="grid grid-cols-2 gap-x-10 gap-y-2">
                <QSection title="Q1 — Supermercado mais frequentado" data={q1 as [string, number][]} total={n} isText />
                <QSection title="Q2 — Motivo de escolha do supermercado" data={q2} total={n} labelMap={REASON_LABELS} />
                <QSection title="Q3 — Reclamações / pontos negativos" data={q3 as [string, number][]} total={n} isText />
                <QSection title="Q4 — Meio de transporte até o supermercado" data={q4} total={n} labelMap={TRANSPORT_LABELS} />
                <QSection title="Q5 — O que faria trocar de supermercado" data={q5} total={n} labelMap={SWITCH_LABELS} />
                <QSection title="Q6 — Frequência de visitas" data={q6} total={n} labelMap={FREQ_LABELS} />
                <QSection title="Q7 — Compraria em nova loja na área?" data={q7} total={n} labelMap={INTENTION_LABELS} />
                <QSection title="Q8 — Diferenciais desejados em nova loja" data={q8} total={n} labelMap={FEATURE_LABELS} />
              </div>
            </div>

            {/* ── Análise ── */}
            {analysis.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500 px-2">Análise de Viabilidade</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="space-y-3">
                  {analysis.map((s, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-5 bg-gray-50/30">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0 mt-0.5">{s.icon}</span>
                        <div className="flex-1">
                          <p className="font-black text-sm text-gray-900 mb-1">{s.title}</p>
                          {s.highlight && (
                            <div className="inline-flex items-center bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full mb-2">
                              {s.highlight}
                            </div>
                          )}
                          <p className="text-sm text-gray-600 leading-relaxed">{s.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="h-6 w-6 object-contain opacity-40" />
                <span className="text-xs text-gray-400">Fluxo Radar — Sistema de Pesquisa de Mercado</span>
              </div>
              <p className="text-xs text-gray-400">
                Relatório gerado em {new Date().toLocaleString('pt-BR')}
              </p>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
          body { background: white !important; }
        }
      `}</style>
    </>
  )
}
