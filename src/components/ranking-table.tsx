import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { CategoryLevel, ChampionshipRankingRow, Level, Stage, StageRankingRow } from '@/types/domain'
import {
  LEVEL_OPTIONS,
  NO_LEVEL_VALUE,
  STAGE_OPTIONS,
  categoryOptionLabel,
  getUniqueCategoryOptions,
  isLeveledCategoryName,
  isOfficialCategoryName,
  pointsForPosition,
} from '@/lib/constants'
import { downloadExcel } from '@/lib/spreadsheet'
import { getCategories, getChampionshipRanking, getRankingByStage } from '@/services/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LevelBadge } from '@/components/level-badge'

interface RankingTableProps {
  eventId: string
}

type RankingMode = 'stage' | 'championship'
type LevelViewMode = 'exact' | 'cumulative'

interface AggregatedChampionshipRow extends ChampionshipRankingRow {
  stages_count: number
}

interface PodiumRow {
  category_name: string
  level: CategoryLevel
  competitor_name: string
  horse_name: string
  total_score: number
  position: number
}

const LEVEL_ORDER: Record<Level, number> = {
  N1: 1,
  N2: 2,
  N3: 3,
  N4: 4,
}

function isLevelEligibleForBand(level: CategoryLevel, band: Level): boolean {
  if (!level) return false
  return LEVEL_ORDER[level] <= LEVEL_ORDER[band]
}

function cumulativeLabel(level: Level): string {
  if (level === 'N1') return 'N1 (somente N1)'
  if (level === 'N2') return 'N2 (N1 + N2)'
  if (level === 'N3') return 'N3 (N1 + N2 + N3)'
  return 'N4 (N1 + N2 + N3 + N4)'
}

function sortByScoreThenName<T extends { total_score: number; competitor_name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score
    return a.competitor_name.localeCompare(b.competitor_name, 'pt-BR')
  })
}

function dedupeCumulativeRows(rows: StageRankingRow[]) {
  const map = new Map<string, StageRankingRow>()

  for (const row of rows) {
    const key = `${row.category_name}-${row.competitor_id}-${row.horse_id}`
    const existing = map.get(key)
    if (!existing || row.total_score > existing.total_score) {
      map.set(key, row)
    }
  }

  return Array.from(map.values())
}

