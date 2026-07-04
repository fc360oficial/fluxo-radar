import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsService, type CreateCampaignData } from '@/services/campaigns.service'
import { useAuthStore } from '@/stores/auth.store'

const KEYS = {
  all: ['campaigns'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  progress: (id: string) => [...KEYS.all, 'progress', id] as const,
  interviewers: (id: string) => [...KEYS.all, 'interviewers', id] as const,
  supervisors: () => [...KEYS.all, 'supervisors'] as const,
}

export function useCampaigns() {
  return useQuery({ queryKey: KEYS.list(), queryFn: campaignsService.listRaw })
}

export function useCampaignProgress(id: string) {
  return useQuery({ queryKey: KEYS.progress(id), queryFn: () => campaignsService.getProgress(id) })
}

export function useCampaign(id: string) {
  return useQuery({ queryKey: KEYS.detail(id), queryFn: () => campaignsService.getById(id) })
}

export function useCampaignInterviewers(campaign_id: string) {
  return useQuery({ queryKey: KEYS.interviewers(campaign_id), queryFn: () => campaignsService.getInterviewers(campaign_id) })
}

export function useSupervisors() {
  return useQuery({ queryKey: KEYS.supervisors(), queryFn: campaignsService.getSupervisors })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()

  return useMutation({
    mutationFn: (data: CreateCampaignData) =>
      campaignsService.create({ ...data, company_id: profile!.company_id, created_by: profile!.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useActivateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => campaignsService.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useCancelCampaign() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  return useMutation({
    mutationFn: (id: string) => campaignsService.cancel(id, profile!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}
