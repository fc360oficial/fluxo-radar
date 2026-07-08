import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promotersService } from '@/services/promoters.service'
import type { CreateVisitInput, CreateSupplierInput } from '@/services/promoters.service'

// Default: últimos 30 dias + próximos 14
function defaultRange() {
  const from = new Date(); from.setDate(from.getDate() - 30)
  const to   = new Date(); to.setDate(to.getDate() + 14)
  const fmt  = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

export function usePromoterVisits(dateFrom?: string, dateTo?: string) {
  const range = defaultRange()
  return useQuery({
    queryKey: ['promoter-visits', dateFrom ?? range.from, dateTo ?? range.to],
    queryFn:  () => promotersService.listVisits(dateFrom ?? range.from, dateTo ?? range.to),
    staleTime: 1000 * 60,
  })
}

export function useCreatePromoterVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVisitInput) => promotersService.createVisit(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoter-visits'] }),
  })
}

export function usePromoterCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, lat, lng }: { id: string; lat?: number; lng?: number }) =>
      promotersService.checkIn(id, lat, lng),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoter-visits'] }),
  })
}

export function usePromoterCheckOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotersService.checkOut(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoter-visits'] }),
  })
}

export function useMarkMissed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotersService.markMissed(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoter-visits'] }),
  })
}

export function useDeletePromoterVisit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => promotersService.deleteVisit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoter-visits'] }),
  })
}

export function usePromoterSuppliers() {
  return useQuery({
    queryKey: ['promoter-suppliers'],
    queryFn:  () => promotersService.listSuppliers(),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpsertSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSupplierInput) => promotersService.upsertSupplier(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promoter-suppliers'] }),
  })
}
