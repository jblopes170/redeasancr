export type UserRole = 'admin' | 'judge' | 'user'
export type EventStatus = 'draft' | 'active' | 'finished' | 'published'
export type Level = 'N1' | 'N2' | 'N3' | 'N4'
export type CategoryLevel = Level | null
export type EntryStatus = 'registered' | 'cancelled' | 'finished'
export type Stage = 1 | 2 | 3
export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type SuggestionStatus = 'new' | 'read' | 'answered' | 'archived'
export type NewsPostStatus = 'draft' | 'published'
export type NewsPostType = 'news' | 'event_update'

export interface EventRecord {
  id: string
  name: string
  location: string | null
  starts_on: string | null
  ends_on: string | null
  prize_pool: number
  status: EventStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CategoryRecord {
  id: string
  event_id: string
  name: string
  level: CategoryLevel
  active: boolean
  display_order: number
  created_at: string
}

export interface CompetitorRecord {
  id: string
  name: string
  document: string | null
  phone: string | null
  email: string | null
  city: string | null
  uf: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface HorseRecord {
  id: string
  name: string
  registration: string | null
  owner: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EntryRecord {
  id: string
  event_id: string
  competitor_id: string
  horse_id: string
  category_id: string
  level: CategoryLevel
  stage: Stage
  entry_number: string | null
  draw_order: number | null
  status: EntryStatus
  created_at: string
  updated_at: string
  competitor?: CompetitorRecord
  horse?: HorseRecord
  category?: CategoryRecord
}

export interface ScoreRecord {
  id: string
  event_id: string
  entry_id: string
  judge_id: string
  stage: Stage
  score: number
  penalties: number
  final_score: number
  notes: string | null
  created_at: string
  updated_at: string
  entry?: EntryRecord
  judge?: {
    id: string
    name: string | null
    email: string
  }
}

export interface ProfileRecord {
  id: string
  email: string
  name: string | null
  role: UserRole
  active: boolean
  created_at: string
  updated_at: string
}

export interface AccessInviteRecord {
  id: string
  email: string
  name: string | null
  role: UserRole
  active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface NewsPostRecord {
  id: string
  event_id: string | null
  title: string
  summary: string | null
  content: string
  post_type: NewsPostType
  status: NewsPostStatus
  featured: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  event?: EventRecord | null
}

export interface RegistrationRequestRecord {
  id: string
  user_id: string
  event_id: string
  category_id: string
  stages: Stage[]
  competitor_name: string
  competitor_document: string | null
  competitor_city: string | null
  competitor_uf: string | null
  horse_name: string
  horse_registration: string | null
  horse_owner: string | null
  notes: string | null
  status: RegistrationRequestStatus
  admin_notes: string | null
  entry_ids: string[]
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  event?: EventRecord
  category?: CategoryRecord
  user?: ProfileRecord
}

export interface SuggestionRecord {
  id: string
  user_id: string
  event_id: string | null
  subject: string
  message: string
  status: SuggestionStatus
  response: string | null
  answered_by: string | null
  answered_at: string | null
  created_at: string
  updated_at: string
  event?: EventRecord | null
  user?: ProfileRecord
}

export interface StageRankingRow {
  event_id: string
  category_id: string
  category_name: string
  level: CategoryLevel
  stage: Stage
  competitor_id: string
  competitor_name: string
  horse_id: string
  horse_name: string
  total_score: number
  stage_points: number
  position: number
}

export interface ChampionshipRankingRow {
  event_id: string
  category_id: string
  category_name: string
  level: CategoryLevel
  competitor_id: string
  competitor_name: string
  horse_id: string
  horse_name: string
  stage_1_score: number
  stage_2_score: number
  stage_3_score: number
  total_score: number
  position: number
}
