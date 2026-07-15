import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft, MapPin, Calendar, Target, Users, Play, X,
  TrendingUp, Clock, CheckCircle, Plus, Pencil, Trash2,
  AlignLeft, ListChecks, CheckSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  useCampaign, useCampaignProgress, useCampaignInterviewers,
  useActivateCampaign, useCancelCampaign,
} from '@/hooks/useCampaigns'
import {
  useCampaignQuestions, useAddQuestion, useUpdateQuestion, useDeleteQuestion,
} from '@/hooks/useCampaignQuestions'
import type { CampaignQuestion } from '@/hooks/useCampaignQuestions'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  active:    { label: 'Ativa',    color: 'bg-green-100 text-green-700' },
  completed: { label: 'Concluída',color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelada',color: 'bg-red-100 text-red-700' },
}

const TYPE_LABELS: Record<CampaignQuestion['question_type'], { label: string; icon: React.ElementType; color: string }> = {
  text:            { label: 'Texto livre',     icon: AlignLeft,    color: 'bg-slate-100 text-slate-600' },
  single_choice:   { label: 'Única escolha',   icon: CheckSquare,  color: 'bg-blue-100 text-blue-700'  },
  multiple_choice: { label: 'Múltipla escolha',icon: ListChecks,   color: 'bg-purple-100 text-purple-700' },
}

interface QuestionDialogProps {
  open: boolean
  onClose: () => void
  initial?: CampaignQuestion | null
  onSave: (data: { question_text: string; question_type: CampaignQuestion['question_type']; options: string[] | null; required: boolean }) => void
  isPending: boolean
}