export function RankingTable({ eventId }: RankingTableProps) {
  const [mode, setMode] = useState<RankingMode>('stage')
  const [stage, setStage] = useState<Stage>(1)
  const [categoryName, setCategoryName] = useState<string | undefined>()
  const [levelViewMode, setLevelViewMode] = useState<LevelViewMode>('exact')
  const [level, setLevel] = useState<CategoryLevel | undefined>()
  const [prizePool, setPrizePool] = useState('0')
  const [prizePct1, setPrizePct1] = useState('50')
  const [prizePct2, setPrizePct2] = useState('30')
  const [prizePct3, setPrizePct3] = useState('20')

  const categoriesQuery = useQuery({ queryKey: ['categories', eventId], queryFn: () => getCategories(eventId) })
  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.active && isOfficialCategoryName(category.name)),
    [categoriesQuery.data],
  )
  const categoryOptions = useMemo(() => {
    return getUniqueCategoryOptions(categories).map((category) => categoryOptionLabel(category.name))
  }, [categories])
  const selectedCategoryIsLeveled = categoryName ? isLeveledCategoryName(categoryName) : true

  const isCumulative = levelViewMode === 'cumulative'
  const cumulativeLevel: Level = level && level !== null ? (level as Level) : 'N1'
  const cumulativeNeedsCategory = isCumulative && !categoryName

  const stageRankingExactQuery = useQuery({
    queryKey: ['ranking-stage', eventId, stage, categoryName, level],
    queryFn: () => getRankingByStage(eventId, stage, undefined, level),
    enabled: mode === 'stage' && !isCumulative,
    refetchInterval: 2000,
  })

  const championshipExactQuery = useQuery({
    queryKey: ['ranking-championship', eventId, categoryName, level],
    queryFn: () => getChampionshipRanking(eventId, undefined, level),
    enabled: mode === 'championship' && !isCumulative,
    refetchInterval: 2000,
  })

  const stageRankingCumulativeSourceQuery = useQuery({
    queryKey: ['ranking-stage-cumulative-source', eventId, stage, categoryName],
    queryFn: () => getRankingByStage(eventId, stage, undefined, undefined),
    enabled: mode === 'stage' && isCumulative && !cumulativeNeedsCategory,
    refetchInterval: 2000,
  })

  const championshipCumulativeSourceQuery = useQuery({
    queryKey: ['ranking-championship-cumulative-source', eventId, categoryName],
    queryFn: async () => {
      const [s1, s2, s3] = await Promise.all([
        getRankingByStage(eventId, 1, undefined, undefined),
        getRankingByStage(eventId, 2, undefined, undefined),
        getRankingByStage(eventId, 3, undefined, undefined),
      ])
      return { s1, s2, s3 }
    },
    enabled: mode === 'championship' && isCumulative && !cumulativeNeedsCategory,
    refetchInterval: 2000,
  })

  const stageRows = useMemo<StageRankingRow[]>(() => {
    if (!isCumulative) {
      const rows = stageRankingExactQuery.data ?? []
      return categoryName ? rows.filter((row) => row.category_name === categoryName) : rows
    }
    if (cumulativeNeedsCategory) return []

    const sourceRows = stageRankingCumulativeSourceQuery.data ?? []
    const filtered = dedupeCumulativeRows(sourceRows.filter((row) =>
      row.category_name === categoryName && isLevelEligibleForBand(row.level, cumulativeLevel),
    ))
    const sorted = sortByScoreThenName(filtered)

    return sorted.map((row, index) => ({
      ...row,
      position: index + 1,
      stage_points: pointsForPosition(index + 1),
    }))
  }, [
    isCumulative,
    stageRankingExactQuery.data,
    categoryName,
    cumulativeNeedsCategory,
    stageRankingCumulativeSourceQuery.data,
    cumulativeLevel,
  ])

  const championshipRows = useMemo<ChampionshipRankingRow[]>(() => {
    if (!isCumulative) {
      const rows = championshipExactQuery.data ?? []
      return categoryName ? rows.filter((row) => row.category_name === categoryName) : rows
    }
    if (cumulativeNeedsCategory) return []

    const source = championshipCumulativeSourceQuery.data
    if (!source) return []

    const map = new Map<string, AggregatedChampionshipRow>()

    ;([
      [1, source.s1],
      [2, source.s2],
      [3, source.s3],
    ] as const).forEach(([stageNumber, sourceRows]) => {
      const filtered = dedupeCumulativeRows(sourceRows.filter((row) =>
        row.category_name === categoryName && isLevelEligibleForBand(row.level, cumulativeLevel),
      ))
      const sorted = sortByScoreThenName(filtered)

      sorted.forEach((row, index) => {
        const stagePoints = pointsForPosition(index + 1)
        const key = `${row.event_id}-${row.category_name}-${row.competitor_id}-${row.horse_id}`
        const existing = map.get(key)

        if (!existing) {
          map.set(key, {
            event_id: row.event_id,
            category_id: row.category_id,
            category_name: row.category_name,
            level: row.level,
            competitor_id: row.competitor_id,
            competitor_name: row.competitor_name,
            horse_id: row.horse_id,
            horse_name: row.horse_name,
            stage_1_score: stageNumber === 1 ? stagePoints : 0,
            stage_2_score: stageNumber === 2 ? stagePoints : 0,
            stage_3_score: stageNumber === 3 ? stagePoints : 0,
            total_score: stagePoints,
            position: 0,
            stages_count: 1,
          })
          return
        }

        existing.total_score += stagePoints
        existing.stages_count += 1
        if (stageNumber === 1) existing.stage_1_score = stagePoints
        if (stageNumber === 2) existing.stage_2_score = stagePoints
        if (stageNumber === 3) existing.stage_3_score = stagePoints
      })
    })

    const ranked = sortByScoreThenName(Array.from(map.values()).filter((row) => row.stages_count >= 2))

    return ranked.map((row, index) => ({
      event_id: row.event_id,
      category_id: row.category_id,
      category_name: row.category_name,
      level: row.level,
      competitor_id: row.competitor_id,
      competitor_name: row.competitor_name,
      horse_id: row.horse_id,
      horse_name: row.horse_name,
      stage_1_score: row.stage_1_score,
      stage_2_score: row.stage_2_score,
      stage_3_score: row.stage_3_score,
      total_score: row.total_score,
      position: index + 1,
    }))
  }, [isCumulative, championshipExactQuery.data, categoryName, cumulativeNeedsCategory, championshipCumulativeSourceQuery.data, cumulativeLevel])

  const isLoading = mode === 'stage'
    ? isCumulative
      ? stageRankingCumulativeSourceQuery.isLoading
      : stageRankingExactQuery.isLoading
    : isCumulative
      ? championshipCumulativeSourceQuery.isLoading
      : championshipExactQuery.isLoading

  const exportRows = () => {
    if (mode === 'stage') {
      return stageRows.map((row) => ({
        posicao: row.position,
        competidor: row.competitor_name,
        cavalo: row.horse_name,
        categoria: row.category_name,
        nivel: row.level ?? 'Sem nível',
        etapa: `${row.stage}a etapa`,
        nota_etapa: row.total_score,
        pontos_etapa: row.stage_points ?? 0,
        status: 'Válido',
      }))
    }

    return championshipRows.map((row) => ({
      posicao: row.position,
      competidor: row.competitor_name,
      cavalo: row.horse_name,
      categoria: row.category_name,
      nivel: row.level ?? 'Sem nível',
      pontos_etapa_1: row.stage_1_score,
      pontos_etapa_2: row.stage_2_score,
      pontos_etapa_3: row.stage_3_score,
      total_pontos: row.total_score,
      status: 'Válido',
    }))
  }

  const prizePoolValue = Number(prizePool || 0)
  const pct1 = Number(prizePct1 || 0)
  const pct2 = Number(prizePct2 || 0)
  const pct3 = Number(prizePct3 || 0)
  const prize1 = (prizePoolValue * pct1) / 100
  const prize2 = (prizePoolValue * pct2) / 100
  const prize3 = (prizePoolValue * pct3) / 100

  const podiumGroups = useMemo(() => {
    const rows: PodiumRow[] =
      mode === 'stage'
        ? stageRows.map((row) => ({
            category_name: row.category_name,
            level: row.level,
            competitor_name: row.competitor_name,
            horse_name: row.horse_name,
            total_score: row.total_score,
            position: row.position,
          }))
        : championshipRows.map((row) => ({
            category_name: row.category_name,
            level: row.level,
            competitor_name: row.competitor_name,
            horse_name: row.horse_name,
            total_score: row.total_score,
            position: row.position,
          }))

    const groups = new Map<string, { title: string; rows: PodiumRow[] }>()

    for (const row of rows) {
      const key = `${row.category_name}::${row.level ?? 'SEM_NIVEL'}`
      if (!groups.has(key)) {
        groups.set(key, {
          title: row.level ? `${row.category_name} - ${row.level}` : row.category_name,
          rows: [],
        })
      }
      groups.get(key)!.rows.push(row)
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        rows: [...group.rows].sort((a, b) => a.position - b.position).slice(0, 3),
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
  }, [mode, stageRows, championshipRows])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 md:grid-cols-5">
        <div>
          <Label>Modo</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as RankingMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stage">Etapa</SelectItem>
              <SelectItem value="championship">Resultado Campeonato</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Etapa</Label>
          <Select value={String(stage)} onValueChange={(value) => setStage(Number(value) as Stage)} disabled={mode !== 'stage'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((stageOption) => (
                <SelectItem key={stageOption.value} value={String(stageOption.value)}>
                  {stageOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Categoria</Label>
          <Select
            value={categoryName ?? 'all'}
            onValueChange={(value) => {
              const nextCategoryName = value === 'all' ? undefined : value
              setCategoryName(nextCategoryName)
              if (nextCategoryName && !isLeveledCategoryName(nextCategoryName)) {
                setLevel(null)
                setLevelViewMode('exact')
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categoryOptions.map((categoryOption) => (
                <SelectItem key={categoryOption} value={categoryOption}>
                  {categoryOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tela de nível</Label>
            <Select
              value={levelViewMode}
              disabled={Boolean(categoryName && !selectedCategoryIsLeveled)}
              onValueChange={(value) => {
              const modeValue = value as LevelViewMode
              setLevelViewMode(modeValue)
              if (modeValue === 'cumulative' && (!level || level === null)) {
                setLevel('N1')
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exact">Nível exato</SelectItem>
              <SelectItem value="cumulative">4 telas cumulativas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{isCumulative ? 'Faixa de nível' : 'Nível'}</Label>
          {isCumulative ? (
            <Select
              value={cumulativeLevel}
              onValueChange={(value) => setLevel(value as Level)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((levelOption) => (
                  <SelectItem key={levelOption} value={levelOption}>
                    {cumulativeLabel(levelOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={level === undefined ? 'all' : level === null ? NO_LEVEL_VALUE : level}
              disabled={Boolean(categoryName && !selectedCategoryIsLeveled)}
              onValueChange={(value) => {
                if (value === 'all') {
                  setLevel(undefined)
                  return
                }
                if (value === NO_LEVEL_VALUE) {
                  setLevel(null)
                  return
                }
                setLevel(value as CategoryLevel)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value={NO_LEVEL_VALUE}>Sem nível</SelectItem>
                {LEVEL_OPTIONS.map((levelOption) => (
                  <SelectItem key={levelOption} value={levelOption}>
                    {levelOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {cumulativeNeedsCategory && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Para as 4 telas cumulativas de nível, selecione uma categoria específica (ex.: Aberto ou Amador).
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 md:grid-cols-4">
        <div>
          <Label>Bolsa de premiação (R$)</Label>
          <Input type="number" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} />
        </div>
        <div>
          <Label>% 1º lugar</Label>
          <Input type="number" value={prizePct1} onChange={(e) => setPrizePct1(e.target.value)} />
        </div>
        <div>
          <Label>% 2º lugar</Label>
          <Input type="number" value={prizePct2} onChange={(e) => setPrizePct2(e.target.value)} />
        </div>
        <div>
          <Label>% 3º lugar</Label>
          <Input type="number" value={prizePct3} onChange={(e) => setPrizePct3(e.target.value)} />
        </div>
        <div className="md:col-span-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-md border bg-muted/20 p-2">1º: R$ {prize1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="rounded-md border bg-muted/20 p-2">2º: R$ {prize2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="rounded-md border bg-muted/20 p-2">3º: R$ {prize3.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => downloadExcel(
            mode === 'stage' ? 'ranking-etapa.xlsx' : 'ranking-campeonato.xlsx',
            exportRows(),
            {
              sheetName: mode === 'stage' ? 'Ranking Etapa' : 'Ranking Campeonato',
              headers: mode === 'stage'
                ? ['posicao', 'competidor', 'cavalo', 'categoria', 'nivel', 'etapa', 'nota_etapa', 'pontos_etapa', 'status']
                : ['posicao', 'competidor', 'cavalo', 'categoria', 'nivel', 'pontos_etapa_1', 'pontos_etapa_2', 'pontos_etapa_3', 'total_pontos', 'status'],
            },
          )}
        >
          <Download className="h-4 w-4" />
          Exportar Ranking Excel
        </Button>
      </div>

      {!isLoading && podiumGroups.length > 0 && (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <h3 className="text-lg font-semibold text-primary">Pódio por categoria</h3>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {podiumGroups.map((group) => (
              <div key={group.title} className="rounded-md border bg-muted/20 p-3">
                <p className="mb-2 text-sm font-bold">{group.title}</p>
                <div className="space-y-2">
                  {group.rows.map((row) => (
                    <div key={`${group.title}-${row.position}-${row.competitor_name}-${row.horse_name}`} className="flex items-center justify-between rounded-md border bg-background p-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {row.position}º {row.competitor_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{row.horse_name}</p>
                      </div>
                      <div className="text-sm font-bold text-primary">{row.total_score}</div>
                    </div>
                  ))}
                  {group.rows.length === 0 && <p className="text-xs text-muted-foreground">Sem pódio para esta categoria.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Posicao</TableHead>
              <TableHead>Conjunto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Exibicao</TableHead>
              <TableHead>Etapas / pontos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Carregando ranking...
                </TableCell>
              </TableRow>
            ) : mode === 'stage' ? (
              stageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Nenhum resultado encontrado para os filtros.
                  </TableCell>
                </TableRow>
              ) : (
                stageRows.map((row) => (
                  <TableRow
                    key={`${row.event_id}-${row.category_id}-${row.level ?? 'SEM_NIVEL'}-${row.competitor_id}-${row.horse_id}-${row.stage}`}
                  >
                    <TableCell className="text-2xl font-extrabold text-primary">{row.position}o</TableCell>
                    <TableCell>
                      <p className="font-bold text-foreground">{row.competitor_name}</p>
                      <p className="text-sm text-muted-foreground">{row.horse_name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-foreground">{row.category_name}</p>
                      <div className="mt-1"><LevelBadge level={row.level} /></div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{row.stage}a etapa</Badge></TableCell>
                    <TableCell>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 1</span><strong>{row.stage === 1 ? row.stage_points ?? 0 : '--'}</strong></div>
                        <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 2</span><strong>{row.stage === 2 ? row.stage_points ?? 0 : '--'}</strong></div>
                        <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 3</span><strong>{row.stage === 3 ? row.stage_points ?? 0 : '--'}</strong></div>
                      </div>
                    </TableCell>
                    <TableCell className="text-lg font-extrabold text-foreground">
                      {row.total_score} <span className="text-xs font-semibold text-muted-foreground">({row.stage_points ?? 0} pts)</span>
                    </TableCell>
                    <TableCell>Valido</TableCell>
                  </TableRow>
                ))
              )
            ) : championshipRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Nenhum resultado encontrado para os filtros.
                </TableCell>
              </TableRow>
            ) : (
              championshipRows.map((row) => (
                <TableRow
                  key={`${row.event_id}-${row.category_id}-${row.level ?? 'SEM_NIVEL'}-${row.competitor_id}-${row.horse_id}`}
                >
                  <TableCell className="text-2xl font-extrabold text-primary">{row.position}o</TableCell>
                  <TableCell>
                    <p className="font-bold text-foreground">{row.competitor_name}</p>
                    <p className="text-sm text-muted-foreground">{row.horse_name}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-foreground">{row.category_name}</p>
                    <div className="mt-1"><LevelBadge level={row.level} /></div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">Campeonato</Badge></TableCell>
                  <TableCell>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 1</span><strong>{row.stage_1_score}</strong></div>
                      <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 2</span><strong>{row.stage_2_score}</strong></div>
                      <div className="rounded-md border bg-muted/30 p-2"><span className="block text-muted-foreground">Et. 3</span><strong>{row.stage_3_score}</strong></div>
                    </div>
                  </TableCell>
                  <TableCell className="text-lg font-extrabold text-foreground">{row.total_score}</TableCell>
                  <TableCell>Valido</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

