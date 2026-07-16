import { isLeveledCategoryName, normalizeCategoryName } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type {
  AccessInviteRecord,
  CategoryLevel,
  CategoryRecord,
  ChampionshipRankingRow,
  CompetitorRecord,
  EntryRecord,
  EventRecord,
  FinancialDirection,
  FinancialStatus,
  FinancialTransactionRecord,
  HorseRecord,
  Level,
  NewsPostRecord,
  NewsPostStatus,
  NewsPostType,
  PaymentStatus,
  ProfileRecord,
  RegistrationRequestRecord,
  RegistrationRequestStatus,
  ScoreRecord,
  Stage,
  StageRankingRow,
  SuggestionRecord,
  SuggestionStatus,
  UserRole,
} from '@/types/domain'

function mapSupabaseError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('row-level security policy')) {
    return 'Permissão negada. Verifique se seu perfil está como Administrador e ativo em Gerenciamento de Acessos.'
  }

  if (normalized.includes('duplicate key value violates unique constraint')) {
    return 'Registro duplicado. Verifique se já existe um cadastro igual.'
  }

  if (normalized.includes('violates check constraint')) {
    return 'Dados inválidos para as regras de negócio. Revise os campos obrigatórios e valores permitidos.'
  }

  if (normalized.includes('find_or_create_competitor') || normalized.includes('find_or_create_horse')) {
    return 'Configuração de cadastro completo pendente. Execute a migration 202607110002_complete_entry_directory.sql no Supabase.'
  }

  if (
    normalized.includes('registration_requests')
    || normalized.includes('news_posts')
    || normalized.includes('suggestions')
    || normalized.includes('approve_registration_request')
    || normalized.includes('submit_registration_payment_receipt')
    || normalized.includes('confirm_registration_payment')
    || normalized.includes('reject_registration_payment')
    || normalized.includes('update_registration_request_amount')
    || normalized.includes('requested_levels')
    || normalized.includes('payment_status')
    || normalized.includes('amount_due')
  ) {
    return 'Configuracao do portal pendente. No Supabase SQL Editor, execute supabase/manual/fix-portal-pendente.sql e depois supabase/manual/setup-pagamentos-dre-automatico.sql.'
  }

  if (normalized.includes('payment-receipts') || normalized.includes('storage')) {
    return 'O armazenamento de comprovantes ainda nao foi configurado. Execute a migration 202607160001_registration_amount_and_receipts.sql no Supabase.'
  }

  if (normalized.includes('financial_transactions')) {
    return 'O modulo financeiro ainda nao foi configurado. Execute supabase/manual/setup-financeiro-dre.sql no Supabase.'
  }

  return message
}

async function unwrap<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise
  if (error) {
    throw new Error(mapSupabaseError(error.message))
  }

  return data as T
}

export async function getPublicEvents() {
  return unwrap<EventRecord[]>(
    supabase
      .from('events')
      .select('*')
      .in('status', ['active', 'finished', 'published'])
      .order('starts_on', { ascending: false }),
  )
}

export async function getAdminEvents() {
  return unwrap<EventRecord[]>(supabase.from('events').select('*').order('created_at', { ascending: false }))
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw new Error(mapSupabaseError(error.message))
}

export async function getEventById(eventId: string) {
  return unwrap<EventRecord>(supabase.from('events').select('*').eq('id', eventId).single())
}

export interface EventInput {
  id?: string
  name: string
  location?: string
  starts_on?: string
  ends_on?: string
  prize_pool?: number
  status: EventRecord['status']
  notes?: string
  created_by?: string
}

export async function saveEvent(payload: EventInput) {
  if (payload.id) {
    return unwrap<EventRecord>(
      supabase
        .from('events')
        .update({
          name: payload.name,
          location: payload.location ?? null,
          starts_on: payload.starts_on ?? null,
          ends_on: payload.ends_on ?? null,
          prize_pool: payload.prize_pool ?? 0,
          status: payload.status,
          notes: payload.notes ?? null,
        })
        .eq('id', payload.id)
        .select('*')
        .single(),
    )
  }

  return unwrap<EventRecord>(
    supabase
      .from('events')
      .insert({
        name: payload.name,
        location: payload.location ?? null,
        starts_on: payload.starts_on ?? null,
        ends_on: payload.ends_on ?? null,
        prize_pool: payload.prize_pool ?? 0,
        status: payload.status,
        notes: payload.notes ?? null,
        created_by: payload.created_by ?? null,
      })
      .select('*')
      .single(),
  )
}

export async function getCategories(eventId: string) {
  return unwrap<CategoryRecord[]>(
    supabase
      .from('categories')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
  )
}

export interface CategoryInput {
  id?: string
  event_id: string
  name: string
  level: CategoryLevel
  active: boolean
  display_order: number
  entry_fee?: number
}

