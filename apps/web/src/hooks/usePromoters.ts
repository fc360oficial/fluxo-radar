import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promotersService } from '@/services/promoters.service'
import type { PromoterVisit } from '@/types/database'

export function usePromoterVisits(filters?: { promoter_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['promoter-visits', filters],
    queryFn: () => promotersService.listVisits(filters),
  })
}

export function usePromotersList() {
  return useQuery({
    queryKey: ['promoters-list'],
    queryFn: () => promotersService.listPromoters(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreatePromoterVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<PromoterVisit, 'id' | 'created_at' | 'updated_at'>) =>
      promotersService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoter-visits'] }),
  })
}

export function usePromoterCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, coords }: { id: string; coords?: { latitude: number; longitude: number } }) =>
      promotersService.checkIn(id, coords),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoter-visits'] }),
  })
}
