import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mysteryShopperService } from '@/services/mystery-shopper.service'
import type { MysteryShopperEvaluation } from '@/types/database'

export function useMysteryShoppers(filters?: { status?: string; city?: string }) {
  return useQuery({
    queryKey: ['mystery-shoppers', filters],
    queryFn: () => mysteryShopperService.list(filters),
  })
}

export function useCreateEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<MysteryShopperEvaluation, 'id' | 'total_score' | 'created_at' | 'updated_at'>) =>
      mysteryShopperService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mystery-shoppers'] }),
  })
}

export function useCompleteEvaluation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scores }: {
      id: string
      scores: { attended_score: number; cleanliness_score: number; queue_score: number; variety_score: number; price_score: number; notes?: string }
    }) => mysteryShopperService.complete(id, scores),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mystery-shoppers'] }),
  })
}
