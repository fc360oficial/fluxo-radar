import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { competitionService } from '@/services/competition.service'
import type { CompetitorVisit } from '@/types/database'

export function useCompetition(filters?: { competitor_name?: string; city?: string; trend?: string }) {
  return useQuery({
    queryKey: ['competition', filters],
    queryFn: () => competitionService.list(filters),
  })
}

export function useCreateCompetitorVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Omit<CompetitorVisit, 'id' | 'created_at'>) =>
      competitionService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competition'] }),
  })
}
