import { useState, useMemo } from 'react'
import {
  Calendar, CalendarDays, CheckCircle, ChevronLeft, ChevronRight,
  MapPin, Plus, QrCode, Search, Users, X, Phone, Mail, Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// ── Types ─────────────────────────────────────────────────────────────────────
type VisitStatus = 'scheduled' | 'in_store' | 'completed' | 'missed' | 'weekend'
type FilterType  = 'all' | 'today' | 'scheduled' | 'in_store' | 'completed' | 'missed' | 'weekend'

interface SupplierVisit {
  id: string
  date: string            // YYYY-MM-DD
  supplier: string
  promoter_name: string
  store: string
  scheduled_time?: string // HH:MM
  check_in_at: string | null
  check_out_at: string | null
  status: VisitStatus
  // Prepared for QR Code integration:
  // qr_code_id?: string | null
  // latitude?: number | null
  // longitude?: number | null
  // gps_accuracy?: number | null
}

// ── Status badges ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<VisitStatus, { label: string; bg: string; dot: string }> = {
  scheduled: { label: 'Agendada',        bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   dot: '🟡' },
  in_store:  { label: 'Na Loja',         bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',   dot: '🟢' },
  completed: { label: 'Realizada',       bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',       dot: '✅' },
  missed:    { label: 'Não Compareceu',  bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',           dot: '🔴' },
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

// ── Date helpers ──────────────────────────────────────────────────────────────
function localDate(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const TODAY = localDate()

// ── Mock data (TODO: replace with Supabase API) ───────────────────────────────
const MOCK_VISITS: SupplierVisit[] = [
  { id:'1',  date: TODAY,          supplier:'Nestlé',    promoter_name:'João Silva',      store:'Porta Larga',   scheduled_time:'09:00', check_in_at:'09:15', check_out_at:'10:42', status:'completed' },
  { id:'2',  date: TODAY,          supplier:'Aurora',    promoter_name:'Paulo Santos',    store:'Atacarejo Sul', scheduled_time:'08:30', check_in_at:'08:50', check_out_at:null,    status:'in_store'  },
  { id:'3',  date: TODAY,          supplier:'Coca-Cola', promoter_name:'Carlos Oliveira', store:'Muribeca',      scheduled_time:'10:00', check_in_at:null,    check_out_at:null,    status:'missed'    },
  { id:'4',  date: TODAY,          supplier:'Ambev',     promoter_name:'Roberto Costa',   store:'Ponte Nova',    scheduled_time:'14:00', check_in_at:null,    check_out_at:null,    status:'scheduled' },
  { id:'5',  date: localDate(-1),  supplier:'Bimbo',     promoter_name:'Maria Ferreira',  store:'Nordeste',      scheduled_time:'10:00', check_in_at:'10:05', check_out_at:'11:30', status:'completed' },
  { id:'6',  date: localDate(-1),  supplier:'Nestlé',    promoter_name:'João Silva',      store:'Atacarejo Sul', scheduled_time:'13:30', check_in_at:'13:35', check_out_at:'14:20', status:'completed' },
  { id:'7',  date: localDate(-1),  supplier:'Coca-Cola', promoter_name:'Carlos Oliveira', store:'Ponte Nova',    scheduled_time:'09:00', check_in_at:null,    check_out_at:null,    status:'missed'    },
  { id:'8',  date: localDate(1),   supplier:'Nestlé',    promoter_name:'João Silva',      store:'Porta Larga',   scheduled_time:'09:00', check_in_at:null,    check_out_at:null,    status:'scheduled' },
  { id:'9',  date: localDate(1),   supplier:'Aurora',    promoter_name:'Paulo Santos',    store:'Muribeca',      scheduled_time:'08:00', check_in_at:null,    check_out_at:null,    status:'scheduled' },
  { id:'10', date: localDate(2),   supplier:'Ambev',     promoter_name:'Roberto Costa',   store:'Nordeste',      scheduled_time:'14:00', check_in_at:null,    check_out_at:null,    status:'scheduled' },
  { id:'11', date: localDate(2),   supplier:'Bimbo',     promoter_name:'Maria Ferreira',  store:'Porta Larga',   scheduled_time:'09:00', check_in_at:null,    check_out_at:null,    status:'scheduled' },
  { id:'12', date: localDate(3),   supplier:'Coca-Cola', promoter_name:'Carlos Oliveira', store:'Atacarejo Sul', scheduled_time:'10:00', check_in_at:null,    check_out_at:null,    status:'scheduled' },
]

// ── Weekly Calendar ───────────────────────────────────────────────────────────
const WEEK_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function getWeekDates(offset: number): Date[] {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
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
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-40 text-center">
                {weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} —{' '}
                {weekDates[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Hoje</Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-7 gap-2 mt-2">
          {weekDates.map((date, i) => {
            const ds = dateStr(date)
            const dayVisits = visits
              .filter(v => v.date === ds)
              .sort((a, b) => (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? ''))
            const isToday   = ds === TODAY
            const isWeekend = i >= 5

            return (
              <div key={i} className={`rounded-xl border p-2 min-h-[130px] ${
                isToday ? 'border-primary bg-primary/5' : isWeekend ? 'bg-muted/30 border-dashed' : 'bg-card'
              }`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {WEEK_DAYS[i]}
                </p>
                <p className={`text-xl font-black leading-none mb-2 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {date.getDate()}
                </p>
                <div className="space-y-1">
                  {dayVisits.length === 0
                    ? <p className="text-[10px] text-muted-foreground/40 italic">—</p>
                    : dayVisits.map(v => (
                        <div key={v.id} className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-1">
                          <p className="text-[10px] font-bold text-primary truncate">{v.supplier}</p>
                          <p className="text-[10px] text-foreground truncate">{v.promoter_name.split(' ')[0]}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{v.store}</p>
                          {v.scheduled_time && (
                            <p className="text-[9px] font-semibold text-primary/70">{v.scheduled_time}</p>
                          )}
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
  const [form, setForm] = useState<AppointmentForm>({
    supplier: '', promoter_name: '', phone: '', email: '', store: '',
    date: TODAY, time: '09:00', periodicity: 'weekly', end_date: '', days: [],
  })

  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  function field(k: keyof AppointmentForm, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function toggleDay(d: string) {
    setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] }))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Novo Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input placeholder="ex: Nestlé, Coca-Cola…" value={form.supplier} onChange={e => field('supplier', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Promotor</Label>
              <Input placeholder="Nome completo" value={form.promoter_name} onChange={e => field('promoter_name', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="h-3 w-3" />Telefone</Label>
              <Input placeholder="(81) 99999-9999" value={form.phone} onChange={e => field('phone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Mail className="h-3 w-3" />E-mail</Label>
              <Input type="email" placeholder="promotor@fornecedor.com" value={form.email} onChange={e => field('email', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />Loja</Label>
            <Input placeholder="Nome da loja" value={form.store} onChange={e => field('store', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data inicial</Label>
              <Input type="date" value={form.date} onChange={e => field('date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Horário</Label>
              <Input type="time" value={form.time} onChange={e => field('time', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dias da semana</Label>
            <div className="flex gap-1.5">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => toggleDay(d)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.days.includes(d)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}>
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
            <div className="space-y-1.5">
              <Label>Data final</Label>
              <Input type="date" value={form.end_date} onChange={e => field('end_date', e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onClose} className="gap-2">
            <CheckCircle className="h-4 w-4" /> Salvar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
]

// ── Main page ─────────────────────────────────────────────────────────────────
interface KpiCard { label: string; value: number; Icon: React.ElementType; color: string }

export function PromotersPage() {
  const [filter, setFilter]         = useState<FilterType>('all')
  const [search, setSearch]         = useState('')
  const [showCalendar, setShowCalendar] = useState(false)
  const [showNew, setShowNew]       = useState(false)

  // KPIs — today only
  const todayVisits = MOCK_VISITS.filter(v => v.date === TODAY)
  const kpiCards: KpiCard[] = [
    { label: 'Visitas Previstas Hoje', value: todayVisits.length,                               Icon: Calendar,      color: 'text-primary'    },
    { label: 'Check-ins Realizados',   value: todayVisits.filter(v => v.check_in_at).length,    Icon: CheckCircle,   color: 'text-green-600'  },
    { label: 'Em Loja Agora',          value: todayVisits.filter(v => v.status==='in_store').length, Icon: MapPin,   color: 'text-blue-500'   },
    { label: 'Não Compareceram',       value: todayVisits.filter(v => v.status==='missed').length,   Icon: X,        color: 'text-red-500'    },
  ]

  // Filtered list
  const filtered = useMemo(() =>
    MOCK_VISITS
      .filter(v => {
        if (filter === 'today')     return v.date === TODAY
        if (filter === 'scheduled') return v.status === 'scheduled'
        if (filter === 'in_store')  return v.status === 'in_store'
        if (filter === 'completed') return v.status === 'completed'
        if (filter === 'missed')    return v.status === 'missed'
        if (filter === 'weekend')   return v.status === 'weekend'
        return true
      })
      .filter(v => !search ||
        v.supplier.toLowerCase().includes(search.toLowerCase()) ||
        v.promoter_name.toLowerCase().includes(search.toLowerCase()) ||
        v.store.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date) || (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? ''))
  , [filter, search])

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

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(k => (
          <div key={k.label} className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <k.Icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Search + calendar ── */}
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
        <Button variant="outline" className="gap-2" onClick={() => setShowCalendar(true)}>
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              {['Data', 'Fornecedor', 'Promotor', 'Loja', 'Entrada', 'Saída', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  Nenhuma visita encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((v, i) => {
                const st = STATUS_MAP[v.status]
                const fmtDate = (ds: string) =>
                  new Date(ds + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                return (
                  <tr key={v.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(v.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${supplierColor(v.supplier)}`}>
                        {v.supplier}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{v.promoter_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.store}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                      {v.check_in_at ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                      {v.check_out_at ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${st.bg}`}>
                        {st.dot} {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── QR Code notice (prepared for future integration) ── */}
      <div className="flex items-start gap-3 bg-muted/30 border border-dashed rounded-xl p-4">
        <QrCode className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Integração via QR Code — Em breve</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada loja terá um QR Code exclusivo. O promotor escaneará na entrada e saída para realizar
            check-in e check-out automático com hora, data, loja e GPS.
          </p>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCalendar && <WeeklyCalendar visits={MOCK_VISITS} onClose={() => setShowCalendar(false)} />}
      {showNew      && <NewAppointmentModal open={showNew} onClose={() => setShowNew(false)} />}
    </div>
  )
}
