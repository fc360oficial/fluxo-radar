import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'
import { useAuthStore } from '@/stores/auth.store'

function useCompanyId() {
  return useAuthStore((s) => s.profile?.company_id)
}

export function useDashboardKpis() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['dashboard-kpis', companyId],
    queryFn: () => dashboardService.getKpis(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  })
}

export function useActivityFeed() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['dashboard-activity', companyId],
    queryFn: () => dashboardService.getActivityFeed(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useModuleSummary() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['dashboard-modules', companyId],
    queryFn: () => dashboardService.getModuleSummary(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  })
}

export function useTeamInField() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['dashboard-team', companyId],
    queryFn: () => dashboardService.getTeamInField(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useCollectionTypesToday() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['dashboard-collection-types', companyId],
    queryFn: () => dashboardService.getCollectionTypesToday(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  })
}

export function useVisitStatusToday() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['dashboard-visit-status', companyId],
    queryFn: () => dashboardService.getVisitStatusToday(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 2,
  })
}

export function useStoreRanking() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['dashboard-store-ranking', companyId],
    queryFn: () => dashboardService.getStoreRanking(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useIaSummary() {
  const companyId = useCompanyId()
  return useQuery({
    queryKey: ['dashboard-ia-summary', companyId],
    queryFn: () => dashboardService.getIaSummary(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useDailySurveys() {
  return useQuery({
    queryKey: ['dashboard-daily-surveys'],
    queryFn: () => dashboardService.getDailySurveys(),
    staleTime: 1000 * 60 * 5,
  })
}