export async function saveCategory(payload: CategoryInput) {
  const categoryName = normalizeCategoryName(payload.name)
  const leveledCategory = isLeveledCategoryName(categoryName)
  const levelToSave: CategoryLevel = leveledCategory ? payload.level : null

  if (leveledCategory && !levelToSave) {
    throw new Error('Esta categoria exige nível (N1, N2, N3 ou N4).')
  }

  if (payload.id) {
    return unwrap<CategoryRecord>(
      supabase
        .from('categories')
        .update({
          name: categoryName,
          level: levelToSave,
          active: payload.active,
          display_order: payload.display_order,
          entry_fee: payload.entry_fee ?? 0,
        })
        .eq('id', payload.id)
        .select('*')
        .single(),
    )
  }

  return unwrap<CategoryRecord>(
    supabase
      .from('categories')
      .insert({
        ...payload,
        name: categoryName,
        level: levelToSave,
        entry_fee: payload.entry_fee ?? 0,
      })
      .select('*')
      .single(),
  )
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId)
  if (error) {
    throw new Error(mapSupabaseError(error.message))
  }
}

export async function getCompetitors(search?: string) {
  let query = supabase.from('competitors').select('*').order('name', { ascending: true })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  return unwrap<CompetitorRecord[]>(query)
}

export interface CompetitorInput {
  id?: string
  name: string
  document?: string
  phone?: string
  email?: string
  city?: string
  uf?: string
  notes?: string
}

export async function saveCompetitor(payload: CompetitorInput) {
  if (payload.id) {
    return unwrap<CompetitorRecord>(
      supabase
        .from('competitors')
        .update({
          name: payload.name,
          document: payload.document ?? null,
          phone: payload.phone ?? null,
          email: payload.email ?? null,
          city: payload.city ?? null,
          uf: payload.uf ?? null,
          notes: payload.notes ?? null,
        })
        .eq('id', payload.id)
        .select('*')
        .single(),
    )
  }

  return unwrap<CompetitorRecord>(
    supabase
      .from('competitors')
      .insert({
        name: payload.name,
        document: payload.document ?? null,
        phone: payload.phone ?? null,
        email: payload.email ?? null,
        city: payload.city ?? null,
        uf: payload.uf ?? null,
        notes: payload.notes ?? null,
      })
      .select('*')
      .single(),
  )
}

export async function deleteCompetitor(id: string) {
  const { error } = await supabase.from('competitors').delete().eq('id', id)
  if (error) {
    throw new Error(mapSupabaseError(error.message))
  }
}

export interface CompleteCompetitorInput {
  name: string
  document?: string
  city?: string
  uf?: string
}

export async function findOrCreateCompetitor(payload: CompleteCompetitorInput) {
  return unwrap<string>(
    supabase.rpc('find_or_create_competitor', {
      p_name: payload.name,
      p_document: payload.document?.trim() || null,
      p_city: payload.city?.trim() || null,
      p_uf: payload.uf?.trim() || null,
    }),
  )
}

export async function getHorses(search?: string) {
  let query = supabase.from('horses').select('*').order('name', { ascending: true })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  return unwrap<HorseRecord[]>(query)
}

export interface HorseInput {
  id?: string
  name: string
  registration?: string
  owner?: string
  notes?: string
}

export async function saveHorse(payload: HorseInput) {
  if (payload.id) {
    return unwrap<HorseRecord>(
      supabase
        .from('horses')
        .update({
          name: payload.name,
          registration: payload.registration ?? null,
          owner: payload.owner ?? null,
          notes: payload.notes ?? null,
        })
        .eq('id', payload.id)
        .select('*')
        .single(),
    )
  }

  return unwrap<HorseRecord>(
    supabase
      .from('horses')
      .insert({
        name: payload.name,
        registration: payload.registration ?? null,
        owner: payload.owner ?? null,
        notes: payload.notes ?? null,
      })
      .select('*')
      .single(),
  )
}

export async function deleteHorse(id: string) {
  const { error } = await supabase.from('horses').delete().eq('id', id)
  if (error) {
    throw new Error(mapSupabaseError(error.message))
  }
}

export interface CompleteHorseInput {
  name: string
  registration?: string
  owner?: string
}

export async function findOrCreateHorse(payload: CompleteHorseInput) {
  return unwrap<string>(
    supabase.rpc('find_or_create_horse', {
      p_name: payload.name,
      p_registration: payload.registration?.trim() || null,
      p_owner: payload.owner?.trim() || null,
    }),
  )
}

export interface EntryFilters {
  stage?: Stage
  level?: CategoryLevel
  categoryId?: string
  competitorId?: string
}

