export type UserRole = 'admin' | 'supervisor' | 'viewer' | 'interviewer'
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type SurveyReason = 'price' | 'quality' | 'butcher' | 'bakery' | 'location' | 'service' | 'promotions' | 'other'
export type SurveyTransport = 'foot' | 'car' | 'motorcycle' | 'bicycle' | 'uber' | 'bus'
export type SurveySwitch = 'price' | 'better_butcher' | 'better_bakery' | 'more_variety' | 'service' | 'delivery' | 'promotions' | 'organized_store'
export type SurveyFrequency = 'daily' | '2_3_week' | 'weekly' | 'monthly'
export type SurveyIntention = 'yes' | 'maybe' | 'no'
export type ReportStatus = 'generating' | 'completed' | 'failed'
export type NotificationType = 'campaign_alert' | 'campaign_completed' | 'sync_error' | 'goal_warning'
export type VisitStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type PromoterStatus = 'pending' | 'checked_in' | 'completed' | 'missed'
export type ExpansionStatus = 'studying' | 'approved' | 'rejected' | 'on_hold'
export type CompetitorTrend = 'up' | 'down' | 'stable'

export interface Company {
  id: string; name: string; cnpj: string | null; email: string
  phone: string | null; logo_url: string | null; plan: string; status: string
  settings: Record<string, unknown>; created_at: string; updated_at: string
}

export interface Profile {
  id: string; company_id: string; name: string; email: string
  phone: string | null; avatar_url: string | null; role: UserRole
  status: string; interviewer_pin: string | null
  last_login_at: string | null; created_at: string; updated_at: string
}

export interface Campaign {
  id: string; company_id: string; name: string; city: string
  neighborhood: string; state: string; responsible_id: string
  start_date: string; end_date: string | null; goal: number
  status: CampaignStatus; notes: string | null
  completed_at: string | null; cancelled_at: string | null
  cancelled_by: string | null; created_by: string
  created_at: string; updated_at: string
  total_surveys?: number
}

export interface Survey {
  id: string; campaign_id: string; interviewer_id: string; company_id: string
  q1_main_supermarket: string; q2_main_reason: SurveyReason
  q2_main_reason_other: string | null; q3_complaint: string
  q4_transport: SurveyTransport; q5_switch_reasons: SurveySwitch[]
  q6_frequency: SurveyFrequency; q7_intention: SurveyIntention
  latitude: number; longitude: number; address: string | null
  gps_accuracy: number | null; surveyed_at: string
  interview_duration_secs: number; device_model: string | null
  app_version: string | null; local_id: string; synced_at: string | null
  is_valid: boolean; validation_flags: string[] | null; created_at: string
}

export interface Notification {
  id: string; company_id: string; campaign_id: string | null
  user_id: string | null; type: NotificationType; title: string
  message: string; data: Record<string, unknown>; read: boolean
  read_at: string | null; created_at: string
}

// ─── Novos módulos ────────────────────────────────────────────────────────────

export interface PriceCollection {
  id: string; company_id: string; campaign_id: string | null
  store_name: string; store_address: string | null; city: string
  product_name: string; product_brand: string | null
  product_category: string | null; barcode: string | null; unit: string
  current_price: number; reference_price: number | null; in_stock: boolean
  photo_url: string | null; collected_by: string; collected_at: string
  notes: string | null; created_at: string
}

export interface TradeMarketingVisit {
  id: string; company_id: string; campaign_id: string | null
  store_name: string; store_address: string | null; city: string
  visit_type: string; status: VisitStatus; score: number | null
  checklist: unknown[]; photos_count: number
  visited_by: string; visited_at: string | null
  notes: string | null; created_at: string; updated_at: string
}

export interface PromoterVisit {
  id: string; company_id: string; promoter_id: string
  store_name: string; store_address: string | null; city: string
  product_count: number; photos_count: number; goal: number
  status: PromoterStatus; checked_in_at: string | null
  checked_out_at: string | null; latitude: number | null
  longitude: number | null; notes: string | null
  created_at: string; updated_at: string
}

export interface MysteryShopperEvaluation {
  id: string; company_id: string; store_name: string
  store_address: string | null; city: string; evaluator_id: string
  attended_score: number | null; cleanliness_score: number | null
  queue_score: number | null; variety_score: number | null
  price_score: number | null; total_score: number | null
  status: 'pending' | 'in_progress' | 'completed'
  evaluated_at: string | null; photos_count: number
  notes: string | null; created_at: string; updated_at: string
}

export interface ExpansionStudy {
  id: string; company_id: string; name: string; region: string
  city: string; neighborhood: string | null; state: string
  population: number | null; avg_income: number | null
  competition_count: number; viability_score: number | null
  status: ExpansionStatus; latitude: number | null; longitude: number | null
  notes: string | null; created_by: string; created_at: string; updated_at: string
}

export interface CompetitorVisit {
  id: string; company_id: string; competitor_name: string; store_name: string
  store_address: string | null; city: string; price_index: number | null
  promotions_count: number; trend: CompetitorTrend; observations: string | null
  photos_count: number; visited_by: string; visited_at: string
  notes: string | null; created_at: string
}

// ─── Views ────────────────────────────────────────────────────────────────────

export interface CampaignProgress extends Campaign {
  total_surveys: number; percent_complete: number
  remaining: number; surveys_today: number; avg_duration_secs: number | null
}

export interface InterviewerRanking {
  campaign_id: string; interviewer_id: string; name: string
  avatar_url: string | null; individual_goal: number | null
  total: number; today: number; avg_duration_secs: number | null
  last_survey_at: string | null
}

export interface DashboardKpis {
  active_campaigns: number
  surveys_today: number
  surveys_total: number
  prices_today: number
  prices_total: number
  tm_visits_today: number
  promoter_visits_today: number
  unread_alerts: number
  pending_tasks: number
}
