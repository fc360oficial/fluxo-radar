import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expansionService } from '@/services/expansion.service'
import type { ExpansionStudy } from '@/types/database'

export function useExpansion(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['expansion', filters],
    queryFn: () => expansionService.list(filters),
  })
}

export function useCreateExpansionStudy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<ExpansionStudy, 'id' | 'created_at' | 'updated_at'>) =>
      expansionService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expansion'] }),
  })
}

export function useApproveStudy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expansionService.approve(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expansion'] }),
  })
}

export function useRejectStudy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expansionService.reject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expansion'] }),
  })
}