export async function getEntries(eventId: string, filters: EntryFilters = {}) {
  let query = supabase
    .from('entries')
    .select('*, competitor:competitors(*), horse:horses(*), category:categories(*)')
    .eq('event_id', eventId)
    .order('stage', { ascending: true })
    .order('draw_order', { ascending: true, nullsFirst: false })

  if (filters.stage) query = query.eq('stage', filters.stage)
  if (filters.level === null) query = query.is('level', null)
  else if (filters.level) query = query.eq('level', filters.level)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.competitorId) query = query.eq('competitor_id', filters.competitorId)

  return unwrap<EntryRecord[]>(query)
}

export interface EntryInput {
  id?: string
  event_id: string
  competitor_id: string
  horse_id: string
  category_id: string
  level: CategoryLevel
  stage: Stage
  entry_number?: string
  draw_order?: number
  status: EntryRecord['status']
  entry_fee?: number
  payment_status?: PaymentStatus
}

export async function saveEntry(payload: EntryInput) {
  if (payload.id) {
    return unwrap<EntryRecord>(
      supabase
        .from('entries')
        .update({
          competitor_id: payload.competitor_id,
          horse_id: payload.horse_id,
          category_id: payload.category_id,
          level: payload.level ?? null,
          stage: payload.stage,
          entry_number: payload.entry_number ?? null,
          draw_order: payload.draw_order ?? null,
          status: payload.status,
          entry_fee: payload.entry_fee ?? 0,
          payment_status: payload.payment_status ?? 'confirmed',
        })
        .eq('id', payload.id)
        .select('*')
        .single(),
    )
  }

  return unwrap<EntryRecord>(
    supabase
      .from('entries')
      .insert({
        ...payload,
        level: payload.level ?? null,
        entry_number: payload.entry_number ?? null,
        draw_order: payload.draw_order ?? null,
        entry_fee: payload.entry_fee ?? 0,
        payment_status: payload.payment_status ?? 'confirmed',
      })
      .select('*')
      .single(),
  )
}

export async function deleteEntry(id: string) {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) {
    throw new Error(mapSupabaseError(error.message))
  }
}

export interface ScoreFilters {
  stage?: Stage
  level?: CategoryLevel
  categoryId?: string
  competitorId?: string
}

export async function getScores(eventId: string, filters: ScoreFilters = {}) {
  let query = supabase
    .from('scores')
    .select('*, entry:entries(*, competitor:competitors(*), horse:horses(*), category:categories(*)), judge:profiles(id,name,email)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (filters.stage) query = query.eq('stage', filters.stage)

  const rows = await unwrap<ScoreRecord[]>(query)

  return rows.filter((row) => {
    if (filters.level !== undefined && row.entry?.level !== filters.level) return false
    if (filters.categoryId && row.entry?.category_id !== filters.categoryId) return false
    if (filters.competitorId && row.entry?.competitor_id !== filters.competitorId) return false
    return true
  })
}

export interface ScoreInput {
  id?: string
  event_id: string
  entry_id: string
  judge_id: string
  stage: Stage
  score: number
  penalties?: number
  notes?: string
}

export async function saveScore(payload: ScoreInput) {
  if (payload.id) {
    return unwrap<ScoreRecord>(
      supabase
        .from('scores')
        .update({
          score: payload.score,
          penalties: payload.penalties ?? 0,
          notes: payload.notes ?? null,
        })
        .eq('id', payload.id)
        .select('*')
        .single(),
    )
  }

  return unwrap<ScoreRecord>(
    supabase
      .from('scores')
      .insert({
        event_id: payload.event_id,
        entry_id: payload.entry_id,
        judge_id: payload.judge_id,
        stage: payload.stage,
        score: payload.score,
        penalties: payload.penalties ?? 0,
        notes: payload.notes ?? null,
      })
      .select('*')
      .single(),
  )
}

export async function deleteScore(id: string) {
  const { error } = await supabase.from('scores').delete().eq('id', id)
  if (error) {
    throw new Error(mapSupabaseError(error.message))
  }
}

export async function getProfiles(search?: string) {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('email', `%${search}%`)
  }

  return unwrap<ProfileRecord[]>(query)
}

export async function saveProfileAccess(id: string, role: UserRole, active: boolean) {
  return unwrap<ProfileRecord>(
    supabase
      .from('profiles')
      .update({ role, active })
      .eq('id', id)
      .select('*')
      .single(),
  )
}

export async function getAccessInvites(search?: string) {
  let query = supabase.from('access_invites').select('*').order('created_at', { ascending: false })

  if (search) {
    query = query.ilike('email', `%${search.trim()}%`)
  }

  return unwrap<AccessInviteRecord[]>(query)
}

export interface AccessInviteInput {
  email: string
  name?: string
  role: UserRole
  active: boolean
}