function QuestionDialog({ open, onClose, initial, onSave, isPending }: QuestionDialogProps) {
  const [text, setText] = useState(initial?.question_text ?? '')
  const [type, setType] = useState<CampaignQuestion['question_type']>(initial?.question_type ?? 'text')
  const [optionsRaw, setOptionsRaw] = useState((initial?.options ?? []).join('\n'))
  const [required, setRequired] = useState(initial?.required ?? true)

  function handleSave() {
    if (!text.trim()) return
    const options = type !== 'text'
      ? optionsRaw.split('\n').map(s => s.trim()).filter(Boolean)
      : null
    onSave({ question_text: text.trim(), question_type: type, options: options?.length ? options : null, required })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar pergunta' : 'Nova pergunta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Texto da pergunta</Label>
            <Textarea
              rows={2}
              placeholder="Ex: Qual supermercado você mais frequenta?"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de resposta</Label>
            <Select value={type} onValueChange={(v) => setType(v as CampaignQuestion['question_type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto livre</SelectItem>
                <SelectItem value="single_choice">Única escolha</SelectItem>
                <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type !== 'text' && (
            <div className="space-y-1.5">
              <Label>Opções <span className="text-muted-foreground text-xs">(uma por linha)</span></Label>
              <Textarea
                rows={5}
                placeholder={'Opção 1\nOpção 2\nOpção 3'}
                value={optionsRaw}
                onChange={(e) => setOptionsRaw(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="required" checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="required" className="cursor-pointer">Resposta obrigatória</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending || !text.trim()}>
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [questionDialog, setQuestionDialog] = useState<{ open: boolean; editing: CampaignQuestion | null }>({
    open: false, editing: null,
  })

  const { data: campaign, isLoading: loadingCampaign } = useCampaign(id!)
  const { data: progress } = useCampaignProgress(id!)
  const { data: interviewers = [] } = useCampaignInterviewers(id!)
  const { data: questions = [], isLoading: loadingQuestions } = useCampaignQuestions(id!)
  const activate = useActivateCampaign()
  const cancel   = useCancelCampaign()
  const addQ     = useAddQuestion(id!)
  const updateQ  = useUpdateQuestion(id!)
  const deleteQ  = useDeleteQuestion(id!)

  if (loadingCampaign) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!campaign) return null

  const pct    = progress ? Math.min(Math.round((Number(progress.total_surveys ?? 0) / campaign.goal) * 100), 100) : 0
  const status = STATUS_LABELS[campaign.status] ?? STATUS_LABELS.draft

  function openAdd() { setQuestionDialog({ open: true, editing: null }) }
  function openEdit(q: CampaignQuestion) { setQuestionDialog({ open: true, editing: q }) }
  function closeDialog() { setQuestionDialog({ open: false, editing: null }) }

  async function handleSave(data: { question_text: string; question_type: CampaignQuestion['question_type']; options: string[] | null; required: boolean }) {
    if (questionDialog.editing) {
      await updateQ.mutateAsync({ id: questionDialog.editing.id, ...data })
    } else {
      await addQ.mutateAsync(data)
    }
    closeDialog()
  }

  async function handleDelete(q: CampaignQuestion) {
    if (!confirm(`Remover a pergunta "${q.question_text}"?`)) return
    await deleteQ.mutateAsync(q.id)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      {/* Title + actions */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {campaign.neighborhood}, {campaign.city} – {campaign.state}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Início: {new Date(campaign.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
            {campaign.end_date && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Término: {new Date(campaign.end_date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <Button
              variant="outline" className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
              disabled={activate.isPending}
              onClick={() => activate.mutate(campaign.id)}
            >
              <Play className="h-4 w-4 mr-2" /> Ativar Campanha
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button
              variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
              disabled={cancel.isPending}
              onClick={() => { if (confirm('Cancelar esta campanha?')) cancel.mutate(campaign.id) }}
            >
              <X className="h-4 w-4 mr-2" /> Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Target className="h-4 w-4" /><span className="text-sm">Meta</span>
          </div>
          <p className="text-2xl font-bold">{campaign.goal}</p>
          <p className="text-xs text-muted-foreground mt-0.5">pesquisas</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" /><span className="text-sm">Realizadas</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{Number(progress?.total_surveys ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">válidas</p>
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4 text-primary" /><span className="text-sm">Progresso</span>
          </div>
          <p className="text-2xl font-bold">{pct}%</p>
          <Progress value={pct} className="h-1.5 mt-2" />
        </div>
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" /><span className="text-sm">Hoje</span>
          </div>
          <p className="text-2xl font-bold">{Number(progress?.surveys_today ?? 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">pesquisas hoje</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="questionnaire">
        <TabsList>
          <TabsTrigger value="questionnaire">
            Questionário
            <span className="ml-1.5 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {questions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="interviewers">Entrevistadores</TabsTrigger>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
        </TabsList>

        {/* ── Questionário ─────────────────────────────────────────────────── */}
        <TabsContent value="questionnaire" className="mt-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {questions.length} pergunta{questions.length !== 1 ? 's' : ''} nesta campanha
              </p>
              <Button size="sm" className="gap-1.5" onClick={openAdd}>
                <Plus className="h-3.5 w-3.5" /> Adicionar pergunta
              </Button>
            </div>

            {loadingQuestions ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))
            ) : questions.length === 0 ? (
              <div className="bg-card border rounded-xl p-10 text-center text-muted-foreground">
                <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma pergunta cadastrada</p>
                <p className="text-sm mt-1">Clique em "Adicionar pergunta" para começar</p>
              </div>
            ) : (
              questions.map((q) => {
                const typeCfg = TYPE_LABELS[q.question_type]
                const TypeIcon = typeCfg.icon
                return (
                  <div key={q.id} className="bg-card border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      {/* Number */}
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                        <span className="text-xs font-bold text-primary">{q.order_index}</span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{q.question_text}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeCfg.color}`}>
                            <TypeIcon className="h-3 w-3" /> {typeCfg.label}
                          </span>
                          {!q.required && (
                            <span className="text-[10px] text-muted-foreground border rounded-full px-2 py-0.5">Opcional</span>
                          )}
                          {q.field_key && (
                            <span className="text-[10px] text-muted-foreground border rounded-full px-2 py-0.5 font-mono">{q.field_key}</span>
                          )}
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {q.options.map((opt, i) => (
                              <span key={i} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{opt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => openEdit(q)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(q)}
                          title="Remover"
                          disabled={deleteQ.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* ── Entrevistadores ──────────────────────────────────────────────── */}
        <TabsContent value="interviewers" className="mt-4">
          {interviewers.length === 0 ? (
            <div className="bg-card border rounded-xl p-10 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum entrevistador atribuído</p>
              <p className="text-sm mt-1">Adicione entrevistadores para iniciar as coletas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interviewers.map((iv: any, i: number) => (
                <div key={iv.interviewer_id} className="bg-card border rounded-xl p-4 flex items-center gap-4">
                  <div className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</div>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {iv.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{iv.name}</p>
                    {iv.last_survey_at && (
                      <p className="text-xs text-muted-foreground">
                        Última pesquisa: {new Date(iv.last_survey_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{iv.total}</p>
                    <p className="text-xs text-muted-foreground">pesquisas</p>
                  </div>
                  {iv.today > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">+{iv.today}</p>
                      <p className="text-xs text-muted-foreground">hoje</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Visão Geral ──────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4">
          <div className="bg-card border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold">Informações da Campanha</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Responsável</p>
                <p className="font-medium mt-0.5">{(campaign as any).responsible?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criado em</p>
                <p className="font-medium mt-0.5">{new Date(campaign.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tempo médio de entrevista</p>
                <p className="font-medium mt-0.5">
                  {progress?.avg_duration_secs ? `${Math.round(Number(progress.avg_duration_secs))}s` : '—'}
                </p>
              </div>
              {campaign.notes && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Observações</p>
                  <p className="font-medium mt-0.5">{campaign.notes}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Question dialog */}
      <QuestionDialog
        open={questionDialog.open}
        onClose={closeDialog}
        initial={questionDialog.editing}
        onSave={handleSave}
        isPending={addQ.isPending || updateQ.isPending}
      />
    </div>
  )
}
