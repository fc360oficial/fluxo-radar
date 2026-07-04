export type UserRole = 'admin' | 'supervisor' | 'viewer' | 'interviewer'
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type SurveyReason = 'price' | 'quality' | 'butcher' | 'bakery' | 'location' | 'service' | 'promotions' | 'other'
export type SurveyTransport = 'foot' | 'car' | 'motorcycle' | 'bicycle' | 'uber' | 'bus'
export type SurveySwitch = 'price' | 'better_butcher' | 'better_bakery' | 'more_variety' | 'service' | 'delivery' | 'promotions' | 'organized_store'
export type SurveyFrequency = 'daily' | '2_3_week' | 'weekly' | 'monthly'
export type SurveyIntention = 'yes' | 'maybe' | 'no'
export type ReportStatus = 'generating' | 'completed' | 'failed'
export type NotificationType = 'campaign_alert' | 'campaign_completed' | 'sync_error' | 'goal_warning'

export interface Company {
  id: string
  name: string
  cnpj: string | null
  email: string
  phone: string | null
  logo_url: string | null
  plan: string
  status: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  company_id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  status: string
  interviewer_pin: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  company_id: string
  name: string
  city: string
  neighborhood: string
  state: string
  responsible_id: string
  start_date: string
  end_date: string | null
  goal: number
  status: CampaignStatus
  notes: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CampaignInterviewer {
  id: string
  campaign_id: string
  interviewer_id: string
  individual_goal: number | null
  assigned_at: string
  assigned_by: string | null
  status: string
}

export interface Survey {
  id: string
  campaign_id: string
  interviewer_id: string
  company_id: string
  q1_main_supermarket: string
  q2_main_reason: SurveyReason
  q2_main_reason_other: string | null
  q3_complaint: string
  q4_transport: SurveyTransport
  q5_switch_reasons: SurveySwitch[]
  q6_frequency: SurveyFrequency
  q7_intention: SurveyIntention
  latitude: number
  longitude: number
  address: string | null
  gps_accuracy: number | null
  surveyed_at: string
  interview_duration_secs: number
  device_model: string | null
  app_version: string | null
  local_id: string
  synced_at: string | null
  is_valid: boolean
  validation_flags: string[] | null
  created_at: string
}

export interface AiReport {
  id: string
  campaign_id: string
  company_id: string
  generated_by: string
  status: ReportStatus
  executive_summary: string | null
  consumer_profile: Record<string, unknown> | null
  competitors: Record<string, unknown> | null
  opportunities: string[] | null
  strengths: string[] | null
  weaknesses: string[] | null
  risks: string[] | null
  success_probability: number | null
  strategic_recommendation: string | null
  final_conclusion: string | null
  model_used: string
  tokens_used: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface PdfReport {
  id: string
  campaign_id: string
  ai_report_id: string | null
  company_id: string
  generated_by: string
  status: ReportStatus
  file_url: string | null
  file_size_kb: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface Notification {
  id: string
  company_id: string
  campaign_id: string | null
  user_id: string | null
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown>
  read: boolean
  read_at: string | null
  created_at: string
}

// Views
export interface CampaignProgress extends Campaign {
  total_surveys: number
  percent_complete: number
  remaining: number
  surveys_today: number
  avg_duration_secs: number | null
}

export interface InterviewerRanking {
  campaign_id: string
  interviewer_id: string
  name: string
  avatar_url: string | null
  individual_goal: number | null
  total: number
  today: number
  avg_duration_secs: number | null
  last_survey_at: string | null
}

// Database type para Supabase client
export interface Database {
  public: {
    Tables: {
      companies: { Row: Company; Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Company> }
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      campaigns: { Row: Campaign; Insert: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Campaign> }
      campaign_interviewers: { Row: CampaignInterviewer; Insert: Omit<CampaignInterviewer, 'id' | 'assigned_at'>; Update: Partial<CampaignInterviewer> }
      surveys: { Row: Survey; Insert: Omit<Survey, 'id' | 'created_at' | 'synced_at'>; Update: Partial<Survey> }
      ai_reports: { Row: AiReport; Insert: Omit<AiReport, 'id' | 'created_at'>; Update: Partial<AiReport> }
      pdf_reports: { Row: PdfReport; Insert: Omit<PdfReport, 'id' | 'created_at'>; Update: Partial<PdfReport> }
      notifications: { Row: Notification; Insert: Omit<Notification, 'id' | 'created_at'>; Update: Partial<Notification> }
    }
    Views: {
      campaign_progress: { Row: CampaignProgress }
      interviewer_ranking: { Row: InterviewerRanking }
    }
  }
}
