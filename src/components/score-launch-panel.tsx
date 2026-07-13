import { CalendarDays, Eraser, Medal, Pencil, Plus, RefreshCw, Save, Search, Trash2, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { CategoryLevel, EntryRecord, EventRecord, Level, ScoreRecord, Stage } from '@/types/domain'
import {
  LEVEL_OPTIONS,
  BRAZILIAN_UF_OPTIONS,
  NO_LEVEL_VALUE,
  STAGE_OPTIONS,
  categoryOptionLabel,
  getUniqueCategoryOptions,
  isLeveledCategoryName,
  isOfficialCategoryName,
} from '@/lib/constants'
import {
  deleteEntry,
  deleteScore,
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
import { SuggestionInput } from '@/components/ui/suggestion-input'
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

interface OverviewLevelInfo {
  level: CategoryLevel
  position: number
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
    throw new Error(`${fieldLabel} inválido. Use número com ponto ou vírgula.`)
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
  if (!startsOn && !endsOn) return 'Data não informada'
  if (startsOn && endsOn && startsOn !== endsOn) return `${formatDate(startsOn)} a ${formatDate(endsOn)}`
  return formatDate(startsOn ?? endsOn ?? '')
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

function levelSortValue(level: CategoryLevel) {
  if (level === 'N1') return 1
  if (level === 'N2') return 2
  if (level === 'N3') return 3
  if (level === 'N4') return 4
  return 0
}

function uniqueSortedLevels(levels: CategoryLevel[]) {
  return Array.from(new Set(levels)).sort((a, b) => levelSortValue(a) - levelSortValue(b))
}

function overviewPositionLabel(levels: OverviewLevelInfo[]) {
  const positions = Array.from(new Set(levels.map((item) => item.position))).sort((a, b) => a - b)
  return positions[0] ? `${positions[0]}º` : '--'
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
  const [filterCategoryName, setFilterCategoryName] = useState<string | undefined>()
  const [filterLevel, setFilterLevel] = useState<CategoryLevel | undefined>()
  const [search, setSearch] = useState('')
  const [rankingMode, setRankingMode] = useState<'stage' | 'championship'>('stage')
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
    queryKey: ['ranking-stage', eventId, 'live', filterStage, filterCategoryName, filterLevel],
    queryFn: () => getRankingByStage(eventId, filterStage, undefined, filterLevel),
    enabled: showLiveRanking && rankingMode === 'stage',
    refetchInterval: 2000,
  })

  const championshipRankingQuery = useQuery({
    queryKey: ['ranking-championship', eventId, 'live', filterCategoryName, filterLevel],
    queryFn: () => getChampionshipRanking(eventId, undefined, filterLevel),
    enabled: showLiveRanking && rankingMode === 'championship',
    refetchInterval: 2000,
  })

  const allStagesRankingQuery = useQuery({
    queryKey: ['ranking-stages-overview', eventId, filterCategoryName, filterLevel],
    queryFn: async () => {
      const [stage1, stage2, stage3] = await Promise.all([
        getRankingByStage(eventId, 1, undefined, filterLevel),
        getRankingByStage(eventId, 2, undefined, filterLevel),
        getRankingByStage(eventId, 3, undefined, filterLevel),
      ])
      return { stage1, stage2, stage3 }
    },
    enabled: showLiveRanking,
    refetchInterval: 2000,
  })

  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.active && isOfficialCategoryName(category.name)),
    [categoriesQuery.data],
  )
  const entryCategoryOptions = useMemo(() => getUniqueCategoryOptions(categories), [categories])
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
      toast.success('Inscrição removida.')
      void queryClient.invalidateQueries({ queryKey: ['entries', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['scores', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stage', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-championship', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stages-overview', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover inscrição')
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

  const deleteScoreMutation = useMutation({
    mutationFn: async ({ rowKey, entryIds }: { rowKey: string; entryIds: string[] }) => {
      const scoresToDelete = entryIds.map((entryId) => scoreByEntry.get(entryId)).filter(Boolean) as ScoreRecord[]
      for (const score of scoresToDelete) await deleteScore(score.id)
      return rowKey
    },
    onSuccess: (rowKey) => {
      toast.success('Nota excluída.')
      setDrafts((current) => ({
        ...current,
        [rowKey]: { score: '', penalties: '0', notes: '', stage: current[rowKey]?.stage ?? filterStage },
      }))
      void queryClient.invalidateQueries({ queryKey: ['scores', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stage', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-championship', eventId] })
      void queryClient.invalidateQueries({ queryKey: ['ranking-stages-overview', eventId] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao excluir nota.'),
  })

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
      if (filterCategoryName && entry.category?.name !== filterCategoryName) return false
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
  }, [entriesQuery.data, search, filterStage, filterCategoryName, filterLevel])

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

  const selectedCategory = categories.find((category) => category.name === filterCategoryName)
  const prizePoolValue = Number(event.prize_pool || 0)
  const overviewEntries = entriesQuery.data
  const overviewScores = scoresQuery.data
  const overviewStageRanking = stageRankingQuery.data
  const overviewChampionshipRanking = championshipRankingQuery.data
  const overviewAllStagesRanking = allStagesRankingQuery.data

  const overviewRows = useMemo(() => {
    const entries = overviewEntries ?? []
    const entriesById = new Map(entries.map((entry) => [entry.id, entry]))
    const entryByRanking = new Map<string, EntryRecord>()
    const scoreTotals = new Map<string, Record<Stage, number | null>>()
    const pointsTotals = new Map<string, Record<Stage, number | null>>()

    for (const entry of entries) {
      const key = rankingKey(entry.category_id, entry.level, entry.competitor_id, entry.horse_id)
      if (!entryByRanking.has(key)) entryByRanking.set(key, entry)
    }

    for (const score of overviewScores ?? []) {
      const entry = score.entry ?? entriesById.get(score.entry_id)
      if (!entry) continue

      const key = rankingKey(entry.category_id, entry.level, entry.competitor_id, entry.horse_id)
      const totals = scoreTotals.get(key) ?? { 1: null, 2: null, 3: null }
      totals[score.stage] = (totals[score.stage] ?? 0) + Number(score.final_score || 0)
      scoreTotals.set(key, totals)
    }

    const stageGroups = overviewAllStagesRanking
      ? ([
          [1, overviewAllStagesRanking.stage1],
          [2, overviewAllStagesRanking.stage2],
          [3, overviewAllStagesRanking.stage3],
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
      ? overviewStageRanking ?? []
      : overviewChampionshipRanking ?? []
    const normalizedSearch = normalizeSearch(search)

    const grouped = new Map<string, {
      key: string
      positionSort: number
      positionLabel: string
      levels: CategoryLevel[]
      levelInfo: OverviewLevelInfo[]
      competitorName: string
      horseName: string
      categoryName: string
      registration: string
      owner: string
      city: string
      uf: string
      notes: Record<Stage, number | null>
      points: Record<Stage, number | null>
      totalPoints: number
    }>()

    for (const row of rankingRows) {
      if (filterCategoryName && row.category_name !== filterCategoryName) continue
      if (normalizedSearch && !normalizeSearch(`${row.competitor_name} ${row.horse_name}`).includes(normalizedSearch)) continue

      const key = rankingKey(row.category_id, row.level, row.competitor_id, row.horse_id)
      const groupedKey = `${row.event_id}:${row.category_name}:${row.competitor_id}:${row.horse_id}`
      const entry = entryByRanking.get(key)
      const notes = scoreTotals.get(key) ?? { 1: null, 2: null, 3: null }
      const points = pointsTotals.get(key) ?? { 1: null, 2: null, 3: null }
      const current = grouped.get(groupedKey) ?? {
        key: groupedKey,
        positionSort: row.position,
        positionLabel: `${row.position}º`,
        levels: [],
        levelInfo: [],
        competitorName: row.competitor_name,
        horseName: row.horse_name,
        categoryName: row.category_name,
        registration: entry?.horse?.registration ?? '--',
        owner: entry?.horse?.owner ?? '--',
        city: entry?.competitor?.city ?? '--',
        uf: entry?.competitor?.uf ?? '--',
        notes: { 1: null, 2: null, 3: null },
        points: { 1: null, 2: null, 3: null },
        totalPoints: 0,
      }

      current.positionSort = Math.min(current.positionSort, row.position)
      current.levels = uniqueSortedLevels([...current.levels, row.level])
      current.levelInfo = [...current.levelInfo, { level: row.level, position: row.position }]

      ;([1, 2, 3] as Stage[]).forEach((stage) => {
        if (current.notes[stage] === null && notes[stage] !== null) {
          current.notes[stage] = notes[stage]
        }
        if (points[stage] !== null) {
          current.points[stage] = Math.max(current.points[stage] ?? 0, points[stage] ?? 0)
        }
      })

      current.positionLabel = overviewPositionLabel(current.levelInfo)
      current.totalPoints = (current.points[1] ?? 0) + (current.points[2] ?? 0) + (current.points[3] ?? 0)
      grouped.set(groupedKey, current)
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.positionSort !== b.positionSort) return a.positionSort - b.positionSort
      return a.competitorName.localeCompare(b.competitorName, 'pt-BR')
    })
  }, [
    filterCategoryName,
    overviewAllStagesRanking,
    overviewChampionshipRanking,
    overviewEntries,
    overviewScores,
    overviewStageRanking,
    rankingMode,
    search,
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
  const competitorOptions = (competitorsQuery.data ?? []).map((competitor) => ({
    value: competitor.name,
    label: competitor.city ? `${competitor.city}/${competitor.uf ?? '--'}` : competitor.document ?? undefined,
  }))
  const horseOptions = (horsesQuery.data ?? []).map((horse) => ({
    value: horse.name,
    label: horse.registration ?? horse.owner ?? undefined,
  }))
  const cityOptions = Array.from(
    new Set((competitorsQuery.data ?? []).map((competitor) => competitor.city?.trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR')).map((value) => ({ value }))
  const ownerOptions = Array.from(
    new Set((horsesQuery.data ?? []).map((horse) => horse.owner?.trim()).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR')).map((value) => ({ value }))

  return (
    <div className="space-y-4">
      {!canJudgeWrite && isJudge && (
        <Alert variant="destructive">
          <AlertTitle>Evento não está ativo</AlertTitle>
          <AlertDescription>
            Juízes só podem lançar e editar as próprias notas quando o evento estiver em status "Ao vivo".
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
          <Select
            value={filterCategoryName ?? 'all'}
            onValueChange={(value) => {
              const nextCategoryName = value === 'all' ? undefined : value
              setFilterCategoryName(nextCategoryName)
              if (nextCategoryName && !isLeveledCategoryName(nextCategoryName)) setFilterLevel(null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {entryCategoryOptions.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {categoryOptionLabel(category.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Nível</Label>
          <Select
            value={filterLevel === undefined ? 'all' : filterLevel === null ? NO_LEVEL_VALUE : filterLevel}
            disabled={Boolean(filterCategoryName && !isLeveledCategoryName(filterCategoryName))}
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
              <SelectItem value={NO_LEVEL_VALUE}>Sem nível</SelectItem>
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
              Nova inscrição
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{entryForm.id ? 'Editar inscrição' : 'Nova inscrição'}</DialogTitle>
            </DialogHeader>

            {!entryForm.id && (
              <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
                <Label className="text-sm font-semibold text-foreground">Inscrição de campeonato</Label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={registerAllStages}
                    onChange={(e) => setRegisterAllStages(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Cadastrar em múltiplas etapas.
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
                            {competitor.name} {competitor.city ? `· ${competitor.city}/${competitor.uf ?? '--'}` : ''}
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
                      <SuggestionInput
                        id="new-competitor-name"
                        options={competitorOptions}
                        value={entryForm.new_competitor_name}
                        placeholder="Digite um nome novo ou escolha uma sugestão"
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_competitor_name: event.target.value }))}
                        onSuggestionSelect={(option) => {
                          const found = (competitorsQuery.data ?? []).find(
                            (competitor) => normalizeSearch(competitor.name) === normalizeSearch(option.value),
                          )
                          if (!found) return
                          setEntryForm((prev) => ({
                            ...prev,
                            new_competitor_name: found.name,
                            new_competitor_document: found.document ?? prev.new_competitor_document,
                            new_competitor_city: found.city ?? prev.new_competitor_city,
                            new_competitor_uf: found.uf ?? prev.new_competitor_uf,
                          }))
                        }}
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
                      <SuggestionInput
                        id="new-competitor-city"
                        options={cityOptions}
                        value={entryForm.new_competitor_city}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_competitor_city: event.target.value }))}
                        placeholder="Digite ou escolha"
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-2">
                      <Label htmlFor="new-competitor-uf">UF</Label>
                      <SuggestionInput
                        id="new-competitor-uf"
                        options={BRAZILIAN_UF_OPTIONS.map((value) => ({ value }))}
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
                            {horse.name} {horse.registration ? `· ${horse.registration}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedHorse && (
                      <div className="grid grid-cols-1 gap-2 rounded-md bg-muted/45 p-2 text-sm sm:grid-cols-2">
                        <span><strong>Registro:</strong> {selectedHorse.registration || '--'}</span>
                        <span><strong>Proprietário:</strong> {selectedHorse.owner || '--'}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                    <div className="grid gap-1 sm:col-span-3">
                      <Label htmlFor="new-horse-name">Nome do animal *</Label>
                      <SuggestionInput
                        id="new-horse-name"
                        options={horseOptions}
                        value={entryForm.new_horse_name}
                        placeholder="Digite um animal novo ou escolha uma sugestão"
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_horse_name: event.target.value }))}
                        onSuggestionSelect={(option) => {
                          const found = (horsesQuery.data ?? []).find(
                            (horse) => normalizeSearch(horse.name) === normalizeSearch(option.value),
                          )
                          if (!found) return
                          setEntryForm((prev) => ({
                            ...prev,
                            new_horse_name: found.name,
                            new_horse_registration: found.registration ?? prev.new_horse_registration,
                            new_horse_owner: found.owner ?? prev.new_horse_owner,
                          }))
                        }}
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
                      <Label htmlFor="new-horse-owner">Proprietário</Label>
                      <SuggestionInput
                        id="new-horse-owner"
                        options={ownerOptions}
                        value={entryForm.new_horse_owner}
                        onChange={(event) => setEntryForm((prev) => ({ ...prev, new_horse_owner: event.target.value }))}
                        placeholder="Digite ou escolha"
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
                  <Label>Número de entrada</Label>
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
                {saveEntryMutation.isPending ? 'Salvando...' : 'Salvar inscrição'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showLiveRanking && (
        <section className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm">
          <div className="bg-primary px-4 py-4 text-primary-foreground sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold">Ranking ao vivo da prova</h3>
                  <p className="text-sm text-primary-foreground/80">Notas, pontos e premiacao em leitura rapida.</p>
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
                  {filterStage}a etapa
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
          </div>

          <div className="grid gap-3 border-b bg-muted/30 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Evento</p>
              <p className="mt-1 font-bold text-foreground">{event.name}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Data e local</p>
              <p className="mt-1 flex items-center gap-2 font-bold text-foreground"><CalendarDays className="h-4 w-4 text-primary" />{formatEventPeriod(event.starts_on, event.ends_on)}</p>
              <p className="text-xs text-muted-foreground">{event.location || 'Local nao informado'}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Categoria</p>
              <p className="mt-1 font-bold text-foreground">{selectedCategory ? categoryOptionLabel(selectedCategory.name) : 'Todas as categorias'}</p>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Exibicao</p>
              <p className="mt-1 font-bold text-foreground">{rankingMode === 'stage' ? `${filterStage}a etapa` : 'Resultado do campeonato'}</p>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Inscricoes</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{rows.length}</p>
              </div>
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Notas lancadas</p>
                <p className="mt-1 text-3xl font-extrabold text-foreground">{filteredScoresCount}</p>
              </div>
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Bolsa do evento</p>
                <p className="mt-1 text-2xl font-extrabold text-primary">{formatCurrency(prizePoolValue)}</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {overviewRows.slice(0, 3).map((row, index) => (
                <article key={`podium-${row.key}`} className="rounded-2xl border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{index + 1}o lugar</p>
                      <p className="mt-1 text-lg font-extrabold text-primary">{row.positionLabel}</p>
                    </div>
                    <Medal className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-3 line-clamp-1 font-bold text-foreground">{row.competitorName}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">{row.horseName}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {row.levels.map((level) => <LevelBadge key={level ?? 'sem-nivel'} level={level} />)}
                  </div>
                  <div className="mt-3 flex items-end justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <strong className="text-xl text-foreground">{row.totalPoints || formatScore(row.notes[filterStage])}</strong>
                  </div>
                </article>
              ))}
              {!overviewLoading && overviewRows.length === 0 && (
                <div className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground md:col-span-3">
                  Nenhuma nota encontrada para os filtros selecionados.
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <h4 className="font-bold text-foreground">Classificacao completa</h4>
                {overviewLoading && <span className="text-sm text-muted-foreground">Atualizando...</span>}
              </div>
              <div className="divide-y">
                {overviewRows.map((row) => (
                  <article key={row.key} className="grid gap-3 p-4 lg:grid-cols-[72px_minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(230px,0.9fr)] lg:items-center">
                    <div className="text-2xl font-extrabold text-primary">{row.positionLabel}</div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-foreground">{row.competitorName}</p>
                      <p className="truncate text-sm text-muted-foreground">{row.horseName} {row.registration !== '--' ? `- ${row.registration}` : ''}</p>
                      <p className="truncate text-xs text-muted-foreground">{row.owner} {row.city !== '--' ? `- ${row.city}/${row.uf}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{row.categoryName}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.levels.map((level) => <LevelBadge key={level ?? 'sem-nivel'} level={level} />)}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-lg border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 1</span><strong>{formatScore(row.notes[1])}</strong></div>
                      <div className="rounded-lg border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 2</span><strong>{formatScore(row.notes[2])}</strong></div>
                      <div className="rounded-lg border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 3</span><strong>{formatScore(row.notes[3])}</strong></div>
                      <div className="rounded-lg border bg-primary/10 p-2"><span className="block text-muted-foreground">Pts</span><strong>{row.totalPoints}</strong></div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/35 px-4 py-3">
          <div>
            <h3 className="font-bold">Lancamento rapido de notas</h3>
            <p className="text-xs text-muted-foreground">{rows.length} inscricao(oes) encontrada(s) nos filtros.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{filterStage}a etapa</Badge>
            {selectedCategory && <Badge variant="secondary">{categoryOptionLabel(selectedCategory.name)}</Badge>}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordem</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conjunto</TableHead>
              <TableHead>Niveis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Pen.</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-muted-foreground">
                  Nenhuma inscricao encontrada para os filtros.
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
                    <TableCell className="w-16 text-center font-bold text-primary">{entry.draw_order ?? '--'}</TableCell>
                    <TableCell className="w-20">{entry.stage}a</TableCell>
                    <TableCell className="w-40 font-semibold">{entry.category?.name ?? '--'}</TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground">{entry.competitor?.name ?? '--'}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.horse?.name ?? '--'} {entry.horse?.registration ? `- ${entry.horse.registration}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.horse?.owner ?? '--'} {entry.competitor?.city ? `- ${entry.competitor.city}/${entry.competitor.uf ?? '--'}` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="w-36">
                      <div className="flex flex-wrap gap-1">
                        {row.levels.map((level) => <LevelBadge key={level ?? 'sem-nivel'} level={level} />)}
                      </div>
                    </TableCell>
                    <TableCell className="w-28">
                      <StatusBadge type="entry" status={cancelled ? 'cancelled' : entry.status} />
                    </TableCell>
                    <TableCell className="w-28">
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
                        className="border-primary/40 bg-white text-center text-base font-bold"
                      />
                    </TableCell>
                    <TableCell className="w-24">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={draft.penalties}
                        onChange={(e) => writeDraft(row.key, entry.stage, row.entries, { penalties: e.target.value })}
                        disabled={!canJudgeWrite}
                        className="bg-white text-center font-semibold"
                      />
                    </TableCell>
                    <TableCell className="w-44">
                      <Input
                        value={draft.notes}
                        onChange={(e) => writeDraft(row.key, entry.stage, row.entries, { notes: e.target.value })}
                        disabled={!canJudgeWrite}
                        placeholder="Opcional"
                      />
                    </TableCell>
                    <TableCell className="w-40">
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
                            {draft.scoreId && (
                              <Button
                                size="icon"
                                variant="outline"
                                title="Excluir somente a nota"
                                onClick={() => deleteScoreMutation.mutate({ rowKey: row.key, entryIds })}
                                disabled={deleteScoreMutation.isPending}
                              >
                                <Eraser className="h-4 w-4" />
                              </Button>
                            )}
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




