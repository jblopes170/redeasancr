import { CalendarDays, Medal, Pencil, Plus, RefreshCw, Save, Search, Trash2, Trophy, WalletCards } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { CategoryLevel, EntryRecord, EventRecord, Level, ScoreRecord, Stage } from '@/types/domain'
import { LEVEL_OPTIONS, NO_LEVEL_VALUE, STAGE_OPTIONS, categoryLabel, isLeveledCategoryName } from '@/lib/constants'
import {
  deleteEntry,
  findOrCreateCompetitor,
  findOrCreateHorse,
  getCategories,
  getChampionshipRanking,
  getCompetitors,
  getEntries,
  getHorses,
  getRankingByStage,
  getScores,
  saveEntry,
  saveScore,
} from '@/services/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LevelBadge } from '@/components/level-badge'
import { StatusBadge } from '@/components/status-badge'

interface ScoreLaunchPanelProps {
  event: EventRecord
  currentUserId: string
  isAdmin: boolean
  isJudge: boolean
  showLiveRanking?: boolean
}

interface DraftRow {
  scoreId?: string
  score: string
  penalties: string
  notes: string
  stage: Stage
}

interface EntryFormState {
  id?: string
  competitor_mode: 'existing' | 'new'
  competitor_id: string
  new_competitor_name: string
  new_competitor_document: string
  new_competitor_city: string
  new_competitor_uf: string
  horse_mode: 'existing' | 'new'
  horse_id: string
  new_horse_name: string
  new_horse_registration: string
  new_horse_owner: string
  category_id: string
  stage: Stage
  entry_number: string
  draw_order: string
  status: EntryRecord['status']
}

interface EntryRunRow {
  key: string
  primary: EntryRecord
  entries: EntryRecord[]
  levels: CategoryLevel[]
}

const defaultEntryForm: EntryFormState = {
  competitor_mode: 'existing',
  competitor_id: '',
  new_competitor_name: '',
  new_competitor_document: '',
  new_competitor_city: '',
  new_competitor_uf: '',
  horse_mode: 'existing',
  horse_id: '',
  new_horse_name: '',
  new_horse_registration: '',
  new_horse_owner: '',
  category_id: '',
  stage: 1,
  entry_number: '',
  draw_order: '',
  status: 'registered',
}

