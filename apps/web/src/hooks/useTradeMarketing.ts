import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tradeMarketingService } from '@/services/trade-marketing.service'
import type { TradeMarketingVisit } from '@/types/database'

export function useTradeMarketing(filters?: { status?: string; city?: string }) {
  return useQuery({
    queryKey: ['trade-marketing', filters],
    queryFn: () => tradeMarketingService.list(filters),
  })
}

export function useCreateTradeVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<TradeMarketingVisit, 'id' | 'created_at' | 'updated_at'>) =>
      tradeMarketingService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trade-marketing'] }),
  })
}

export function useCompleteTradeVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, score }: { id: string; score: number }) =>
      tradeMarketingService.complete(id, score),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trade-marketing'] }),
  })
}
