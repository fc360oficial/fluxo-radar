import { supabase } from '@/lib/supabase'

export interface CampaignQuestion {
  id: string
  order_index: number
  question_text: string
  question_type: 'text' | 'single_choice' | 'multiple_choice'
  options: string[] | null
  required: boolean
  field_key: string | null
}

export const campaignQuestionsService = {
  async list(campaign_id: string): Promise<CampaignQuestion[]> {
    const { data, error } = await supabase.rpc('get_campaign_questions', {
      p_campaign_id: campaign_id,
    })
    if (error) throw error
    return (data ?? []) as CampaignQuestion[]
  },

  async add(
    campaign_id: string,
    question_text: string,
    question_type: CampaignQuestion['question_type'] = 'text',
    options: string[] | null = null,
    required = true,
  ): Promise<string> {
    const { data, error } = await supabase.rpc('add_campaign_question', {
      p_campaign_id: campaign_id,
      p_question_text: question_text,
      p_question_type: question_type,
      p_options: options,
      p_required: required,
    })
    if (error) throw error
    return data as string
  },

  async update(
    question_id: string,
    question_text: string,
    question_type: CampaignQuestion['question_type'],
    options: string[] | null = null,
  ): Promise<void> {
    const { error } = await supabase.rpc('update_campaign_question', {
      p_question_id: question_id,
      p_question_text: question_text,
      p_question_type: question_type,
      p_options: options,
    })
    if (error) throw error
  },

  async remove(question_id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_campaign_question', {
      p_question_id: question_id,
    })
    if (error) throw error
  },
}
