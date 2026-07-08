import { useState, useMemo, useEffect, useCallback } from 'react'
import { usePromoterVisits, useCreatePromoterVisit } from '@/hooks/usePromoters'
import {
  Calendar, CalendarDays, CheckCircle, ChevronLeft, ChevronRight,
  MapPin, Plus, QrCode, Search, Users, X, Phone, Mail, Building2,
  Clock, Store, BarChart3, Award, TrendingUp, Printer, Download,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// URL base do check-in mobile (alterar quando PWA for publicado)
const CHECKIN_BASE = 'https://campo.fluxoradar.com.br'
function storeCheckinUrl(store: string) {
  return `${CHECKIN_BASE}/checkin/${encodeURIComponent(store)}`
}

// ── Types ─────────────────────────────────────────────────────────────────────
type VisitStatus = 'scheduled' | 'in_store' | 'completed' | 'missed' | 'weekend'
type FilterType  = 'all' | 'today' | 'scheduled' | 'in_store' | 'completed' | 'missed' | 'weekend' | 'next7'

interface SupplierVisit {
  id: string
  date: string             // YYYY-MM-DD
  supplier: string
  promoter_name: string
  store: string
  scheduled_time?: string  // HH:MM
  check_in_at: string | null
  check_out_at: string | null
  status: VisitStatus
  // Prepared for QR Code integration:
  // qr_code_id?: string | null
  // latitude?: number | null
  // longitude?: number | null
  // gps_accuracy?: number | null
}

// Prepared for future indicator aggregations:
// interface SupplierCompliance { supplier: string; planned: number; realized: number; missed: number; avg_duration_mins: number }
// interface StoreCompliance    { store: string; planned: number; realized: number }
// interface PromoterRanking    { promoter_name: string; punctuality_rate: number; avg_duration_mins: number }

// ── Status badges ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<VisitStatus, { label: string; bg: string; dot: string }> = {
  scheduled: { label: 'Agendada',        bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',    dot: '🟡' },
  in_store:  { label: 'Na Loja',         bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',    dot: '🟢' },
  completed: { label: 'Realizada',       bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',        dot: '✅' },
  missed:    { label: 'Não Compareceu',  bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',            dot: '🔴' },
  weekend:   { label: 'Final de Semana', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', dot: '🟣' },
}

// ── Supplier colors ───────────────────────────────────────────────────────────
const SUPPLIER_COLORS: Record<string, string> = {
  'Nestlé':    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Coca-Cola': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'Aurora':    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Ambev':     'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Bimbo':     'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
}
function supplierColor(s: string) {
  return SUPPLIER_COLORS[s] ?? 'bg-muted text-foreground'
}

// ── Supplier mock details (TODO: replace with DB) ─────────────────────────────
const SUPPLIER_DETAILS: Record<string, { phone: string; email: string; stores: string[]; days: string[]; periodicity: string; notes: string }> = {
  'Nestlé':    { phone: '(81) 99111-0001', email: 'joao.silva@nestle.com',    stores: ['Porta Larga', 'Atacarejo Sul'], days: ['Seg', 'Qua', 'Sex'], periodicity: 'Semanal',   notes: 'Foco em produtos lácteos e achocolatados.' },
  'Coca-Cola': { phone: '(81) 99222-0002', email: 'carlos.o@coca-cola.com',   stores: ['Muribeca', 'Ponte Nova'],      days: ['Ter', 'Qui'],         periodicity: 'Quinzenal', notes: 'Reposição de refrigerantes e sucos.' },
  'Aurora':    { phone: '(81) 99333-0003', email: 'paulo.s@aurora.coop.br',   stores: ['Atacarejo Sul', 'Muribeca'],   days: ['Seg', 'Qua'],         periodicity: 'Semanal',   notes: 'Proteínas e embutidos. Chega às 08h.' },
  'Ambev':     { phone: '(81) 99444-0004', email: 'roberto.c@ambev.com.br',   stores: ['Ponte Nova', 'Nordeste'],      days: ['Qua', 'Sex'],         periodicity: 'Semanal',   notes: 'Cervejas, refrigerantes e isotônicos.' },
  'Bimbo':     { phone: '(81) 99555-0005', email: 'maria.f@grupobimbo.com',   stores: ['Nordeste', 'Porta Larga'],     days: ['Seg', 'Qui'],         periodicity: 'Semanal',   notes: 'Pães, bolos e biscoitos.' },
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function localDate(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const TODAY = localDate()

// ── Time utilities ────────────────────────────────────────────────────────────
function elapsedSince(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const checkIn = new Date(now); checkIn.setHours(h, m, 0, 0)
  const mins = Math.max(0, Math.round((now.getTime() - checkIn.getTime()) / 60000))
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60), rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}min` : `${hrs}h`
}

function delayBadge(scheduled: string | undefined, checkIn: string | null): { label: string; color: string } | null {
  if (!scheduled || !checkIn) return null
  const [sh, sm] = scheduled.split(':').map(Number)
  const [ch, cm] = checkIn.split(':').map(Number)
  const diff = (ch * 60 + cm) - (sh * 60 + sm)
  if (diff <= -5)  return { label: `Antecipado ${Math.abs(diff)}min`, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' }
  if (diff <= 5)   return { label: 'Pontual',                         color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
  return { label: `Atrasado ${diff}min`, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
}

function avgDuration(visits: SupplierVisit[]): string {
  const done = visits.filter(v => v.check_in_at && v.check_out_at)
  if (!done.length) return '—'
  const total = done.reduce((acc, v) => {
    const [ih, im] = v.check_in_at!.split(':').map(Number)
    const [oh, om] = v.check_out_at!.split(':').map(Number)
    return acc + (oh * 60 + om) - (ih * 60 + im)
  }, 0)
  const avg = Math.round(total / done.length)
  return avg < 60 ? `${avg} min` : `${Math.floor(avg/60)}h ${avg%60 ? avg%60 + 'min' : ''}`
}

// ── Weekly Calendar ───────────────────────────────────────────────────────────
const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function getWeekDates(offset: number): Date[] {
  const now = new Date(); const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}
function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function WeeklyCalendar({ visits, onClose }: { visits: SupplierVisit[]; onClose: () => void }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekDates = getWeekDates(weekOffset)
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[82vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Agenda Semanal
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-medium min-w-40 text-center">
                {weekDates[0].toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })} —{' '}
                {weekDates[6].toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Hoje</Button>
            </div>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-7 gap-2 mt-2">
          {weekDates.map((date, i) => {
            const ds = dateStr(date)
            const dayVisits = visits.filter(v => v.date === ds).sort((a,b) => (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? ''))
            const isToday = ds === TODAY; const isWeekend = i >= 5
            return (
              <div key={i} className={`rounded-xl border p-2 min-h-[130px] ${isToday ? 'border-primary bg-primary/5' : isWeekend ? 'bg-muted/30 border-dashed' : 'bg-card'}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{WEEK_DAYS[i]}</p>
                <p className={`text-xl font-black leading-none mb-2 ${isToday ? 'text-primary' : 'text-foreground'}`}>{date.getDate()}</p>
                <div className="space-y-1">
                  {dayVisits.length === 0
                    ? <p className="text-[10px] text-muted-foreground/40 italic">—</p>
                    : dayVisits.map(v => (
                        <div key={v.id} className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-1">
                          <p className="text-[10px] font-bold text-primary truncate">{v.supplier}</p>
                          <p className="text-[10px] text-foreground truncate">{v.promoter_name.split(' ')[0]}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{v.store}</p>
                          {v.scheduled_time && <p className="text-[9px] font-semibold text-primary/70">{v.scheduled_time}</p>}
                        </div>
                      ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── New Appointment Modal ─────────────────────────────────────────────────────
interface AppointmentForm {
  supplier: string; promoter_name: string; phone: string; email: string
  store: string; date: string; time: string; periodicity: string
  end_date: string; days: string[]
}

function NewAppointmentModal({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (form: AppointmentForm) => Promise<void>
}) {
  const [form, setForm] = useState<AppointmentForm>({ supplier:'', promoter_name:'', phone:'', email:'', store:'', date:TODAY, time:'09:00', periodicity:'weekly', end_date:'', days:[] })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const DAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
  function field(k: keyof AppointmentForm, v: string) { setForm(f => ({ ...f, [k]: v })) }
  function toggleDay(d: string) { setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] })) }
  async function handleSave() {
    if (!form.supplier || !form.promoter_name || !form.store || !form.date) {
      setError('Preencha fornecedor, promotor, loja e data.'); return
    }
    setSaving(true); setError(null)
    try { await onSave(form); onClose() }
    catch { setError('Erro ao salvar. Tente novamente.') }
    finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Novo Agendamento</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fornecedor <span className="text-destructive">*</span></Label><Input placeholder="ex: Nestlé, Coca-Cola…" value={form.supplier} onChange={e => field('supplier', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Nome do Promotor <span className="text-destructive">*</span></Label><Input placeholder="Nome completo" value={form.promoter_name} onChange={e => field('promoter_name', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Phone className="h-3 w-3" />Telefone</Label><Input placeholder="(81) 99999-9999" value={form.phone} onChange={e => field('phone', e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Mail className="h-3 w-3" />E-mail</Label><Input type="email" placeholder="promotor@fornecedor.com" value={form.email} onChange={e => field('email', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />Loja <span className="text-destructive">*</span></Label><Input placeholder="Nome da loja" value={form.store} onChange={e => field('store', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Data inicial <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={e => field('date', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Horário</Label><Input type="time" value={form.time} onChange={e => field('time', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Dias da semana</Label>
            <div className="flex gap-1.5">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${form.days.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Periodicidade</Label>
              <Select value={form.periodicity} onValueChange={v => field('periodicity', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Data final</Label><Input type="date" value={form.end_date} onChange={e => field('end_date', e.target.value)} /></div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Salvando…</> : <><CheckCircle className="h-4 w-4" /> Salvar Agendamento</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Supplier Drawer ───────────────────────────────────────────────────────────
function SupplierDrawer({ supplierName, visits, onClose }: { supplierName: string; visits: SupplierVisit[]; onClose: () => void }) {
  const details   = SUPPLIER_DETAILS[supplierName]
  const history   = visits.filter(v => v.supplier === supplierName && (v.status === 'completed' || v.status === 'missed')).slice(0, 6)
  const promoter  = visits.find(v => v.supplier === supplierName)?.promoter_name ?? '—'
  const avg       = avgDuration(visits.filter(v => v.supplier === supplierName))

  const fmtDate = (ds: string) => new Date(ds + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div className="w-96 bg-background border-l shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supplierColor(supplierName)}`}>{supplierName}</span>
            <h3 className="text-base font-bold mt-1.5">{promoter}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Contact */}
          <div className="px-5 py-4 border-b space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Contato</p>
            {details ? (
              <>
                <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{details.phone}</div>
                <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />{details.email}</div>
              </>
            ) : <p className="text-sm text-muted-foreground">Sem dados cadastrados.</p>}
          </div>

          {/* Schedule */}
          <div className="px-5 py-4 border-b space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Programação</p>
            {details && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Lojas atendidas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {details.stores.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-muted rounded-md font-medium flex items-center gap-1">
                        <Store className="h-3 w-3" />{s}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Dias programados</p>
                  <div className="flex gap-1">
                    {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
                      <span key={d} className={`text-[10px] px-1.5 py-1 rounded font-semibold ${details.days.includes(d) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground/50'}`}>{d}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div><p className="text-xs text-muted-foreground">Periodicidade</p><p className="text-sm font-semibold mt-0.5">{details.periodicity}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tempo médio em loja</p><p className="text-sm font-semibold mt-0.5">{avg}</p></div>
                </div>
                {details.notes && (
                  <div><p className="text-xs text-muted-foreground mb-1">Observações</p><p className="text-xs bg-muted/50 rounded-lg p-2.5">{details.notes}</p></div>
                )}
              </>
            )}
          </div>

          {/* History */}
          <div className="px-5 py-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Últimas Visitas</p>
            {history.length === 0
              ? <p className="text-sm text-muted-foreground">Sem histórico.</p>
              : (
                <div className="space-y-2">
                  {history.map(v => {
                    const st = STATUS_MAP[v.status]
                    const dur = v.check_in_at && v.check_out_at
                      ? (() => {
                          const [ih,im] = v.check_in_at.split(':').map(Number)
                          const [oh,om] = v.check_out_at.split(':').map(Number)
                          const mins = (oh*60+om)-(ih*60+im)
                          return mins < 60 ? `${mins}min` : `${Math.floor(mins/60)}h${mins%60?mins%60+'min':''}`
                        })()
                      : null
                    return (
                      <div key={v.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                        <div>
                          <p className="font-semibold">{fmtDate(v.date)} — {v.store}</p>
                          <p className="text-muted-foreground mt-0.5">
                            {v.check_in_at ?? '—'} → {v.check_out_at ?? '—'}{dur ? ` · ${dur}` : ''}
                          </p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${st.bg}`}>{st.dot}</span>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Filters ───────────────────────────────────────────────────────────────────
const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all',       label: 'Todos' },
  { key: 'today',     label: 'Hoje' },
  { key: 'scheduled', label: 'Agendados' },
  { key: 'in_store',  label: 'Em Loja' },
  { key: 'completed', label: 'Realizados' },
  { key: 'missed',    label: 'Não Compareceram' },
  { key: 'weekend',   label: 'Final de Semana' },
  { key: 'next7',     label: 'Próximos 7 dias' },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export function PromotersPage() {
  const [filter, setFilter]             = useState<FilterType>('all')
  const [search, setSearch]             = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [showNew, setShowNew]           = useState(false)
  const [drawerSupplier, setDrawerSupplier] = useState<string | null>(null)
  const [qrStore, setQrStore]           = useState<string | null>(null)
  const [tick, setTick]                 = useState(0)

  // Real data from Supabase
  const { data: realVisits } = usePromoterVisits()
  const createVisit = useCreatePromoterVisit()

  const handleSaveAppointment = useCallback(async (form: AppointmentForm) => {
    await createVisit.mutateAsync({
      supplier_name:   form.supplier,
      promoter_name:   form.promoter_name,
      promoter_phone:  form.phone || undefined,
      promoter_email:  form.email || undefined,
      store_name:      form.store,
      visit_date:      form.date,
      scheduled_time:  form.time || undefined,
      status:          'scheduled',
    })
  }, [createVisit])

  const VISITS: SupplierVisit[] = (realVisits as unknown as SupplierVisit[]) ?? []

  // Refresh elapsed time every minute
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // KPIs — today only
  const todayVisits = VISITS.filter(v => v.date === TODAY)
  const todayCompleted = todayVisits.filter(v => v.status === 'completed' || v.status === 'in_store').length
  const todayMissed    = todayVisits.filter(v => v.status === 'missed').length
  const progressToday  = todayVisits.length > 0 ? Math.round((todayCompleted / todayVisits.length) * 100) : 0

  // Filtered list
  const filtered = useMemo(() => {
    const next7End = localDate(7)
    return VISITS
      .filter(v => {
        if (filter === 'today')     return v.date === TODAY
        if (filter === 'scheduled') return v.status === 'scheduled'
        if (filter === 'in_store')  return v.status === 'in_store'
        if (filter === 'completed') return v.status === 'completed'
        if (filter === 'missed')    return v.status === 'missed'
        if (filter === 'weekend')   return v.status === 'weekend'
        if (filter === 'next7')     return v.date > TODAY && v.date <= next7End
        return true
      })
      .filter(v => !search ||
        v.supplier.toLowerCase().includes(search.toLowerCase()) ||
        v.promoter_name.toLowerCase().includes(search.toLowerCase()) ||
        v.store.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date) || (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? ''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search, tick, VISITS])

  // ── Indicator calculations ────────────────────────────────────────────────
  const supplierCompliance = useMemo(() => {
    const map: Record<string, { planned: number; realized: number; missed: number }> = {}
    VISITS.forEach(v => {
      if (!map[v.supplier]) map[v.supplier] = { planned: 0, realized: 0, missed: 0 }
      map[v.supplier].planned++
      if (v.status === 'completed' || v.status === 'in_store') map[v.supplier].realized++
      if (v.status === 'missed') map[v.supplier].missed++
    })
    return Object.entries(map)
      .map(([supplier, s]) => ({ supplier, ...s, rate: Math.round((s.realized / s.planned) * 100) }))
      .sort((a, b) => b.rate - a.rate)
  }, [VISITS])

  const storeCompliance = useMemo(() => {
    const map: Record<string, { planned: number; realized: number }> = {}
    VISITS.forEach(v => {
      if (!map[v.store]) map[v.store] = { planned: 0, realized: 0 }
      map[v.store].planned++
      if (v.status === 'completed' || v.status === 'in_store') map[v.store].realized++
    })
    return Object.entries(map)
      .map(([store, s]) => ({ store, ...s, rate: Math.round((s.realized / s.planned) * 100) }))
      .sort((a, b) => b.rate - a.rate)
  }, [VISITS])

  const promoterRanking = useMemo(() => {
    const map: Record<string, { total: number; onTime: number; totalMins: number; count: number }> = {}
    VISITS.forEach(v => {
      if (!map[v.promoter_name]) map[v.promoter_name] = { total: 0, onTime: 0, totalMins: 0, count: 0 }
      if (v.check_in_at) {
        map[v.promoter_name].total++
        if (v.scheduled_time) {
          const [sh, sm] = v.scheduled_time.split(':').map(Number)
          const [ch, cm] = v.check_in_at.split(':').map(Number)
          if ((ch * 60 + cm) - (sh * 60 + sm) <= 5) map[v.promoter_name].onTime++
        }
      }
      if (v.check_in_at && v.check_out_at) {
        const [ih, im] = v.check_in_at.split(':').map(Number)
        const [oh, om] = v.check_out_at.split(':').map(Number)
        map[v.promoter_name].totalMins += (oh * 60 + om) - (ih * 60 + im)
        map[v.promoter_name].count++
      }
    })
    return Object.entries(map)
      .map(([name, s]) => ({
        name,
        total: s.total,
        onTime: s.onTime,
        avgMins: s.count > 0 ? Math.round(s.totalMins / s.count) : 0,
        punctuality: s.total > 0 ? Math.round((s.onTime / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.punctuality - a.punctuality)
  }, [VISITS])

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Promotores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Controle das visitas dos promotores dos fornecedores nas lojas da rede.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      {/* ── 4 KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Visitas Previstas Hoje — com barra de progresso */}
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Visitas Previstas Hoje</p>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{todayVisits.length}</p>
          <div className="mt-3 space-y-1">
            <Progress value={progressToday} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">{todayCompleted} de {todayVisits.length} realizadas · {progressToday}%</p>
          </div>
        </div>

        {/* Check-ins Realizados */}
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Check-ins Realizados</p>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {todayVisits.filter(v => v.check_in_at !== null).length}
          </p>
        </div>

        {/* Em Loja Agora */}
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Em Loja Agora</p>
            <MapPin className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {todayVisits.filter(v => v.status === 'in_store').length}
          </p>
        </div>

        {/* Não Compareceram — borda vermelha quando > 0 */}
        <div className={`bg-card border rounded-xl p-4 transition-all ${
          todayMissed > 0 ? 'border-red-400 dark:border-red-500 ring-1 ring-red-200 dark:ring-red-900/40' : ''
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs ${todayMissed > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}`}>
              Não Compareceram
            </p>
            <X className={`h-4 w-4 ${todayMissed > 0 ? 'text-red-500' : 'text-red-500'}`} />
          </div>
          <p className={`font-bold ${todayMissed > 0 ? 'text-3xl text-red-600 dark:text-red-400' : 'text-2xl text-red-500'}`}>
            {todayMissed}
          </p>
          {todayMissed > 0 && (
            <p className="text-[10px] text-red-500 mt-1 font-semibold">⚠ Requer atenção</p>
          )}
        </div>
      </div>

      {/* ── Cumprimento da Agenda ── */}
      <div className="bg-card border rounded-xl px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <BarChart3 className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Cumprimento da Agenda</p>
              <p className="text-xs text-muted-foreground">
                {todayCompleted} de {todayVisits.length} visitas realizadas hoje
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-sm">
            <Progress value={progressToday} className="flex-1 h-2.5" />
            <span className="text-sm font-bold shrink-0 min-w-10 text-right">{progressToday}%</span>
          </div>
        </div>
      </div>

      {/* ── Search + calendar button ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar fornecedor, promotor ou loja..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button className="gap-2" onClick={() => setShowCalendar(true)}>
          <CalendarDays className="h-4 w-4" /> Agenda Semanal
        </Button>
      </div>

      {/* ── Filter chips ── */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                {['Data','Fornecedor','Promotor','Loja','Programado','Entrada','Saída','Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Nenhuma visita encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((v, i) => {
                  const st     = STATUS_MAP[v.status]
                  const delay  = delayBadge(v.scheduled_time, v.check_in_at)
                  const fmtDate = (ds: string) => new Date(ds + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' })
                  return (
                    <tr key={v.id}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>

                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(v.date)}</td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDrawerSupplier(v.supplier)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supplierColor(v.supplier)}`}>
                            {v.supplier}
                          </span>
                        </button>
                      </td>

                      <td className="px-4 py-3 font-medium whitespace-nowrap">{v.promoter_name}</td>

                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{v.store}</td>

                      {/* Programado */}
                      <td className="px-4 py-3 text-center text-muted-foreground tabular-nums font-medium">
                        {v.scheduled_time ?? '—'}
                      </td>

                      {/* Entrada + badge atraso */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-muted-foreground tabular-nums">{v.check_in_at ?? '—'}</span>
                          {delay && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${delay.color}`}>
                              {delay.label}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                        {v.check_out_at ?? '—'}
                      </td>

                      {/* Status + tempo em loja */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg}`}>
                            {st.dot} {st.label}
                          </span>
                          {v.status === 'in_store' && v.check_in_at && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground pl-1">
                              <Clock className="h-3 w-3" />{elapsedSince(v.check_in_at)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Indicadores ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores</h2>

        {/* Cumprimento por Fornecedor + por Loja */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Cumprimento por Fornecedor</p>
            </div>
            <div className="space-y-3.5">
              {supplierCompliance.map(s => (
                <div key={s.supplier}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supplierColor(s.supplier)}`}>{s.supplier}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{s.realized}/{s.planned} visitas</span>
                      <span className={`font-bold tabular-nums ${s.rate >= 80 ? 'text-green-600' : s.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.rate}%</span>
                    </div>
                  </div>
                  <Progress value={s.rate} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Store className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Cumprimento por Loja</p>
            </div>
            <div className="space-y-3.5">
              {storeCompliance.map(s => (
                <div key={s.store}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium truncate max-w-[60%]">{s.store}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{s.realized}/{s.planned}</span>
                      <span className={`font-bold tabular-nums ${s.rate >= 80 ? 'text-green-600' : s.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.rate}%</span>
                    </div>
                  </div>
                  <Progress value={s.rate} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ranking Promotores + Tempo Médio + Ranking Fornecedores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Ranking de Promotores */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Ranking de Promotores</p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">por pontualidade</p>
            <div className="space-y-3">
              {promoterRanking.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className={`text-xs font-black w-5 shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700/70' : 'text-muted-foreground'}`}>{i+1}°</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium truncate">{p.name.split(' ')[0]}</p>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-muted-foreground">{p.onTime}/{p.total}</span>
                        <span className={`font-bold tabular-nums ${p.punctuality >= 80 ? 'text-green-600' : p.punctuality >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{p.punctuality}%</span>
                      </div>
                    </div>
                    <Progress value={p.punctuality} className="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tempo Médio em Loja */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Tempo Médio em Loja</p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">por promotor</p>
            <div className="space-y-3">
              {(() => {
                const withTime = promoterRanking.filter(p => p.avgMins > 0).sort((a, b) => b.avgMins - a.avgMins)
                const maxMins = withTime[0]?.avgMins ?? 1
                return withTime.map((p, i) => {
                  const pct = Math.round((p.avgMins / maxMins) * 100)
                  const h = Math.floor(p.avgMins / 60)
                  const m = p.avgMins % 60
                  const dur = h > 0 ? `${h}h${m ? m + 'min' : ''}` : `${m}min`
                  return (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">{i+1}°</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium truncate">{p.name.split(' ')[0]}</p>
                          <span className="text-xs font-bold text-primary shrink-0 ml-2">{dur}</span>
                        </div>
                        <Progress value={pct} className="h-1" />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Ranking de Fornecedores */}
          <div className="bg-card border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Ranking de Fornecedores</p>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">por cumprimento</p>
            <div className="space-y-3">
              {supplierCompliance.map((s, i) => (
                <div key={s.supplier} className="flex items-center gap-2">
                  <span className={`text-xs font-black w-5 shrink-0 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700/70' : 'text-muted-foreground'}`}>{i+1}°</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${supplierColor(s.supplier)}`}>{s.supplier}</span>
                      <span className={`text-xs font-bold tabular-nums ${s.rate >= 80 ? 'text-green-600' : s.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{s.rate}%</span>
                    </div>
                    <Progress value={s.rate} className="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── QR Code por loja ── */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <QrCode className="h-5 w-5 text-primary shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">Check-in Inteligente</p>
                <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">Em desenvolvimento</span>
              </div>
              <p className="text-xs text-muted-foreground">
                QR Codes exclusivos por loja — promotores escaneiam para registrar entrada e saída
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from(new Set(VISITS.map(v => v.store))).sort().map(store => (
            <button
              key={store}
              onClick={() => setQrStore(store)}
              className="group border rounded-xl p-3 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-center"
            >
              <div className="bg-white rounded-lg p-2 border group-hover:border-primary/30 transition-colors">
                <QRCodeSVG value={storeCheckinUrl(store)} size={72} />
              </div>
              <p className="text-xs font-semibold leading-tight">{store}</p>
              <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                <Printer className="h-3 w-3" /> Ver / Imprimir
              </span>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground mt-4 border-t pt-3">
          Fixe o QR Code na entrada de cada loja. O promotor escaneia com o celular para registrar check-in e check-out automaticamente. O sistema registrará: loja, data, hora, tempo em loja e localização (GPS).
        </p>
      </div>

      {/* Dialog QR Code ampliado */}
      {qrStore && (
        <Dialog open onOpenChange={() => setQrStore(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" /> {qrStore}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="bg-white p-5 rounded-2xl border-2 shadow-sm">
                <QRCodeSVG
                  value={storeCheckinUrl(qrStore)}
                  size={220}
                  includeMargin={false}
                  imageSettings={{ src: '/logo.png', height: 36, width: 36, excavate: true }}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">{qrStore}</p>
                <p className="text-xs text-muted-foreground">Check-in Inteligente · Fluxo Radar</p>
              </div>
              <div className="w-full bg-muted/50 rounded-lg px-3 py-2">
                <p className="text-[10px] text-muted-foreground font-mono break-all text-center">
                  {storeCheckinUrl(qrStore)}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="gap-2" onClick={() => {
                const svg = document.querySelector('.qr-print-target svg')
                if (svg) {
                  const win = window.open('', '_blank')
                  if (win) {
                    win.document.write(`<html><head><title>QR Code · ${qrStore}</title><style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;flex-direction:column;gap:16px} p{font-size:18px;font-weight:700}</style></head><body>${svg.outerHTML}<p>${qrStore}</p><p style="font-size:12px;font-weight:400;color:#666">Check-in Inteligente · Fluxo Radar</p></body></html>`)
                    win.document.close()
                    win.print()
                  }
                } else {
                  window.print()
                }
              }}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                const canvas = document.createElement('canvas')
                const size = 400
                canvas.width = size; canvas.height = size
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  const svgEl = document.querySelector('.qr-print-target svg')
                  if (svgEl) {
                    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' })
                    const url = URL.createObjectURL(blob)
                    const img = new Image(); img.src = url
                    img.onload = () => {
                      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, size, size)
                      ctx.drawImage(img, 0, 0, size, size)
                      const a = document.createElement('a')
                      a.download = `qrcode-${qrStore.toLowerCase().replace(/\s+/g, '-')}.png`
                      a.href = canvas.toDataURL('image/png')
                      a.click()
                      URL.revokeObjectURL(url)
                    }
                  }
                }
              }}>
                <Download className="h-4 w-4" /> Baixar PNG
              </Button>
              <Button onClick={() => setQrStore(null)}>Fechar</Button>
            </DialogFooter>
            {/* Target invisível para print/export */}
            <div className="qr-print-target hidden">
              <QRCodeSVG value={storeCheckinUrl(qrStore)} size={400} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modals / Drawer ── */}
      {showCalendar && <WeeklyCalendar visits={VISITS} onClose={() => setShowCalendar(false)} />}
      {showNew      && <NewAppointmentModal open={showNew} onClose={() => setShowNew(false)} onSave={handleSaveAppointment} />}
      {drawerSupplier && <SupplierDrawer supplierName={drawerSupplier} visits={VISITS} onClose={() => setDrawerSupplier(null)} />}
    </div>
  )
}
