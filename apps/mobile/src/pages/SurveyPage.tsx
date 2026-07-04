import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MapPin, Loader2, CheckCircle, WifiOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { enqueue } from '@/lib/offlineQueue'

interface Question {
  id: string
  order_index: number
  question_text: string
  question_type: 'text' | 'single_choice' | 'multiple_choice'
  options: string[] | null
  required: boolean
  field_key: string | null
}

interface GpsPosition {
  latitude: number
  longitude: number
  accuracy: number
}

type Answers = Record<string, string | string[]>

export function SurveyPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [questions, setQuestions] = useState<Question[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [gps, setGps] = useState<GpsPosition | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [syncStatus, setSyncStatus] = useState<'saving' | 'saved' | 'queued' | 'error'>('saving')
  const [startTime, setStartTime] = useState(Date.now())
  const [userId, setUserId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    loadCampaign()
    captureGps()
  }, [])

  async function loadCampaign() {
    const [{ data: camp }, { data: qs }, { data: { session } }] = await Promise.all([
      supabase.from('campaigns').select('name').eq('id', id!).single(),
      supabase.rpc('get_campaign_questions', { p_campaign_id: id }),
      supabase.auth.getSession(),
    ])
    setCampaignName((camp as { name: string } | null)?.name ?? '')
    setQuestions((qs ?? []) as Question[])

    if (session?.user) {
      setUserId(session.user.id)
      const { data: prof } = await supabase.from('profiles').select('company_id').eq('id', session.user.id).single()
      setCompanyId((prof as { company_id: string } | null)?.company_id ?? null)
    }

    setLoading(false)
  }

  function captureGps() {
    if (!navigator.geolocation) { setGpsError('GPS não disponível'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setGpsError('Não foi possível obter localização'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function toggleMulti(questionId: string, option: string) {
    const current_ = (answers[questionId] as string[] | undefined) ?? []
    const next = current_.includes(option)
      ? current_.filter(o => o !== option)
      : [...current_, option]
    setAnswer(questionId, next)
  }

  const q = questions[current]
  const answer = q ? answers[q.id] : undefined
  const isAnswered = q ? (
    q.question_type === 'multiple_choice'
      ? ((answer as string[] | undefined)?.length ?? 0) > 0
      : !!(answer as string | undefined)?.trim()
  ) : false
  const canAdvance = !q?.required || isAnswered

  async function handleSubmit() {
    if (submitting || !userId || !companyId) return
    setSubmitting(true)

    const durationSecs = Math.round((Date.now() - startTime) / 1000)
    const payload: Record<string, unknown> = {
      campaign_id:              id,
      interviewer_id:           userId,
      company_id:               companyId,
      latitude:                 gps?.latitude ?? 0,
      longitude:                gps?.longitude ?? 0,
      gps_accuracy:             gps?.accuracy ?? null,
      interview_duration_secs:  durationSecs,
      local_id:                 crypto.randomUUID(),
      surveyed_at:              new Date().toISOString(),
    }

    for (const question of questions) {
      const val = answers[question.id]
      if (val !== undefined && question.field_key) {
        if (question.question_type === 'multiple_choice') {
          payload[question.field_key] = Array.isArray(val) ? val : [val]
        } else {
          payload[question.field_key] = Array.isArray(val) ? val[0] : val
        }
      }
    }

    // Mostra sucesso imediatamente — não espera a rede
    setSyncStatus('saving')
    setDone(true)
    setSubmitting(false)

    // Envia em background via RPC (SECURITY DEFINER, sem RLS)
    if (navigator.onLine) {
      supabase.rpc('submit_survey', { p_payload: payload }).then(({ error }) => {
        if (error) {
          console.error('RPC error:', error)
          enqueue({ campaignId: id!, payload })
          setSyncStatus('queued')
        } else {
          setSyncStatus('saved')
        }
      })
    } else {
      enqueue({ campaignId: id!, payload })
      setSyncStatus('queued')
    }
  }

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-amber-400 flex flex-col items-center justify-center px-6 text-center safe-top safe-bottom">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Pesquisa enviada!</h2>
          {syncStatus === 'saving' && (
            <div className="flex items-center gap-1.5 justify-center text-gray-400 bg-gray-50 rounded-xl px-3 py-2 mb-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium">Sincronizando...</span>
            </div>
          )}
          {syncStatus === 'saved' && (
            <div className="flex items-center gap-1.5 justify-center text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-3">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Salvo no banco ✓</span>
            </div>
          )}
          {syncStatus === 'queued' && (
            <div className="flex items-center gap-1.5 justify-center text-amber-600 bg-amber-50 rounded-xl px-3 py-2 mb-3">
              <WifiOff className="h-4 w-4" />
              <span className="text-xs font-medium">Salvo offline — enviará depois</span>
            </div>
          )}
          <p className="text-gray-500 text-sm mb-6">Obrigado pela coleta! Continue com a próxima entrevista.</p>
          <button
            onClick={() => { setDone(false); setAnswers({}); setCurrent(0); setStartTime(Date.now()); setSyncStatus('saving') }}
            className="w-full h-12 bg-amber-400 text-white font-bold rounded-xl active:bg-amber-500"
          >
            Nova entrevista
          </button>
          <button
            onClick={() => navigate('/campaigns', { replace: true })}
            className="w-full h-12 text-gray-500 font-medium mt-2"
          >
            Voltar às campanhas
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    )
  }

  if (!q) return null

  const progress = ((current) / questions.length) * 100

  // ── Survey form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col safe-top">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => current > 0 ? setCurrent(c => c - 1) : navigate(-1)} className="p-1.5 text-gray-500">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400 truncate">{campaignName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{current + 1}/{questions.length}</span>
          </div>
        </div>
        {gps ? (
          <div className="flex items-center gap-1 text-green-500">
            <MapPin className="h-4 w-4" />
          </div>
        ) : gpsError ? (
          <div className="flex items-center gap-1 text-amber-400" title={gpsError}>
            <MapPin className="h-4 w-4" />
          </div>
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
        )}
      </div>

      {/* Question */}
      <div className="flex-1 px-5 pt-6 pb-4 flex flex-col">
        <div className="mb-2">
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Pergunta {q.order_index}</span>
          {!q.required && <span className="ml-2 text-xs text-gray-400">(opcional)</span>}
        </div>
        <h2 className="text-xl font-bold text-gray-900 leading-snug mb-6">{q.question_text}</h2>

        {/* Text answer */}
        {q.question_type === 'text' && (
          <textarea
            rows={4}
            value={(answer as string) ?? ''}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            placeholder="Digite sua resposta..."
            className="w-full rounded-2xl border border-gray-200 p-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        )}

        {/* Single choice */}
        {q.question_type === 'single_choice' && q.options && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setAnswer(q.id, opt)}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm font-medium transition-all ${
                  answer === opt
                    ? 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-gray-100 bg-white text-gray-700 active:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    answer === opt ? 'border-amber-400 bg-amber-400' : 'border-gray-300'
                  }`}>
                    {answer === opt && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  {opt}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Multiple choice */}
        {q.question_type === 'multiple_choice' && q.options && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">Selecione todas que se aplicam</p>
            {q.options.map((opt) => {
              const selected = ((answer as string[] | undefined) ?? []).includes(opt)
              return (
                <button
                  key={opt}
                  onClick={() => toggleMulti(q.id, opt)}
                  className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 text-sm font-medium transition-all ${
                    selected
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-gray-100 bg-white text-gray-700 active:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      selected ? 'border-amber-400 bg-amber-400' : 'border-gray-300'
                    }`}>
                      {selected && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    {opt}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="bg-white border-t border-gray-100 px-5 py-4 safe-bottom">
        {submitError && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <p className="text-xs text-red-700 font-medium">{submitError}</p>
          </div>
        )}
        {current < questions.length - 1 ? (
          <button
            onClick={() => canAdvance && setCurrent(c => c + 1)}
            disabled={!canAdvance}
            className={`w-full h-13 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              canAdvance
                ? 'bg-amber-400 text-white active:bg-amber-500'
                : 'bg-gray-100 text-gray-300'
            }`}
            style={{ height: '52px' }}
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canAdvance || submitting}
            className={`w-full rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              canAdvance && !submitting
                ? 'bg-green-500 text-white active:bg-green-600'
                : 'bg-gray-100 text-gray-300'
            }`}
            style={{ height: '52px' }}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : '✓ Enviar pesquisa'}
          </button>
        )}
      </div>
    </div>
  )
}
