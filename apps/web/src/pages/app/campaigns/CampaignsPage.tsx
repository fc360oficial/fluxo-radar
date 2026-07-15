import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, MapPin, Calendar, Target, ChevronRight, Play, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaigns, useActivateCampaign, useCancelCampaign } from '@/hooks/useCampaigns'
import { NewCampaignModal } from './NewCampaignModal'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  active: { label: 'Ativa', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  completed: { label: 'Concluída', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export function CampaignsPage() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: campaigns = [], isLoading } = useCampaigns()
  const activate = useActivateCampaign()
  const cancel = useCancelCampaign()

  const filtered = campaigns.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie todas as campanhas de pesquisa</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar campanha..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: campaigns.length, color: 'text-foreground' },
          { label: 'Ativas', value: campaigns.filter((c) => c.status === 'active').length, color: 'text-green-600' },
          { label: 'Concluídas', value: campaigns.filter((c) => c.status === 'completed').length, color: 'text-blue-600' },
          { label: 'Rascunho', value: campaigns.filter((c) => c.status === 'draft').length, color: 'text-gray-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border rounded-xl p-5">
                <Skeleton className="h-5 w-48 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          : filtered.length === 0
          ? (
            <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma campanha encontrada</p>
              <p className="text-sm mt-1">Crie sua primeira campanha clicando em "Nova Campanha"</p>
            </div>
          )
          : filtered.map((c) => {
            const status = STATUS_LABELS[c.status] ?? STATUS_LABELS.draft
            const pct = Math.min(Math.round((Number(c.total_surveys ?? 0) / c.goal) * 100), 100)

            return (
              <div
                key={c.id}
                className="bg-card border rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/app/campaigns/${c.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {c.neighborhood}, {c.city} - {c.state}
                      </span>
                      {c.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(c.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {c.status !== 'draft' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{Number(c.total_surveys ?? 0)}/{c.goal} pesquisas</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {c.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        disabled={activate.isPending}
                        onClick={() => activate.mutate(c.id)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Ativar
                      </Button>
                    )}
                    {c.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={cancel.isPending}
                        onClick={() => { if (confirm('Cancelar esta campanha?')) cancel.mutate(c.id) }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancelar
                      </Button>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )
          })}
      </div>

      <NewCampaignModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  )
}