export async function saveAccessInvite(payload: AccessInviteInput) {
  return unwrap<AccessInviteRecord>(
    supabase
      .from('access_invites')
      .upsert(
        {
          email: payload.email.trim().toLowerCase(),
          name: payload.name?.trim() || null,
          role: payload.role,
          active: payload.active,
        },
        { onConflict: 'email' },
      )
      .select('*')
      .single(),
  )
}

export async function deleteAccessInvite(id: string) {
  const { error } = await supabase.from('access_invites').delete().eq('id', id)
  if (error) throw new Error(mapSupabaseError(error.message))
}

export async function getPublicNews(eventId?: string, limit = 6) {
  let query = supabase
    .from('news_posts')
    .select('*, event:events(*)')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit)

  if (eventId) query = query.eq('event_id', eventId)
  return unwrap<NewsPostRecord[]>(query)
}

export async function getAdminNews() {
  return unwrap<NewsPostRecord[]>(
    supabase
      .from('news_posts')
      .select('*, event:events(*)')
      .order('created_at', { ascending: false }),
  )
}

export interface NewsPostInput {
  id?: string
  event_id?: string
  title: string
  summary?: string
  content: string
  post_type: NewsPostType
  status: NewsPostStatus
  featured: boolean
}

export async function saveNewsPost(payload: NewsPostInput) {
  const values = {
    event_id: payload.event_id || null,
    title: payload.title.trim(),
    summary: payload.summary?.trim() || null,
    content: payload.content.trim(),
    post_type: payload.post_type,
    status: payload.status,
    featured: payload.featured,
    published_at: payload.status === 'published' ? new Date().toISOString() : null,
  }

  if (payload.id) {
    return unwrap<NewsPostRecord>(
      supabase.from('news_posts').update(values).eq('id', payload.id).select('*').single(),
    )
  }

  return unwrap<NewsPostRecord>(supabase.from('news_posts').insert(values).select('*').single())
}

export async function deleteNewsPost(id: string) {
  const { error } = await supabase.from('news_posts').delete().eq('id', id)
  if (error) throw new Error(mapSupabaseError(error.message))
}

export interface RegistrationRequestInput {
  event_id: string
  category_id: string
  requested_levels?: Level[]
  stages: Stage[]
  competitor_name: string
  competitor_document?: string
  competitor_city?: string
  competitor_uf?: string
  horse_name: string
  horse_registration?: string
  horse_owner?: string
  notes?: string
}

export async function createRegistrationRequest(payload: RegistrationRequestInput) {
  return unwrap<RegistrationRequestRecord>(
    supabase
      .from('registration_requests')
      .insert({
        ...payload,
        requested_levels: payload.requested_levels && payload.requested_levels.length > 0 ? payload.requested_levels : null,
        competitor_document: payload.competitor_document?.trim() || null,
        competitor_city: payload.competitor_city?.trim() || null,
        competitor_uf: payload.competitor_uf?.trim().toUpperCase() || null,
        horse_registration: payload.horse_registration?.trim() || null,
        horse_owner: payload.horse_owner?.trim() || null,
        notes: payload.notes?.trim() || null,
      })
      .select('*')
      .single(),
  )
}

