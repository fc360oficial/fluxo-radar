import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { useCreateCampaign, useSupervisors } from '@/hooks/useCampaigns'
import { useAuthStore } from '@/stores/auth.store'

const STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const schema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  city: z.string().min(2, 'Informe a cidade'),
  neighborhood: z.string().min(2, 'Informe o bairro'),
  state: z.string().length(2, 'Selecione o estado'),
  responsible_id: z.string().uuid('Selecione o responsável'),
  start_date: z.string().min(1, 'Informe a data de início'),
  end_date: z.string().optional(),
  goal: z.coerce.number().int().min(1, 'Meta deve ser maior que 0'),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function NewCampaignModal({ open, onClose }: Props) {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const { data: supervisors = [] } = useSupervisors()
  const createCampaign = useCreateCampaign()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { responsible_id: profile?.id, state: '' },
  })

  const onSubmit = async (data: FormData) => {
    const campaign = await createCampaign.mutateAsync(data)
    reset()
    onClose()
    navigate(`/app/campaigns/${campaign.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Campanha</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome da campanha</Label>
              <Input placeholder="Ex: Pesquisa Jardim Paulista" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input placeholder="São Paulo" {...register('city')} />
              {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Bairro</Label>
              <Input placeholder="Centro" {...register('neighborhood')} />
              {errors.neighborhood && <p className="text-xs text-destructive">{errors.neighborhood.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select onValueChange={(v) => setValue('state', v)} value={watch('state')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-xs text-destructive">{errors.state.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select onValueChange={(v) => setValue('responsible_id', v)} value={watch('responsible_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.responsible_id && <p className="text-xs text-destructive">{errors.responsible_id.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Data de início</Label>
              <Input type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-xs text-destructive">{errors.start_date.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Data de término (opcional)</Label>
              <Input type="date" {...register('end_date')} />
            </div>

            <div className="space-y-1.5">
              <Label>Meta de pesquisas</Label>
              <Input type="number" min={1} placeholder="400" {...register('goal')} />
              {errors.goal && <p className="text-xs text-destructive">{errors.goal.message}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea placeholder="Informações adicionais sobre a campanha..." {...register('notes')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createCampaign.isPending}>
              {createCampaign.isPending ? 'Criando...' : 'Criar Campanha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