const defaultSelectedLevels: Record<Level, boolean> = {
  N1: true,
  N2: true,
  N3: true,
  N4: true,
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function parseDecimalField(raw: string, fieldLabel: string): number {
  const normalized = raw.replace(',', '.').trim()
  const value = Number(normalized)

  if (!Number.isFinite(value)) {
    throw new Error(`${fieldLabel} invÃ¡lido. Use nÃºmero com ponto ou vÃ­rgula.`)
  }

  return value
}

function rankingKey(categoryId: string, level: CategoryLevel, competitorId: string, horseId: string) {
  return `${categoryId}:${level ?? 'SEM_NIVEL'}:${competitorId}:${horseId}`
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatScore(value: number | null) {
  if (value === null) return '--'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

function formatEventPeriod(startsOn: string | null, endsOn: string | null) {
  const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
  if (!startsOn && !endsOn) return 'Data nÃ£o informada'
  if (startsOn && endsOn && startsOn !== endsOn) return `${formatDate(startsOn)} a ${formatDate(endsOn)}`
  return formatDate(startsOn ?? endsOn ?? '')
}

function parsePercent(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function entryRunKey(entry: EntryRecord) {
  return [
    entry.stage,
    entry.competitor_id,
    entry.horse_id,
    entry.category?.name ?? entry.category_id,
    entry.draw_order ?? '',
    entry.entry_number ?? '',
  ].join('::')
}

function sortEntriesByLevel(entries: EntryRecord[]) {
  const levelOrder = new Map<CategoryLevel, number>([
    [null, 0],
    ['N1', 1],
    ['N2', 2],
    ['N3', 3],
    ['N4', 4],
  ])

  return [...entries].sort((a, b) => (levelOrder.get(a.level) ?? 99) - (levelOrder.get(b.level) ?? 99))
}

function uniqueLevels(entries: EntryRecord[]) {
  const levels: CategoryLevel[] = []
  for (const entry of sortEntriesByLevel(entries)) {
    if (!levels.some((level) => level === entry.level)) levels.push(entry.level)
  }
  return levels
}

export function ScoreLaunchPanel({
  event,
  currentUserId,
  isAdmin,
  isJudge,
  showLiveRanking = false,
}: ScoreLaunchPanelProps) {
  const eventId = event.id
  const eventStatus = event.status
  const queryClient = useQueryClient()
  const [filterStage, setFilterStage] = useState<Stage>(1)
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>()
  const [filterLevel, setFilterLevel] = useState<CategoryLevel | undefined>()
  const [search, setSearch] = useState('')
  const [rankingMode, setRankingMode] = useState<'stage' | 'championship'>('stage')
  const [prizePoolPercent, setPrizePoolPercent] = useState('30')
  const [prizeFirstPercent, setPrizeFirstPercent] = useState('50')
  const [prizeSecondPercent, setPrizeSecondPercent] = useState('30')
  const [prizeThirdPercent, setPrizeThirdPercent] = useState('20')
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({})
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [entryForm, setEntryForm] = useState<EntryFormState>(defaultEntryForm)
  const [registerAllStages, setRegisterAllStages] = useState(true)
  const [selectedStages, setSelectedStages] = useState<Record<Stage, boolean>>({
    1: true,
    2: true,
    3: true,
  })
  const [selectedEntryLevels, setSelectedEntryLevels] = useState<Record<Level, boolean>>(defaultSelectedLevels)

  const canJudgeWrite = isAdmin || (isJudge && eventStatus === 'active')
  const canManageEntries = isAdmin

  const categoriesQuery = useQuery({
    queryKey: ['categories', eventId],
    queryFn: () => getCategories(eventId),
  })

  const competitorsQuery = useQuery({
    queryKey: ['competitors', 'score-launch'],
    queryFn: () => getCompetitors(''),
    enabled: canManageEntries,
  })

  const horsesQuery = useQuery({
    queryKey: ['horses', 'score-launch'],
    queryFn: () => getHorses(''),
    enabled: canManageEntries,
  })

  const entriesQuery = useQuery({
    queryKey: ['entries', eventId, 'launch'],
    queryFn: () => getEntries(eventId),
  })

  const scoresQuery = useQuery({
    queryKey: ['scores', eventId, 'launch'],
    queryFn: () => getScores(eventId),
    refetchInterval: 2000,
  })

  const stageRankingQuery = useQuery({
    queryKey: ['ranking-stage', eventId, 'live', filterStage, filterCategoryId, filterLevel],
    queryFn: () => getRankingByStage(eventId, filterStage, filterCategoryId, filterLevel),
    enabled: showLiveRanking && rankingMode === 'stage',
    refetchInterval: 2000,
  })

  const championshipRankingQuery = useQuery({
    queryKey: ['ranking-championship', eventId, 'live', filterCategoryId, filterLevel],
    queryFn: () => getChampionshipRanking(eventId, filterCategoryId, filterLevel),
    enabled: showLiveRanking && rankingMode === 'championship',
    refetchInterval: 2000,
  })

  const allStagesRankingQuery = useQuery({
    queryKey: ['ranking-stages-overview', eventId, filterCategoryId, filterLevel],
    queryFn: async () => {
      const [stage1, stage2, stage3] = await Promise.all([
        getRankingByStage(eventId, 1, filterCategoryId, filterLevel),
        getRankingByStage(eventId, 2, filterCategoryId, filterLevel),
        getRankingByStage(eventId, 3, filterCategoryId, filterLevel),
      ])
      return { stage1, stage2, stage3 }
    },
    enabled: showLiveRanking,
    refetchInterval: 2000,
  })

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const entryCategoryOptions = useMemo(() => {
    const options = new Map<string, (typeof categories)[number]>()

    for (const category of categories) {
      const key = isLeveledCategoryName(category.name) ? `leveled:${category.name}` : `single:${category.id}`
      if (!options.has(key)) options.set(key, category)
    }

    return Array.from(options.values())
  }, [categories])
  const selectedEntryCategory = categories.find((item) => item.id === entryForm.category_id)
  const selectedEntryCategoryIsLeveled = selectedEntryCategory ? isLeveledCategoryName(selectedEntryCategory.name) : false
  const selectedLevelCategories = selectedEntryCategory
    ? LEVEL_OPTIONS
      .map((level) => categories.find((category) => category.name === selectedEntryCategory.name && category.level === level))
      .filter((category): category is NonNullable<typeof category> => Boolean(category))
    : []

  const saveScoreMutation = useMutation({
    mutationFn: async ({ rowKey, entryIds, payload }: { rowKey: string; entryIds: string[]; payload: DraftRow }) => {
      if (!canJudgeWrite) {
        throw new Error('Lancamento de notas bloqueado para este perfil ou evento.')
      }
      const entries = entryIds
        .map((entryId) => (entriesQuery.data ?? []).find((row) => row.id === entryId))
        .filter((entry): entry is EntryRecord => Boolean(entry))

      if (entries.length === 0) {
        throw new Error('Inscricao nao encontrada para lancamento de nota.')
      }
      if (entries.some((entry) => entry.status === 'cancelled')) {
        throw new Error('Nao e possivel lancar nota em inscricao cancelada.')
      }
      if (payload.score.trim() === '') {
        throw new Error('Informe a nota antes de salvar.')
      }

      const score = parseDecimalField(payload.score, 'Nota')
      const penalties = parseDecimalField(payload.penalties || '0', 'Penalidades')
      const saved = []

      for (const entry of entries) {
        const existingScore = scoreByEntry.get(entry.id)
        saved.push(await saveScore({
          id: existingScore?.id,
          event_id: eventId,
          entry_id: entry.id,
          judge_id: currentUserId,
          stage: payload.stage,
          score,
          penalties,
          notes: payload.notes,
        }))
      }

      return { rowKey, saved }
    },
    onSuccess: (result) => {
      toast.success(result.saved.length === 1 ? 'Nota salva com sucesso.' : `Nota salva em ${result.saved.length} niveis.`)
      void queryClient.invalidateQueries({ queryKey: ['scores', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stage', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-championship', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stages-overview', eventId] })
      setDrafts((prev) => ({
        ...prev,
        [result.rowKey]: {
          ...prev[result.rowKey],
          scoreId: result.saved[0]?.id,
        },
      }))
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar nota')
    },
  })
  const saveEntryMutation = useMutation({
    mutationFn: async () => {
      const category = categories.find((item) => item.id === entryForm.category_id)
      if (!category) throw new Error('Selecione a categoria.')

      let competitorId = entryForm.competitor_id
      if (entryForm.competitor_mode === 'new') {
        if (!entryForm.new_competitor_name.trim()) throw new Error('Informe o nome do novo competidor.')
        competitorId = await findOrCreateCompetitor({
          name: entryForm.new_competitor_name,
          document: entryForm.new_competitor_document,
          city: entryForm.new_competitor_city,
          uf: entryForm.new_competitor_uf,
        })
      } else if (!competitorId) {
        throw new Error('Selecione um competidor cadastrado.')
      }

      let horseId = entryForm.horse_id
      if (entryForm.horse_mode === 'new') {
        if (!entryForm.new_horse_name.trim()) throw new Error('Informe o nome do novo cavalo.')
        horseId = await findOrCreateHorse({
          name: entryForm.new_horse_name,
          registration: entryForm.new_horse_registration,
          owner: entryForm.new_horse_owner,
        })
      } else if (!horseId) {
        throw new Error('Selecione um cavalo cadastrado.')
      }

      if (entryForm.id) {
        await saveEntry({
          id: entryForm.id,
          event_id: eventId,
          competitor_id: competitorId,
          horse_id: horseId,
          category_id: entryForm.category_id,
          level: category.level,
          stage: entryForm.stage,
          entry_number: entryForm.entry_number,
          draw_order: entryForm.draw_order ? Number(entryForm.draw_order) : undefined,
          status: entryForm.status,
        })
        return { created: 1, errors: [] as string[] }
      }

      const stagesToCreate: Stage[] = registerAllStages
        ? ([1, 2, 3] as Stage[]).filter((stage) => selectedStages[stage])
        : [entryForm.stage]

      if (stagesToCreate.length === 0) {
        throw new Error('Selecione ao menos uma etapa.')
      }

      const categoriesToCreate = selectedEntryCategoryIsLeveled
        ? LEVEL_OPTIONS
          .filter((level) => selectedEntryLevels[level])
          .map((level) => categories.find((item) => item.name === category.name && item.level === level))
        : [category]

      if (selectedEntryCategoryIsLeveled && categoriesToCreate.length === 0) {
        throw new Error('Selecione ao menos um nivel para esta categoria.')
      }

      if (categoriesToCreate.some((item) => !item)) {
        throw new Error('Carregue as categorias oficiais NTMR para habilitar todos os niveis desta categoria.')
      }

      const errors: string[] = []
      let created = 0

      for (const stage of stagesToCreate) {
        for (const categoryToCreate of categoriesToCreate) {
          if (!categoryToCreate) continue

          try {
            await saveEntry({
              event_id: eventId,
              competitor_id: competitorId,
              horse_id: horseId,
              category_id: categoryToCreate.id,
              level: categoryToCreate.level,
              stage,
              entry_number: entryForm.entry_number,
              draw_order: entryForm.draw_order ? Number(entryForm.draw_order) : undefined,
              status: entryForm.status,
            })
            created += 1
          } catch (error) {
            errors.push(`Etapa ${stage}${categoryToCreate.level ? ` ${categoryToCreate.level}` : ''}: ${error instanceof Error ? error.message : 'erro ao salvar inscricao'}`)
          }
        }
      }

      if (created === 0) {
        throw new Error(errors.join(' | '))
      }

      return { created, errors }
    },
    onSuccess: (result) => {
      toast.success(result.created === 1 ? 'Inscricao salva.' : `${result.created} inscricoes salvas.`)
      if (result.errors.length > 0) {
        toast.warning(result.errors.join(' | '))
      }

      setEntryDialogOpen(false)
      setEntryForm(defaultEntryForm)
      setRegisterAllStages(true)
      setSelectedStages({ 1: true, 2: true, 3: true })
      setSelectedEntryLevels(defaultSelectedLevels)

      void queryClient.invalidateQueries({ queryKey: ['entries', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['competitors'] })
      void queryClient.invalidateQueries({ queryKey: ['horses'] })
      void queryClient.invalidateQueries({ queryKey: ['scores', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stage', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-championship', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stages-overview', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar inscricao')
    },
  })
  const deleteEntryMutation = useMutation({
    mutationFn: async (ids: string | string[]) => {
      const entryIds = Array.isArray(ids) ? ids : [ids]
      for (const entryId of entryIds) {
        await deleteEntry(entryId)
      }
      return entryIds.length
    },
    onSuccess: () => {
      toast.success('InscriÃ§Ã£o removida.')
      void queryClient.invalidateQueries({ queryKey: ['entries', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['scores', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stage', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-championship', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stages-overview', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover inscriÃ§Ã£o')
    },
  })

  const scoreByEntry = new Map<string, ScoreRecord>()
  for (const score of scoresQuery.data ?? []) {
    if (score.stage !== filterStage) continue

    if (isAdmin) {
      const existing = scoreByEntry.get(score.entry_id)
      if (!existing || score.judge_id === currentUserId) {
        scoreByEntry.set(score.entry_id, score)
      }
    } else if (score.judge_id === currentUserId) {
      scoreByEntry.set(score.entry_id, score)
    }
  }

  const readDraft = (draftKey: string, stage: Stage, entries: EntryRecord[] = []): DraftRow => {
    const local = drafts[draftKey]
    if (local) return local

    const existing = entries.map((entry) => scoreByEntry.get(entry.id)).find(Boolean)
    if (existing) {
      return {
        scoreId: existing.id,
        score: String(existing.score),
        penalties: String(existing.penalties),
        notes: existing.notes ?? '',
        stage,
      }
    }

    return {
      score: '',
      penalties: '0',
      notes: '',
      stage,
    }
  }

  const writeDraft = (draftKey: string, stage: Stage, entries: EntryRecord[], patch: Partial<DraftRow>) => {
    setDrafts((prev) => ({
      ...prev,
      [draftKey]: {
        ...readDraft(draftKey, stage, entries),
        ...patch,
        stage,
      },
    }))
  }

  const filteredEntries = useMemo(() => {
    const all = entriesQuery.data ?? []
    const normalized = normalizeSearch(search)
    const filtered = all.filter((entry) => {
      if (entry.stage !== filterStage) return false
      if (filterCategoryId && entry.category_id !== filterCategoryId) return false
      if (filterLevel !== undefined && entry.level !== filterLevel) return false

      if (!normalized) return true
      const comp = normalizeSearch(entry.competitor?.name ?? '')
      const horse = normalizeSearch(entry.horse?.name ?? '')
      return comp.includes(normalized) || horse.includes(normalized)
    })

    return [...filtered].sort((a, b) => {
      const aOrder = a.draw_order ?? 9999
      const bOrder = b.draw_order ?? 9999
      if (aOrder !== bOrder) return aOrder - bOrder
      return (a.competitor?.name ?? '').localeCompare(b.competitor?.name ?? '', 'pt-BR')
    })
  }, [entriesQuery.data, search, filterStage, filterCategoryId, filterLevel])

  const rows = useMemo<EntryRunRow[]>(() => {
    const all = entriesQuery.data ?? []
    const map = new Map<string, EntryRunRow>()

    for (const entry of filteredEntries) {
      const key = entryRunKey(entry)
      if (map.has(key)) continue

      const siblingEntries = sortEntriesByLevel(all.filter((item) => entryRunKey(item) === key))
      map.set(key, {
        key,
        primary: siblingEntries[0] ?? entry,
        entries: siblingEntries.length > 0 ? siblingEntries : [entry],
        levels: uniqueLevels(siblingEntries.length > 0 ? siblingEntries : [entry]),
      })
    }

    return Array.from(map.values()).sort((a, b) => {
      const aOrder = a.primary.draw_order ?? 9999
      const bOrder = b.primary.draw_order ?? 9999
      if (aOrder !== bOrder) return aOrder - bOrder
      return (a.primary.competitor?.name ?? '').localeCompare(b.primary.competitor?.name ?? '', 'pt-BR')
    })
  }, [entriesQuery.data, filteredEntries])

  const selectedCategory = (categoriesQuery.data ?? []).find((category) => category.id === filterCategoryId)
  const prizePoolValue = Number(event.prize_pool || 0)
  const calculatedPrizePool = (prizePoolValue * parsePercent(prizePoolPercent)) / 100
  const prizeDistribution = useMemo(
    () => [
      parsePercent(prizeFirstPercent),
      parsePercent(prizeSecondPercent),
      parsePercent(prizeThirdPercent),
    ],
    [prizeFirstPercent, prizeSecondPercent, prizeThirdPercent],
  )
  const prizeDistributionTotal = prizeDistribution.reduce((total, value) => total + value, 0)

  const overviewRows = useMemo(() => {
    const entries = entriesQuery.data ?? []
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]))
    const entryByRanking = new Map<string, EntryRecord>()
    const scoreTotals = new Map<string, Record<Stage, number | null>>()
    const pointsTotals = new Map<string, Record<Stage, number | null>>()

    for (const entry of entries) {
      const key = rankingKey(entry.category_id, entry.level, entry.competitor_id, entry.horse_id)
      if (!entryByRanking.has(key)) entryByRanking.set(key, entry)
    }

    for (const score of scoresQuery.data ?? []) {
      const entry = score.entry ?? entriesById.get(score.entry_id)
      if (!entry) continue

      const key = rankingKey(entry.category_id, entry.level, entry.competitor_id, entry.horse_id)
      const totals = scoreTotals.get(key) ?? { 1: null, 2: null, 3: null }
      totals[score.stage] = (totals[score.stage] ?? 0) + Number(score.final_score || 0)
      scoreTotals.set(key, totals)
    }

    const stageGroups = allStagesRankingQuery.data
      ? ([
          [1, allStagesRankingQuery.data.stage1],
          [2, allStagesRankingQuery.data.stage2],
          [3, allStagesRankingQuery.data.stage3],
        ] as const)
      : []

    for (const [stage, stageRows] of stageGroups) {
      for (const row of stageRows) {
        const key = rankingKey(row.category_id, row.level, row.competitor_id, row.horse_id)
        const totals = pointsTotals.get(key) ?? { 1: null, 2: null, 3: null }
        totals[stage] = Number(row.stage_points || 0)
        pointsTotals.set(key, totals)
      }
    }

    const rankingRows = rankingMode === 'stage'
      ? stageRankingQuery.data ?? []
      : championshipRankingQuery.data ?? []
    const normalizedSearch = normalizeSearch(search)

    return rankingRows
      .map((row) => {
        const key = rankingKey(row.category_id, row.level, row.competitor_id, row.horse_id)
        const entry = entryByRanking.get(key)
        const notes = scoreTotals.get(key) ?? { 1: null, 2: null, 3: null }
        const points = pointsTotals.get(key) ?? { 1: null, 2: null, 3: null }
        const totalPoints = (points[1] ?? 0) + (points[2] ?? 0) + (points[3] ?? 0)
        const positionPrizePercent = prizeDistribution[row.position - 1] ?? 0

        return {
          key,
          position: row.position,
          competitorName: row.competitor_name,
          horseName: row.horse_name,
          categoryName: row.category_name,
          level: row.level,
          registration: entry?.horse?.registration ?? '--',
          owner: entry?.horse?.owner ?? '--',
          city: entry?.competitor?.city ?? '--',
          uf: entry?.competitor?.uf ?? '--',
          notes,
          points,
          totalPoints,
          prize: filterCategoryId ? (calculatedPrizePool * positionPrizePercent) / 100 : 0,
        }
      })
      .filter((row) => {
        if (!normalizedSearch) return true
        return normalizeSearch(`${row.competitorName} ${row.horseName}`).includes(normalizedSearch)
      })
  }, [
    allStagesRankingQuery.data,
    calculatedPrizePool,
    championshipRankingQuery.data,
    entriesQuery.data,
    filterCategoryId,
    prizeDistribution,
    rankingMode,
    scoresQuery.data,
    search,
    stageRankingQuery.data,
  ])

  const filteredEntryIds = useMemo(() => new Set(rows.flatMap((row) => row.entries.map((entry) => entry.id))), [rows])
  const filteredScoresCount = (scoresQuery.data ?? []).filter((score) => filteredEntryIds.has(score.entry_id)).length
  const overviewLoading = stageRankingQuery.isLoading || championshipRankingQuery.isLoading || allStagesRankingQuery.isLoading
  const overviewRefreshing = stageRankingQuery.isFetching
    || championshipRankingQuery.isFetching
    || allStagesRankingQuery.isFetching
    || scoresQuery.isFetching

  const refreshOverview = () => {
    void queryClient.invalidateQueries({ queryKey: ['scores', eventId] })
    void queryClient.invalidateQueries({ queryKey: ['ranking-stage', eventId] })
    void queryClient.invalidateQueries({ queryKey: ['ranking-championship', eventId] })
    void queryClient.invalidateQueries({ queryKey: ['ranking-stages-overview', eventId] })
  }

  const openEditEntry = (entry: EntryRecord) => {
    setEntryForm({
      id: entry.id,
      competitor_mode: 'existing',
      competitor_id: entry.competitor_id,
      new_competitor_name: '',
      new_competitor_document: '',
      new_competitor_city: '',
      new_competitor_uf: '',
      horse_mode: 'existing',
      horse_id: entry.horse_id,
      new_horse_name: '',
      new_horse_registration: '',
      new_horse_owner: '',
      category_id: entry.category_id,
      stage: entry.stage,
      entry_number: entry.entry_number ?? '',
      draw_order: entry.draw_order ? String(entry.draw_order) : '',
      status: entry.status,
    })
    setRegisterAllStages(false)
    setSelectedEntryLevels({
      ...defaultSelectedLevels,
      ...(entry.level ? { N1: false, N2: false, N3: false, N4: false, [entry.level]: true } : {}),
    })
    setEntryDialogOpen(true)
  }

  const selectedCompetitor = (competitorsQuery.data ?? []).find(
    (competitor) => competitor.id === entryForm.competitor_id,
  )
  const selectedHorse = (horsesQuery.data ?? []).find((horse) => horse.id === entryForm.horse_id)

  return (
    <div className="space-y-4">
      {!canJudgeWrite && isJudge && (
        <Alert variant="destructive">
          <AlertTitle>Evento nÃ£o estÃ¡ ativo</AlertTitle>
          <AlertDescription>
            JuÃ­zes sÃ³ podem lanÃ§ar e editar as prÃ³prias notas quando o evento estiver em status "Ao vivo".
          </AlertDescription>
        </Alert>
      )}

      {stageRankingQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar ranking da etapa</AlertTitle>
          <AlertDescription>
            {stageRankingQuery.error instanceof Error ? stageRankingQuery.error.message : 'Erro inesperado no ranking da etapa.'}
          </AlertDescription>
        </Alert>
      )}

      {championshipRankingQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar ranking do campeonato</AlertTitle>
          <AlertDescription>
            {championshipRankingQuery.error instanceof Error
              ? championshipRankingQuery.error.message
              : 'Erro inesperado no ranking do campeonato.'}
          </AlertDescription>
        </Alert>
      )}

      {allStagesRankingQuery.error && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar pontos das etapas</AlertTitle>
          <AlertDescription>
            {allStagesRankingQuery.error instanceof Error
              ? allStagesRankingQuery.error.message
              : 'Erro inesperado ao carregar os pontos.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 md:grid-cols-4">
        <div>
          <Label>Etapa</Label>
          <Select value={String(filterStage)} onValueChange={(value) => setFilterStage(Number(value) as Stage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((stage) => (
                <SelectItem key={stage.value} value={String(stage.value)}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Categoria</Label>
          <Select value={filterCategoryId ?? 'all'} onValueChange={(value) => setFilterCategoryId(value === 'all' ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(categoriesQuery.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {categoryLabel(category.name, category.level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>NÃ­vel</Label>
          <Select
            value={filterLevel === undefined ? 'all' : filterLevel === null ? NO_LEVEL_VALUE : filterLevel}
            onValueChange={(value) => {
              if (value === 'all') {
                setFilterLevel(undefined)
                return
              }
              if (value === NO_LEVEL_VALUE) {
                setFilterLevel(null)
                return
              }
              setFilterLevel(value as CategoryLevel)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value={NO_LEVEL_VALUE}>Sem nÃ­vel</SelectItem>
              {LEVEL_OPTIONS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Busca</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Competidor ou cavalo" />
          </div>
        </div>
      </div>

      {canManageEntries && (
        <Dialog
          open={entryDialogOpen}
          onOpenChange={(value) => {
            setEntryDialogOpen(value)
            if (!value) {
              setEntryForm(defaultEntryForm)
              setRegisterAllStages(true)
              setSelectedStages({ 1: true, 2: true, 3: true })
              setSelectedEntryLevels(defaultSelectedLevels)
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="gap-2"
              onClick={() => {
                setEntryForm(defaultEntryForm)
                setSelectedEntryLevels(defaultSelectedLevels)
              }}
            >
              <Plus className="h-4 w-4" />
              Nova inscriÃ§Ã£o
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{entryForm.id ? 'Editar inscriÃ§Ã£o' : 'Nova inscriÃ§Ã£o'}</DialogTitle>
            </DialogHeader>

            {!entryForm.id && (
              <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
                <Label className="text-sm font-semibold text-foreground">InscriÃ§Ã£o de campeonato</Label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={registerAllStages}
                    onChange={(e) => setRegisterAllStages(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Cadastrar em mÃºltiplas etapas.
                </label>
                {registerAllStages && (
                  <div className="flex flex-wrap gap-3">
                    {([1, 2, 3] as Stage[]).map((stage) => (
                      <label key={stage} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedStages[stage]}
                          onChange={(e) =>
                            setSelectedStages((prev) => ({
                              ...prev,
                              [stage]: e.target.checked,
                            }))
                          }
                          className="h-4 w-4"
                        />
                        {stage}a etapa
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-3">
              <section className="space-y-3 rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-base font-bold">Competidor *</Label>
                  {!entryForm.id && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={entryForm.competitor_mode === 'existing' ? 'default' : 'outline'}
                        onClick={() => setEntryForm((prev) => ({ ...prev, competitor_mode: 'existing' }))}
                      >
                        Usar cadastrado
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={entryForm.competitor_mode === 'new' ? 'default' : 'outline'}
                        onClick={() => setEntryForm((prev) => ({ ...prev, competitor_mode: 'new' }))}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar novo
                      </Button>
                    </div>
                  )}
                </div>

                {entryForm.competitor_mode === 'existing' ? (
                  <div className="space-y-2">
                    <Select
                      value={entryForm.competitor_id || undefined}
                      onValueChange={(value) => setEntryForm((prev) => ({ ...prev, competitor_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um competidor" />
                      </SelectTrigger>
                      <SelectContent>
                        {(competitorsQuery.data ?? []).map((competitor) => (
                          <SelectItem key={competitor.id} value={competitor.id}>
                            {competitor.name} {competitor.city ? `Â· ${competitor.city}/${competitor.uf ?? '--'}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCompetitor && (
                      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/45 p-2 text-sm sm:grid-cols-4">
                        <span><strong>Documento:</strong> {selectedCompetitor.document || '--'}</span>
                        <span><strong>Cidade:</strong> {selectedCompetitor.city || '--'}</span>
                        <span><strong>UF:</strong> {selectedCompetitor.uf || '--'}</span>
                        <span><strong>E-mail:</strong> {selectedCompetitor.email || '--'}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                    <div className="grid gap-1 sm:col-span-3">
                      <Label htmlFor="new-competitor-name">Nome do competidor *</Label>
                      <Input
                        id="new-competitor-name"
                        value={entryForm.new_competitor_name}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_competitor_name: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-3">
                      <Label htmlFor="new-competitor-document">Documento</Label>
                      <Input
                        id="new-competitor-document"
                        value={entryForm.new_competitor_document}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_competitor_document: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-4">
                      <Label htmlFor="new-competitor-city">Cidade</Label>
                      <Input
                        id="new-competitor-city"
                        value={entryForm.new_competitor_city}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_competitor_city: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-2">
                      <Label htmlFor="new-competitor-uf">UF</Label>
                      <Input
                        id="new-competitor-uf"
                        maxLength={2}
                        className="uppercase"
                        value={entryForm.new_competitor_uf}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_competitor_uf: event.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3 rounded-md border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-base font-bold">Animal *</Label>
                  {!entryForm.id && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={entryForm.horse_mode === 'existing' ? 'default' : 'outline'}
                        onClick={() => setEntryForm((prev) => ({ ...prev, horse_mode: 'existing' }))}
                      >
                        Usar cadastrado
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={entryForm.horse_mode === 'new' ? 'default' : 'outline'}
                        onClick={() => setEntryForm((prev) => ({ ...prev, horse_mode: 'new' }))}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar novo
                      </Button>
                    </div>
                  )}
                </div>

                {entryForm.horse_mode === 'existing' ? (
                  <div className="space-y-2">
                    <Select
                      value={entryForm.horse_id || undefined}
                      onValueChange={(value) => setEntryForm((prev) => ({ ...prev, horse_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um animal" />
                      </SelectTrigger>
                      <SelectContent>
                        {(horsesQuery.data ?? []).map((horse) => (
                          <SelectItem key={horse.id} value={horse.id}>
                            {horse.name} {horse.registration ? `Â· ${horse.registration}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedHorse && (
                      <div className="grid grid-cols-1 gap-2 rounded-md bg-muted/45 p-2 text-sm sm:grid-cols-2">
                        <span><strong>Registro:</strong> {selectedHorse.registration || '--'}</span>
                        <span><strong>ProprietÃ¡rio:</strong> {selectedHorse.owner || '--'}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                    <div className="grid gap-1 sm:col-span-3">
                      <Label htmlFor="new-horse-name">Nome do animal *</Label>
                      <Input
                        id="new-horse-name"
                        value={entryForm.new_horse_name}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_horse_name: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-3">
                      <Label htmlFor="new-horse-registration">Registro</Label>
                      <Input
                        id="new-horse-registration"
                        value={entryForm.new_horse_registration}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_horse_registration: event.target.value }))}
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-6">
                      <Label htmlFor="new-horse-owner">ProprietÃ¡rio</Label>
                      <Input
                        id="new-horse-owner"
                        value={entryForm.new_horse_owner}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_horse_owner: event.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </section>

              <div className="grid gap-1">
                <Label>Categoria *</Label>
                <Select
                  value={entryForm.category_id || undefined}
                  onValueChange={(value) => {
                    setEntryForm((prev) => ({ ...prev, category_id: value }))
                    setSelectedEntryLevels(defaultSelectedLevels)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {entryCategoryOptions.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {isLeveledCategoryName(category.name) ? `${category.name} (selecionar niveis)` : category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEntryCategoryIsLeveled && !entryForm.id && (
                <div className="grid gap-2 rounded-md border border-primary/25 bg-primary/5 p-3">
                  <Label className="text-sm font-semibold text-foreground">Niveis elegiveis para esta passada</Label>
                  <p className="text-xs text-muted-foreground">
                    A nota sera lancada uma unica vez e aplicada aos niveis selecionados.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {LEVEL_OPTIONS.map((level) => {
                      const categoryExists = selectedLevelCategories.some((category) => category.level === level)
                      return (
                        <label key={level} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedEntryLevels[level]}
                            disabled={!categoryExists}
                            onChange={(event) =>
                              setSelectedEntryLevels((prev) => ({
                                ...prev,
                                [level]: event.target.checked,
                              }))
                            }
                            className="h-4 w-4"
                          />
                          {level}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label>Etapa *</Label>
                  <Select
                    value={String(entryForm.stage)}
                    onValueChange={(value) => setEntryForm((prev) => ({ ...prev, stage: Number(value) as Stage }))}
                    disabled={!entryForm.id && registerAllStages}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1a etapa</SelectItem>
                      <SelectItem value="2">2a etapa</SelectItem>
                      <SelectItem value="3">3a etapa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label>NÃºmero de entrada</Label>
                  <Input
                    value={entryForm.entry_number}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, entry_number: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Ordem de entrada</Label>
                  <Input
                    value={entryForm.draw_order}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, draw_order: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => saveEntryMutation.mutate()} disabled={saveEntryMutation.isPending}>
                {saveEntryMutation.isPending ? 'Salvando...' : 'Salvar inscriÃ§Ã£o'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showLiveRanking && (
        <section className="overflow-hidden rounded-lg border border-primary/20 bg-card shadow-sm">
          <div className="flex flex-col gap-3 bg-primary px-4 py-3 text-primary-foreground lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6" />
              <div>
                <h3 className="text-lg font-bold">Overview e ranking ao vivo</h3>
                <p className="text-xs text-primary-foreground/80">Notas, pontos e premiaÃ§Ã£o da prova</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className={rankingMode === 'stage'
                  ? 'border-white bg-white text-primary hover:bg-white/90'
                  : 'border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white'}
                onClick={() => setRankingMode('stage')}
              >
                {filterStage}Âª etapa
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={rankingMode === 'championship'
                  ? 'border-white bg-white text-primary hover:bg-white/90'
                  : 'border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white'}
                onClick={() => setRankingMode('championship')}
              >
                Campeonato
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={refreshOverview}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${overviewRefreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 border-b bg-secondary/35 lg:grid-cols-4">
            <div className="border-b px-4 py-3 lg:border-b-0 lg:border-r">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Evento</p>
              <p className="font-semibold">{event.name}</p>
            </div>
            <div className="border-b px-4 py-3 lg:border-b-0 lg:border-r">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Data e local</p>
              <p className="flex items-center gap-2 font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" />
                {formatEventPeriod(event.starts_on, event.ends_on)}
              </p>
              <p className="text-xs text-muted-foreground">{event.location || 'Local nÃ£o informado'}</p>
            </div>
            <div className="border-b px-4 py-3 lg:border-b-0 lg:border-r">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Categoria</p>
              <p className="font-semibold">
                {selectedCategory ? categoryLabel(selectedCategory.name, selectedCategory.level) : 'Todas as categorias'}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">ExibiÃ§Ã£o</p>
              <p className="font-semibold">{rankingMode === 'stage' ? `${filterStage}Âª etapa` : 'Resultado do campeonato'}</p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_270px]">
            <div className="min-w-0 overflow-hidden xl:border-r">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Class.</TableHead>
                    <TableHead>Competidor</TableHead>
                    <TableHead>Animal</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>NÃ­vel</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>ProprietÃ¡rio</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="text-center">Nota 1Âª</TableHead>
                    <TableHead className="text-center">Nota 2Âª</TableHead>
                    <TableHead className="text-center">Nota 3Âª</TableHead>
                    <TableHead className="bg-zinc-600 text-center">Pts 1Âª</TableHead>
                    <TableHead className="bg-zinc-600 text-center">Pts 2Âª</TableHead>
                    <TableHead className="bg-zinc-600 text-center">Pts 3Âª</TableHead>
                    <TableHead className="bg-zinc-700 text-center">Total</TableHead>
                    <TableHead className="bg-emerald-600 text-right">PremiaÃ§Ã£o</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overviewLoading ? (
                    <TableRow>
                      <TableCell colSpan={16} className="text-muted-foreground">Atualizando ranking...</TableCell>
                    </TableRow>
                  ) : overviewRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={16} className="text-muted-foreground">
                        Nenhuma nota encontrada para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    overviewRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="text-center text-lg font-bold text-primary">{row.position}Âº</TableCell>
                        <TableCell className="font-semibold">{row.competitorName}</TableCell>
                        <TableCell>{row.horseName}</TableCell>
                        <TableCell>{row.categoryName}</TableCell>
                        <TableCell><LevelBadge level={row.level} /></TableCell>
                        <TableCell>{row.registration}</TableCell>
                        <TableCell>{row.owner}</TableCell>
                        <TableCell>{row.city} / {row.uf}</TableCell>
                        <TableCell className="text-center font-semibold">{formatScore(row.notes[1])}</TableCell>
                        <TableCell className="text-center font-semibold">{formatScore(row.notes[2])}</TableCell>
                        <TableCell className="text-center font-semibold">{formatScore(row.notes[3])}</TableCell>
                        <TableCell className="bg-zinc-100 text-center font-semibold">{row.points[1] ?? '--'}</TableCell>
                        <TableCell className="bg-zinc-100 text-center font-semibold">{row.points[2] ?? '--'}</TableCell>
                        <TableCell className="bg-zinc-100 text-center font-semibold">{row.points[3] ?? '--'}</TableCell>
                        <TableCell className="bg-zinc-200 text-center text-base font-bold">{row.totalPoints}</TableCell>
                        <TableCell className="bg-emerald-50 text-right font-bold text-emerald-800">
                          {row.prize > 0 ? formatCurrency(row.prize) : '--'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <aside className="divide-y bg-muted/20">
              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Medal className="h-5 w-5" />
                  <h4 className="font-bold">Resumo da prova</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border bg-card p-3">
                    <p className="text-xs text-muted-foreground">InscriÃ§Ãµes</p>
                    <p className="text-2xl font-bold">{rows.length}</p>
                  </div>
                  <div className="rounded-md border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Notas</p>
                    <p className="text-2xl font-bold">{filteredScoresCount}</p>
                  </div>
                </div>
                <div className="rounded-md border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Bolsa total do evento</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(prizePoolValue)}</p>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <WalletCards className="h-5 w-5 text-emerald-700" />
                  <h4 className="font-bold">PremiaÃ§Ã£o calculada</h4>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="prize-pool-percent">% da bolsa para premiaÃ§Ã£o</Label>
                  <Input
                    id="prize-pool-percent"
                    type="number"
                    min="0"
                    max="100"
                    value={prizePoolPercent}
                    onChange={(event) => setPrizePoolPercent(event.target.value)}
                  />
                </div>
                <div className="rounded-md bg-emerald-600 p-3 text-white">
                  <p className="text-xs font-semibold uppercase">Valor distribuÃ­do</p>
                  <p className="text-xl font-bold">{formatCurrency(calculatedPrizePool)}</p>
                </div>
                {!filterCategoryId && (
                  <p className="text-xs font-semibold text-amber-700">
                    Selecione uma categoria para calcular a premiaÃ§Ã£o por colocaÃ§Ã£o.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="prize-first">1Âº</Label>
                    <Input id="prize-first" type="number" value={prizeFirstPercent} onChange={(event) => setPrizeFirstPercent(event.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="prize-second">2Âº</Label>
                    <Input id="prize-second" type="number" value={prizeSecondPercent} onChange={(event) => setPrizeSecondPercent(event.target.value)} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="prize-third">3Âº</Label>
                    <Input id="prize-third" type="number" value={prizeThirdPercent} onChange={(event) => setPrizeThirdPercent(event.target.value)} />
                  </div>
                </div>
                <p className={`text-xs font-semibold ${prizeDistributionTotal === 100 ? 'text-emerald-700' : 'text-destructive'}`}>
                  DistribuiÃ§Ã£o: {prizeDistributionTotal}% {prizeDistributionTotal === 100 ? '' : '(ajuste para 100%)'}
                </p>
              </div>
            </aside>
          </div>
        </section>
      )}

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/35 px-4 py-3">
          <div>
            <h3 className="font-bold">LanÃ§amento rÃ¡pido de notas</h3>
            <p className="text-xs text-muted-foreground">{rows.length} inscriÃ§Ã£o(Ãµes) encontrada(s) nos filtros.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{filterStage}Âª etapa</Badge>
            {selectedCategory && <Badge variant="secondary">{categoryLabel(selectedCategory.name, selectedCategory.level)}</Badge>}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordem</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Competidor</TableHead>
              <TableHead>Cavalo</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>ProprietÃ¡rio</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>NÃ­vel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Penalidades</TableHead>
              <TableHead>ObservaÃ§Ãµes</TableHead>
              <TableHead className="text-right">AÃ§Ãµes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-muted-foreground">
                  Nenhuma inscriÃ§Ã£o encontrada para os filtros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const entry = row.primary
                const draft = readDraft(row.key, entry.stage, row.entries)
                const entryIds = row.entries.map((item) => item.id)
                const cancelled = row.entries.some((item) => item.status === 'cancelled')

                return (
                  <TableRow key={row.key}>
                    <TableCell>{entry.draw_order ?? '--'}</TableCell>
                    <TableCell>{entry.stage}a</TableCell>
                    <TableCell>{entry.category?.name ?? '--'}</TableCell>
                    <TableCell>{entry.competitor?.name ?? '--'}</TableCell>
                    <TableCell>{entry.horse?.name ?? '--'}</TableCell>
                    <TableCell>{entry.horse?.registration ?? '--'}</TableCell>
                    <TableCell>{entry.horse?.owner ?? '--'}</TableCell>
                    <TableCell>{entry.competitor?.city ?? '--'}</TableCell>
                    <TableCell>{entry.competitor?.uf ?? '--'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.levels.map((level) => <LevelBadge key={level ?? 'sem-nivel'} level={level} />)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="entry" status={cancelled ? 'cancelled' : entry.status} />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={draft.score}
                        onChange={(e) => writeDraft(row.key, entry.stage, row.entries, { score: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && canJudgeWrite && !saveScoreMutation.isPending) {
                            saveScoreMutation.mutate({ rowKey: row.key, entryIds, payload: draft })
                          }
                        }}
                        disabled={!canJudgeWrite}
                        className="w-28 border-primary/40 bg-white text-center text-base font-bold"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={draft.penalties}
                        onChange={(e) => writeDraft(row.key, entry.stage, row.entries, { penalties: e.target.value })}
                        disabled={!canJudgeWrite}
                        className="w-28 bg-white text-center font-semibold"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={draft.notes}
                        onChange={(e) => writeDraft(row.key, entry.stage, row.entries, { notes: e.target.value })}
                        disabled={!canJudgeWrite}
                        placeholder="Opcional"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          className="gap-2"
                          disabled={!canJudgeWrite || saveScoreMutation.isPending || cancelled}
                          onClick={() => saveScoreMutation.mutate({ rowKey: row.key, entryIds, payload: draft })}
                        >
                          <Save className="h-4 w-4" />
                          Salvar
                        </Button>
                        {canManageEntries && (
                          <>
                            <Button size="icon" variant="outline" onClick={() => openEditEntry(entry)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => deleteEntryMutation.mutate(entryIds)}
                              disabled={deleteEntryMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}



