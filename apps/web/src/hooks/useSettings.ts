import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService } from '@/services/settings.service'
import { useAuthStore } from '@/stores/auth.store'

function useCompanyId() {
  return useAuthStore((s) => s.profile?.company_id)
}

export function useCompany() {
  return useQuery({
    queryKey: ['my-company'],
    queryFn: () => settingsService.getCompany(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsService.updateCompany,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-company'] }),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsService.updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useTeamMembers() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['team-members', companyId],
    queryFn: () => settingsService.getTeamMembers(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsService.createMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export function useDeactivateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => settingsService.deactivateMember(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export function useDeleteMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => settingsService.deleteMember(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members'] }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ newPassword }: { newPassword: string }) =>
      settingsService.changePassword(newPassword),
  })
}
