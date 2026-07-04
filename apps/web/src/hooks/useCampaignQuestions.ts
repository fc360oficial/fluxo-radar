import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignQuestionsService } from '@/services/campaign-questions.service'
import type { CampaignQuestion } from '@/services/campaign-questions.service'

export type { CampaignQuestion }

export function useCampaignQuestions(campaignId: string) {
  return useQuery({
    queryKey: ['campaign-questions', campaignId],
    queryFn: () => campaignQuestionsService.list(campaignId),
    staleTime: 1000 * 60 * 5,
    enabled: !!campaignId,
  })
}

export function useAddQuestion(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      question_text,
      question_type,
      options,
      required,
    }: Omit<CampaignQuestion, 'id' | 'order_index' | 'field_key'>) =>
      campaignQuestionsService.add(campaignId, question_text, question_type, options, required),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-questions', campaignId] }),
  })
}

export function useUpdateQuestion(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      question_text,
      question_type,
      options,
    }: Pick<CampaignQuestion, 'id' | 'question_text' | 'question_type' | 'options'>) =>
      campaignQuestionsService.update(id, question_text, question_type, options),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-questions', campaignId] }),
  })
}

export function useDeleteQuestion(campaignId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => campaignQuestionsService.remove(questionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-questions', campaignId] }),
  })
}
