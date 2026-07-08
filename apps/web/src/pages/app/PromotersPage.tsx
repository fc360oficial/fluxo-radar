import { useState, useMemo, useEffect } from 'react'
import {
  Calendar, CalendarDays, CheckCircle, ChevronLeft, ChevronRight,
  MapPin, Plus, QrCode, Search, Users, X, Phone, Mail, Building2,
  Clock, Store, BarChart3, Award, TrendingUp,
} from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

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
function minsAgoStr(mins: number) {
  const d = new Date(); d.setMinutes(d.getMinutes() - mins)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
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

// ── Mock data (TODO: replace with Supabase API) ───────────────────────────────
const MOCK_VISITS: SupplierVisit[] = [
  { id:'1',  date: TODAY,         supplier:'Nestlé',    promoter_name:'João Silva',      store:'Porta Larga',   scheduled_time:'09:00', check_in_at:'09:15',          check_out_at:'10:42', status:'completed' },
  { id:'2',  date: TODAY,         supplier:'Aurora',    promoter_name:'Paulo Santos',    store:'Atacarejo Sul', scheduled_time:'08:30', check_in_at: minsAgoStr(42),  check_out_at:null,    status:'in_store'  },
  { id:'3',  date: TODAY,         supplier:'Coca-Cola', promoter_name:'Carlos Oliveira', store:'Muribeca',      scheduled_time:'10:00', check_in_at:null,             check_out_at:null,    status:'missed'    },
  { id:'4',  date: TODAY,         supplier:'Ambev',     promoter_name:'Roberto Costa',   store:'Ponte Nova',    scheduled_time:'14:00', check_in_at:null,             check_out_at:null,    status:'scheduled' },
  { id:'5',  date: localDate(-1), supplier:'Bimbo',     promoter_name:'Maria Ferreira',  store:'Nordeste',      scheduled_time:'10:00', check_in_at:'10:05',          check_out_at:'11:30', status:'completed' },
  { id:'6',  date: localDate(-1), supplier:'Nestlé',    promoter_name:'João Silva',      store:'Atacarejo Sul', scheduled_time:'13:30', check_in_at:'13:28',          check_out_at:'14:15', status:'completed' },
  { id:'7',  date: localDate(-1), supplier:'Coca-Cola', promoter_name:'Carlos Oliveira', store:'Ponte Nova',    scheduled_time:'09:00', check_in_at:null,             check_out_at:null,    status:'missed'    },
  { id:'8',  date: localDate(1),  supplier:'Nestlé',    promoter_name:'João Silva',      store:'Porta Larga',   scheduled_time:'09:00', check_in_at:null,             check_out_at:null,    status:'scheduled' },
  { id:'9',  date: localDate(1),  supplier:'Aurora',    promoter_name:'Paulo Santos',    store:'Muribeca',      scheduled_time:'08:00', check_in_at:null,             check_out_at:null,    status:'scheduled' },
  { id:'10', date: localDate(2),  supplier:'Ambev',     promoter_name:'Roberto Costa',   store:'Nordeste',      scheduled_time:'14:00', check_in_at:null,             check_out_at:null,    status:'scheduled' },
  { id:'11', date: localDate(2),  supplier:'Bimbo',     promoter_name:'Maria Ferreira',  store:'Porta Larga',   scheduled_time:'09:00', check_in_at:null,             check_out_at:null,    status:'scheduled' },
  { id:'12', date: localDate(3),  supplier:'Coca-Cola', promoter_name:'Carlos Oliveira', store:'Atacarejo Sul', scheduled_time:'10:00', check_in_at:null,             check_out_at:null,    status:'scheduled' },
]

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

function NewAppointmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<AppointmentForm>({ supplier:'', promoter_name:'', phone:'', email:'', store:'', date:TODAY, time:'09:00', periodicity:'weekly', end_date:'', days:[] })
  const DAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
  function field(k: keyof AppointmentForm, v: string) { setForm(f => ({ ...f, [k]: v })) }
  function toggleDay(d: string) { setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] })) }
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Novo Agendamento</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fornecedor</Label><Input placeholder="ex: Nestlé, Coca-Cola…" value={form.supplier} onChange={e => field('supplier', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Nome do Promotor</Label><Input placeholder="Nome completo" value={form.promoter_name} onChange={e => field('promoter_name', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Phone className="h-3 w-3" />Telefone</Label><Input placeholder="(81) 99999-9999" value={form.phone} onChange={e => field('phone', e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Mail className="h-3 w-3" />E-mail</Label><Input type="email" placeholder="promotor@fornecedor.com" value={form.email} onChange={e => field('email', e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />Loja</Label><Input placeholder="Nome da loja" value={form.store} onChange={e => field('store', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Data inicial</Label><Input type="date" value={form.date} onChange={e => field('date', e.target.value)} /></div>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onClose} className="gap-2"><CheckCircle className="h-4 w-4" /> Salvar Agendamento</Button>
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
  const [tick, setTick]                 = useState(0)

  // Refresh elapsed time every minute
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // KPIs — today only
  const todayVisits = MOCK_VISITS.filter(v => v.date === TODAY)
  const todayCompleted = todayVisits.filter(v => v.status === 'completed' || v.status === 'in_store').length
  const todayMissed    = todayVisits.filter(v => v.status === 'missed').length
  const progressToday  = todayVisits.length > 0 ? Math.round((todayCompleted / todayVisits.length) * 100) : 0

  // Filtered list
  const filtered = useMemo(() => {
    const next7End = localDate(7)
    return MOCK_VISITS
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
  }, [filter, search, tick])

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

      {/* ── Estrutura para indicadores futuros (em desenvolvimento) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { icon: BarChart3,  label: 'Cumprimento por Fornecedor' },
          { icon: Store,      label: 'Cumprimento por Loja' },
          { icon: Clock,      label: 'Tempo Médio em Loja' },
          { icon: Award,      label: 'Ranking de Promotores' },
          { icon: TrendingUp, label: 'Ranking de Fornecedores' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="bg-card border border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center opacity-50">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
            <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full font-semibold text-muted-foreground uppercase tracking-wide">Em breve</span>
          </div>
        ))}
      </div>

      {/* ── QR Code notice ── */}
      <div className="flex items-start gap-4 bg-muted/30 border border-dashed rounded-xl p-5">
        <QrCode className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold">Check-in Inteligente</p>
            <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">Em desenvolvimento</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Cada loja possuirá um QR Code exclusivo. O promotor realizará Check-in e Check-out utilizando esse QR Code.
          </p>
          <p className="text-xs text-muted-foreground">O sistema registrará automaticamente:</p>
          <ul className="mt-1 space-y-0.5">
            {['Loja','Data','Hora','Tempo em loja','Localização (GPS)'].map(item => (
              <li key={item} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />{item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Modals / Drawer ── */}
      {showCalendar && <WeeklyCalendar visits={MOCK_VISITS} onClose={() => setShowCalendar(false)} />}
      {showNew      && <NewAppointmentModal open={showNew} onClose={() => setShowNew(false)} />}
      {drawerSupplier && <SupplierDrawer supplierName={drawerSupplier} visits={MOCK_VISITS} onClose={() => setDrawerSupplier(null)} />}
    </div>
  )
}
