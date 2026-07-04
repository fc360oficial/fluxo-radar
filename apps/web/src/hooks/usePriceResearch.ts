import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { priceResearchService } from '@/services/price-research.service'
import type { PriceCollection } from '@/types/database'

export function usePriceResearch(filters?: { campaign_id?: string; store_name?: string; in_stock?: boolean }) {
  return useQuery({
    queryKey: ['price-research', filters],
    queryFn: () => priceResearchService.list(filters),
  })
}

export function useCreatePriceCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<PriceCollection, 'id' | 'created_at'>) =>
      priceResearchService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['price-research'] }),
  })
}
