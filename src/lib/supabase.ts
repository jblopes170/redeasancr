import { createClient } from '@supabase/supabase-js'

import type {
  CategoryRecord,
  CompetitorRecord,
  EntryRecord,
  EventRecord,
  HorseRecord,
  ProfileRecord as Profile,
  ScoreRecord,
  UserRole,
} from '@/types/domain'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidSupabaseUrl(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  try {
    const parsed = new URL(value.trim())
    if (parsed.protocol !== 'https:') return false
    return parsed.hostname.endsWith('.supabase.co') || parsed.hostname.endsWith('.supabase.in')
  } catch {
    return false
  }
}

function isLikelyJwt(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  return value.split('.').length === 3
}

export const isSupabaseConfigured = isValidSupabaseUrl(supabaseUrl) && isLikelyJwt(supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase não configurado ou inválido: confirme VITE_SUPABASE_URL (https://xxxx.supabase.co) e VITE_SUPABASE_ANON_KEY no arquivo .env.',
  )
}

const fallbackUrl = 'http://127.0.0.1:54321'
const fallbackAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.payload.signature'

export const supabase = createClient(
  supabaseUrl ?? fallbackUrl,
  supabaseAnonKey ?? fallbackAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export type { CategoryRecord, CompetitorRecord, EntryRecord, EventRecord, HorseRecord, Profile, ScoreRecord, UserRole }