export async function getMyRegistrationRequests(userId: string) {
  return unwrap<RegistrationRequestRecord[]>(
    supabase
      .from('registration_requests')
      .select('*, event:events(*), category:categories(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  )
}

export async function getAdminRegistrationRequests(status?: RegistrationRequestStatus) {
  let query = supabase
    .from('registration_requests')
    .select('*, event:events(*), category:categories(*), user:profiles!registration_requests_user_id_fkey(*)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  return unwrap<RegistrationRequestRecord[]>(query)
}

export async function approveRegistrationRequest(id: string) {
  return unwrap<string[]>(supabase.rpc('approve_registration_request', { p_request_id: id }))
}

export async function uploadPaymentReceipt(requestId: string, file: File) {
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id
  if (!userId) throw new Error('Faça login para enviar o comprovante.')

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${requestId}-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from('payment-receipts').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })

  if (error) throw new Error(mapSupabaseError(error.message))
  return supabase.storage.from('payment-receipts').getPublicUrl(path).data.publicUrl
}

export async function submitRegistrationPaymentReceipt(id: string, receiptUrl: string) {
  return unwrap<RegistrationRequestRecord>(
    supabase.rpc('submit_registration_payment_receipt', {
      p_request_id: id,
      p_receipt_url: receiptUrl.trim(),
    }),
  )
}

export async function confirmRegistrationPayment(id: string, notes?: string) {
  return unwrap<RegistrationRequestRecord>(
    supabase.rpc('confirm_registration_payment', {
      p_request_id: id,
      p_payment_notes: notes?.trim() || null,
    }),
  )
}

export async function updateRegistrationRequestAmount(id: string, amount: number) {
  return unwrap<RegistrationRequestRecord>(
    supabase.rpc('update_registration_request_amount', {
      p_request_id: id,
      p_amount: amount,
    }),
  )
}

export async function rejectRegistrationPayment(id: string, notes?: string) {
  return unwrap<RegistrationRequestRecord>(
    supabase.rpc('reject_registration_payment', {
      p_request_id: id,
      p_payment_notes: notes?.trim() || null,
    }),
  )
}

export async function updateRegistrationRequestStatus(
  id: string,
  status: RegistrationRequestStatus,
  adminNotes?: string,
) {
  return unwrap<RegistrationRequestRecord>(
    supabase
      .from('registration_requests')
      .update({ status, admin_notes: adminNotes?.trim() || null })
      .eq('id', id)
      .select('*')
      .single(),
  )
}

export async function deleteRegistrationRequest(id: string) {
  const request = await unwrap<Pick<RegistrationRequestRecord, 'entry_ids'>>(
    supabase.from('registration_requests').select('entry_ids').eq('id', id).single(),
  )

  if (request.entry_ids?.length) {
    const { error: entriesError } = await supabase.from('entries').delete().in('id', request.entry_ids)
    if (entriesError) throw new Error(mapSupabaseError(entriesError.message))
  }

  const { error } = await supabase.from('registration_requests').delete().eq('id', id)
  if (error) throw new Error(mapSupabaseError(error.message))
}

export interface SuggestionInput {
  event_id?: string
  subject: string
  message: string
}

export async function createSuggestion(payload: SuggestionInput) {
  return unwrap<SuggestionRecord>(
    supabase
      .from('suggestions')
      .insert({
        event_id: payload.event_id || null,
        subject: payload.subject.trim(),
        message: payload.message.trim(),
      })
      .select('*')
      .single(),
  )
}

export async function getMySuggestions(userId: string) {
  return unwrap<SuggestionRecord[]>(
    supabase
      .from('suggestions')
      .select('*, event:events(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  )
}

export async function getAdminSuggestions(status?: SuggestionStatus) {
  let query = supabase
    .from('suggestions')
    .select('*, event:events(*), user:profiles!suggestions_user_id_fkey(*)')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  return unwrap<SuggestionRecord[]>(query)
}

export async function respondSuggestion(id: string, response: string, status: SuggestionStatus = 'answered') {
  const { data: authData } = await supabase.auth.getUser()

  return unwrap<SuggestionRecord>(
    supabase
      .from('suggestions')
      .update({
        response: response.trim() || null,
        status,
        answered_by: status === 'answered' ? authData.user?.id ?? null : null,
        answered_at: status === 'answered' ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select('*')
      .single(),
  )
}

export async function deleteSuggestion(id: string) {
  const { error } = await supabase.from('suggestions').delete().eq('id', id)
  if (error) throw new Error(mapSupabaseError(error.message))
}

export async function getFinancialTransactions(eventId?: string) {
  let query = supabase
    .from('financial_transactions')
    .select('*, event:events(*)')
    .order('competence_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (eventId) {
    query = query.eq('event_id', eventId)
  }

  return unwrap<FinancialTransactionRecord[]>(
    query,
  )
}

export interface FinancialTransactionInput {
  id?: string
  event_id: string
  direction: FinancialDirection
  category: string
  description: string
  counterparty?: string
  amount: number
  status: FinancialStatus
  competence_date: string
  due_date?: string
  settled_on?: string
  payment_method?: string
  registration_request_id?: string
  entry_id?: string
  notes?: string
}

export async function saveFinancialTransaction(payload: FinancialTransactionInput) {
  const { data: authData } = await supabase.auth.getUser()
  const values = {
    event_id: payload.event_id,
    direction: payload.direction,
    category: payload.category.trim(),
    description: payload.description.trim(),
    counterparty: payload.counterparty?.trim() || null,
    amount: payload.amount,
    status: payload.status,
    competence_date: payload.competence_date,
    due_date: payload.due_date || null,
    settled_on: payload.status === 'settled'
      ? payload.settled_on || new Date().toISOString().slice(0, 10)
      : null,
    payment_method: payload.payment_method?.trim() || null,
    registration_request_id: payload.registration_request_id || null,
    entry_id: payload.entry_id || null,
    notes: payload.notes?.trim() || null,
  }

  if (payload.id) {
    return unwrap<FinancialTransactionRecord>(
      supabase.from('financial_transactions').update(values).eq('id', payload.id).select('*').single(),
    )
  }

  return unwrap<FinancialTransactionRecord>(
    supabase
      .from('financial_transactions')
      .insert({ ...values, created_by: authData.user?.id ?? null })
      .select('*')
      .single(),
  )
}

export async function deleteFinancialTransaction(id: string) {
  const { error } = await supabase.from('financial_transactions').delete().eq('id', id)
  if (error) throw new Error(mapSupabaseError(error.message))
}

export async function getRankingByStage(
  eventId: string,
  stage: Stage,
  categoryId?: string,
  level?: Level | null,
) {
  let query = supabase.from('ranking_by_stage').select('*').eq('event_id', eventId).eq('stage', stage)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (level === null) query = query.is('level', null)
  else if (level) query = query.eq('level', level)

  return unwrap<StageRankingRow[]>(query.order('position', { ascending: true }))
}

export async function getChampionshipRanking(eventId: string, categoryId?: string, level?: Level | null) {
  let query = supabase.from('championship_ranking').select('*').eq('event_id', eventId)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (level === null) query = query.is('level', null)
  else if (level) query = query.eq('level', level)

  return unwrap<ChampionshipRankingRow[]>(query.order('position', { ascending: true }))
}

export interface ImportResult {
  success: number
  errors: string[]
}

function pickField(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[alias]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function parseStageValue(raw: string): Stage | null {
  if (!raw) return null
  const normalized = raw.toLowerCase()
  if (normalized.includes('1')) return 1
  if (normalized.includes('2')) return 2
  if (normalized.includes('3')) return 3
  return null
}

function parseNumericValue(raw: string): number | null {
  if (!raw) return null
  const normalized = raw.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  if (!normalized) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function parseLevelList(rawLevel: string): Level[] {
  if (!rawLevel) return []
  const tokens = rawLevel
    .replace(/nível/gi, '')
    .split(/[,\s;/]+/)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean)

  const levels: Level[] = []
  for (const token of tokens) {
    const normalized = token.startsWith('N') ? token : `N${token}`
    if (normalized === 'N1' || normalized === 'N2' || normalized === 'N3' || normalized === 'N4') {
      if (!levels.includes(normalized)) {
        levels.push(normalized)
      }
    }
  }
  return levels
}

export async function importCompetitors(rows: Array<Record<string, string>>) {
  let success = 0
  const errors: string[] = []

  for (const [index, row] of rows.entries()) {
    if (!row.nome?.trim()) {
      errors.push(`Linha ${index + 2}: nome e obrigatorio.`)
      continue
    }

    try {
      await saveCompetitor({
        name: row.nome.trim(),
        document: row.documento,
        phone: row.telefone,
        email: row.email,
        city: row.cidade,
        uf: row.uf,
        notes: row.observacoes,
      })
      success += 1
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'erro ao importar'}`)
    }
  }

  return { success, errors } satisfies ImportResult
}

export async function importHorses(rows: Array<Record<string, string>>) {
  let success = 0
  const errors: string[] = []

  for (const [index, row] of rows.entries()) {
    if (!row.nome?.trim()) {
      errors.push(`Linha ${index + 2}: nome e obrigatorio.`)
      continue
    }

    try {
      await saveHorse({
        name: row.nome.trim(),
        registration: row.registro,
        owner: row.proprietario,
        notes: row.observacoes,
      })
      success += 1
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'erro ao importar'}`)
    }
  }

  return { success, errors } satisfies ImportResult
}

export async function importCategories(eventId: string, rows: Array<Record<string, string>>) {
  let success = 0
  const errors: string[] = []

  for (const [index, row] of rows.entries()) {
    const rawName = row.nome?.trim()
    if (!rawName) {
      errors.push(`Linha ${index + 2}: nome e obrigatorio.`)
      continue
    }

    const categoryName = normalizeCategoryName(rawName)
    const leveledCategory = isLeveledCategoryName(categoryName)
    const rawLevel = row.nivel?.trim().toUpperCase()
    let level: CategoryLevel = null

    if (leveledCategory) {
      if (!rawLevel || !['N1', 'N2', 'N3', 'N4'].includes(rawLevel)) {
        errors.push(`Linha ${index + 2}: nivel obrigatorio e invalido para categoria com niveis (${rawName}).`)
        continue
      }

      level = rawLevel as Level
    }

    try {
      await saveCategory({
        event_id: eventId,
        name: categoryName,
        level,
        active: row.ativa?.toLowerCase() !== 'nao',
        display_order: Number(row.ordem || 0),
        entry_fee: parseNumericValue(row.valor_inscricao || row.valor || row.preco || row.preço || '') ?? 0,
      })
      success += 1
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'erro ao importar'}`)
    }
  }

  return { success, errors } satisfies ImportResult
}

async function findCompetitorByName(name: string) {
  return unwrap<CompetitorRecord>(
    supabase.from('competitors').select('*').ilike('name', name).limit(1).single(),
  )
}

async function findHorseByName(name: string) {
  return unwrap<HorseRecord>(supabase.from('horses').select('*').ilike('name', name).limit(1).single())
}

async function findCategory(eventId: string, name: string, level: CategoryLevel) {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('event_id', eventId)
    .ilike('name', normalizeCategoryName(name))
    .limit(1)

  if (level === null) {
    query = query.is('level', null)
  } else {
    query = query.eq('level', level)
  }

  return unwrap<CategoryRecord>(query.single())
}

async function findCategoryOptional(eventId: string, name: string, level: CategoryLevel) {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('event_id', eventId)
    .ilike('name', normalizeCategoryName(name))
    .limit(1)

  query = level === null ? query.is('level', null) : query.eq('level', level)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(mapSupabaseError(error.message))
  return data as CategoryRecord | null
}

async function findExistingEntry(
  eventId: string,
  competitorId: string,
  horseId: string,
  categoryId: string,
  level: CategoryLevel,
  stage: Stage,
) {
  let query = supabase
    .from('entries')
    .select('*')
    .eq('event_id', eventId)
    .eq('competitor_id', competitorId)
    .eq('horse_id', horseId)
    .eq('category_id', categoryId)
    .eq('stage', stage)
    .limit(1)

  query = level === null ? query.is('level', null) : query.eq('level', level)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(mapSupabaseError(error.message))
  return data as EntryRecord | null
}

export async function importEntries(eventId: string, rows: Array<Record<string, string>>) {
  let success = 0
  const errors: string[] = []

  for (const [index, row] of rows.entries()) {
    try {
      const categoryName = normalizeCategoryName(row.categoria_nome ?? '')
      const leveledCategory = isLeveledCategoryName(categoryName)
      const rawLevel = row.nivel?.trim().toUpperCase()
      const level =
        leveledCategory && rawLevel && ['N1', 'N2', 'N3', 'N4'].includes(rawLevel)
          ? (rawLevel as Level)
          : null

      const stage = Number(row.etapa) as Stage

      if (
        !row.competidor_nome ||
        !row.cavalo_nome ||
        !row.categoria_nome ||
        (leveledCategory && level === null) ||
        ![1, 2, 3].includes(stage)
      ) {
        errors.push(`Linha ${index + 2}: dados obrigatorios invalidos.`)
        continue
      }

      const competitor = await findCompetitorByName(row.competidor_nome)
      const horse = await findHorseByName(row.cavalo_nome)
      const category = await findCategory(eventId, categoryName, level)

      await saveEntry({
        event_id: eventId,
        competitor_id: competitor.id,
        horse_id: horse.id,
        category_id: category.id,
        level: category.level,
        stage,
        entry_number: row.numero_entrada,
        draw_order: row.ordem_apresentacao ? Number(row.ordem_apresentacao) : undefined,
        status: 'registered',
      })
      success += 1
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'erro ao importar'}`)
    }
  }

  return { success, errors } satisfies ImportResult
}

export async function importScores(eventId: string, judgeId: string, rows: Array<Record<string, string>>) {
  let success = 0
  const errors: string[] = []

  for (const [index, row] of rows.entries()) {
    try {
      const categoryName = normalizeCategoryName(row.categoria_nome ?? '')
      const leveledCategory = isLeveledCategoryName(categoryName)
      const rawLevel = row.nivel?.trim().toUpperCase()
      const level =
        leveledCategory && rawLevel && ['N1', 'N2', 'N3', 'N4'].includes(rawLevel)
          ? (rawLevel as Level)
          : null

      const stage = Number(row.etapa) as Stage

      if (
        !row.competidor_nome ||
        !row.cavalo_nome ||
        !row.categoria_nome ||
        !row.nota ||
        (leveledCategory && level === null) ||
        ![1, 2, 3].includes(stage)
      ) {
        errors.push(`Linha ${index + 2}: dados obrigatorios invalidos.`)
        continue
      }

      const competitor = await findCompetitorByName(row.competidor_nome)
      const horse = await findHorseByName(row.cavalo_nome)
      const category = await findCategory(eventId, categoryName, level)

      let entryQuery = supabase
        .from('entries')
        .select('*')
        .eq('event_id', eventId)
        .eq('competitor_id', competitor.id)
        .eq('horse_id', horse.id)
        .eq('category_id', category.id)
        .eq('stage', stage)
        .limit(1)

      entryQuery = category.level === null ? entryQuery.is('level', null) : entryQuery.eq('level', category.level)

      const entry = await unwrap<EntryRecord>(entryQuery.single())

      await saveScore({
        event_id: eventId,
        entry_id: entry.id,
        judge_id: judgeId,
        stage,
        score: Number(row.nota),
        penalties: Number(row.penalidades || 0),
        notes: row.observacoes,
      })
      success += 1
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'erro ao importar'}`)
    }
  }

  return { success, errors } satisfies ImportResult
}

export async function importUnifiedSheet(eventId: string, judgeId: string, rows: Array<Record<string, string>>) {
  let success = 0
  const errors: string[] = []

  for (const [index, row] of rows.entries()) {
    try {
      const competitorName = pickField(row, ['competidor', 'competidor_nome', 'nome_competidor'])
      const horseName = pickField(row, ['animal', 'cavalo', 'cavalo_nome'])
      const categoryRaw = pickField(row, ['categoria', 'categoria_nome'])
      const stageRaw = pickField(row, ['etapa'])
      const stage = parseStageValue(stageRaw)

      if (!competitorName || !horseName || !categoryRaw || !stage) {
        errors.push(`Linha ${index + 2}: competidor, cavalo, categoria e etapa são obrigatórios.`)
        continue
      }

      const categoryName = normalizeCategoryName(categoryRaw)
      const leveledCategory = isLeveledCategoryName(categoryName)
      const parsedLevels = parseLevelList(pickField(row, ['nivel', 'niveis']))
      const levelsToCreate: CategoryLevel[] = leveledCategory ? parsedLevels : [null]

      if (leveledCategory && levelsToCreate.length === 0) {
        errors.push(`Linha ${index + 2}: categoria ${categoryName} exige nível (N1, N2, N3 ou N4).`)
        continue
      }

      const competitorId = await findOrCreateCompetitor({
        name: competitorName,
        document: pickField(row, ['documento']),
        city: pickField(row, ['cidade']),
        uf: pickField(row, ['uf']),
      })

      const horseId = await findOrCreateHorse({
        name: horseName,
        registration: pickField(row, ['registro']),
        owner: pickField(row, ['proprietario', 'proprietário']),
      })

      const drawOrderRaw = pickField(row, ['ordem_apresentacao', 'ordem', 'o/e', 'oe'])
      const entryNumberRaw = pickField(row, ['numero_entrada', 'inscricao_numero'])
      const noteRaw = pickField(row, ['nota_ancr', 'nota', 'nota final'])
      const penaltiesRaw = pickField(row, ['penalidades'])
      const notesRaw = pickField(row, ['observacoes', 'observação'])
      const scoreValue = parseNumericValue(noteRaw)
      const penaltiesValue = parseNumericValue(penaltiesRaw)

      for (const level of levelsToCreate) {
        let category = await findCategoryOptional(eventId, categoryName, level)
        if (!category) {
          category = await saveCategory({
            event_id: eventId,
            name: categoryName,
            level,
            active: true,
            display_order: 0,
            entry_fee: parseNumericValue(pickField(row, ['valor_inscricao', 'valor', 'preco', 'preço'])) ?? 0,
          })
        }

        let entry: EntryRecord | null = null
        try {
          entry = await saveEntry({
            event_id: eventId,
            competitor_id: competitorId,
            horse_id: horseId,
            category_id: category.id,
            level,
            stage,
            entry_number: entryNumberRaw,
            draw_order: drawOrderRaw ? Number(drawOrderRaw) : undefined,
            status: 'registered',
          })
        } catch (error) {
          if (!(error instanceof Error) || !error.message.toLowerCase().includes('duplicado')) {
            throw error
          }

          entry = await findExistingEntry(
            eventId,
            competitorId,
            horseId,
            category.id,
            level,
            stage,
          )

          if (!entry) {
            throw new Error('Não foi possível recuperar inscrição existente.', { cause: error })
          }

          await saveEntry({
            id: entry.id,
            event_id: eventId,
            competitor_id: competitorId,
            horse_id: horseId,
            category_id: category.id,
            level,
            stage,
            entry_number: entryNumberRaw || entry.entry_number || undefined,
            draw_order: drawOrderRaw ? Number(drawOrderRaw) : entry.draw_order ?? undefined,
            status: entry.status,
          })
        }

        if (!entry) {
          throw new Error('Não foi possível preparar a inscrição para importar nota.')
        }

        if (scoreValue !== null) {
          const { data: existingScore, error: scoreFindError } = await supabase
            .from('scores')
            .select('*')
            .eq('entry_id', entry.id)
            .eq('judge_id', judgeId)
            .eq('stage', stage)
            .limit(1)
            .maybeSingle()

          if (scoreFindError) {
            throw new Error(mapSupabaseError(scoreFindError.message))
          }

          await saveScore({
            id: existingScore?.id,
            event_id: eventId,
            entry_id: entry.id,
            judge_id: judgeId,
            stage,
            score: scoreValue,
            penalties: penaltiesValue ?? 0,
            notes: notesRaw,
          })
        }
      }

      success += 1
    } catch (error) {
      errors.push(`Linha ${index + 2}: ${error instanceof Error ? error.message : 'erro ao importar'}`)
    }
  }

  return { success, errors } satisfies ImportResult
}

