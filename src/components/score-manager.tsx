import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { CategoryLevel, EntryRecord, EventStatus, ScoreRecord, Stage } from '@/types/domain'
import { LEVEL_OPTIONS, NO_LEVEL_VALUE, STAGE_OPTIONS, categoryLabel } from '@/lib/constants'
import { downloadExcel } from '@/lib/spreadsheet'
import { deleteScore, getCategories, getEntries, getScores, saveScore } from '@/services/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LevelBadge } from '@/components/level-badge'

interface ScoreManagerProps {
  eventId: string
  eventStatus: EventStatus
  currentUserId: string
  isAdmin: boolean
  isJudge: boolean
}

interface ScoreForm {
  id?: string
  entry_id: string
  stage: Stage
  score: string
  penalties: string
  notes: string
}

const defaultForm: ScoreForm = {
  entry_id: '',
  stage: 1,
  score: '',
  penalties: '0',
  notes: '',
}

export function ScoreManager({ eventId, eventStatus, currentUserId, isAdmin, isJudge }: ScoreManagerProps) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterStage, setFilterStage] = useState<Stage | undefined>()
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>()
  const [filterLevel, setFilterLevel] = useState<CategoryLevel | undefined>()
  const [filterCompetitorId, setFilterCompetitorId] = useState<string | undefined>()
  const [filterEntryStatus, setFilterEntryStatus] = useState<EntryRecord['status'] | undefined>()
  const [form, setForm] = useState<ScoreForm>(defaultForm)

  const canJudgeWrite = isAdmin || (isJudge && eventStatus === 'active')

  const categoriesQuery = useQuery({ queryKey: ['categories', eventId], queryFn: () => getCategories(eventId) })

  const entriesQuery = useQuery({
    queryKey: ['entries', eventId, 'score-form'],
    queryFn: () => getEntries(eventId),
  })

  const scoresQuery = useQuery({
    queryKey: ['scores', eventId, filterStage, filterCategoryId, filterLevel, filterCompetitorId],
    queryFn: () =>
      getScores(eventId, {
        stage: filterStage,
        categoryId: filterCategoryId,
        level: filterLevel,
        competitorId: filterCompetitorId,
      }),
    refetchInterval: 3000,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!canJudgeWrite) {
        throw new Error('Lançamento de nota bloqueado para este evento ou perfil.')
      }

      if (!form.entry_id || form.score === '') {
        throw new Error('Inscrição e nota são obrigatórias.')
      }

      const selectedEntry = (entriesQuery.data ?? []).find((entry) => entry.id === form.entry_id)
      if (!selectedEntry) {
        throw new Error('Selecione uma inscrição válida.')
      }

      return saveScore({
        id: form.id,
        event_id: eventId,
        entry_id: form.entry_id,
        judge_id: currentUserId,
        stage: selectedEntry.stage,
        score: Number(form.score),
        penalties: Number(form.penalties || 0),
        notes: form.notes,
      })
    },
    onSuccess: () => {
      toast.success('Nota salva com sucesso.')
      setDialogOpen(false)
      setForm(defaultForm)
      void queryClient.invalidateQueries({ queryKey: ['scores', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar nota')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteScore,
    onSuccess: () => {
      toast.success('Nota removida.')
      void queryClient.invalidateQueries({ queryKey: ['scores', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover nota')
    },
  })

  const rows = useMemo(() => {
    const list = (scoresQuery.data ?? [])
      .filter((item) => (filterEntryStatus ? item.entry?.status === filterEntryStatus : true))
      .sort((a, b) => {
        const aOrder = a.entry?.draw_order ?? 9999
        const bOrder = b.entry?.draw_order ?? 9999
        if (aOrder !== bOrder) return aOrder - bOrder
        return (a.entry?.competitor?.name ?? '').localeCompare(b.entry?.competitor?.name ?? '', 'pt-BR')
      })

    return list
  }, [filterEntryStatus, scoresQuery.data])

  const competitorOptions = useMemo(() => {
    const map = new Map<string, string>()

    for (const entry of entriesQuery.data ?? []) {
      if (entry.competitor_id && entry.competitor?.name) {
        map.set(entry.competitor_id, entry.competitor.name)
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [entriesQuery.data])

  const openEdit = (score: ScoreRecord) => {
    setForm({
      id: score.id,
      entry_id: score.entry_id,
      stage: score.stage,
      score: String(score.score),
      penalties: String(score.penalties),
      notes: score.notes ?? '',
    })
    setDialogOpen(true)
  }

  const canEditScore = (score: ScoreRecord) => {
    if (isAdmin) return true
    return isJudge && score.judge_id === currentUserId && eventStatus === 'active'
  }

  const selectedEntry = (entriesQuery.data ?? []).find((entry) => entry.id === form.entry_id)

  return (
    <div className="space-y-4">
      {!canJudgeWrite && isJudge && (
        <Alert variant="destructive">
          <AlertTitle>Evento não está ativo</AlertTitle>
          <AlertDescription>Juízes só podem lançar e editar as próprias notas em eventos ativos.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 md:grid-cols-5">
        <div>
          <Label>Etapa</Label>
          <Select
            value={filterStage ? String(filterStage) : 'all'}
            onValueChange={(value) => setFilterStage(value === 'all' ? undefined : (Number(value) as Stage))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
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
          <Label>Nível</Label>
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
          <Label>Competidor</Label>
          <Select value={filterCompetitorId ?? 'all'} onValueChange={(value) => setFilterCompetitorId(value === 'all' ? undefined : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {competitorOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Status da inscrição</Label>
          <Select
            value={filterEntryStatus ?? 'all'}
            onValueChange={(value) => setFilterEntryStatus(value === 'all' ? undefined : (value as EntryRecord['status']))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="registered">Inscrito</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="finished">Finalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() =>
            downloadExcel(
              'notas.xlsx',
              rows.map((row) => ({
                competidor: row.entry?.competitor?.name ?? '',
                cavalo: row.entry?.horse?.name ?? '',
                categoria: row.entry?.category?.name ?? '',
                nivel: row.entry?.level ?? '',
                etapa: row.stage,
                nota: row.score,
                penalidades: row.penalties,
                final: row.final_score,
                juiz: row.judge?.name ?? row.judge?.email ?? '',
                status: row.entry?.status ?? '',
              })),
              {
                sheetName: 'Notas',
                headers: [
                  'competidor',
                  'cavalo',
                  'categoria',
                  'nivel',
                  'etapa',
                  'nota',
                  'penalidades',
                  'final',
                  'juiz',
                  'status',
                ],
              },
            )
          }
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>

        <Dialog
          open={dialogOpen}
          onOpenChange={(value) => {
            setDialogOpen(value)
            if (!value) setForm(defaultForm)
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!canJudgeWrite}>
              <Plus className="h-4 w-4" />
              Lançar nota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Editar nota' : 'Nova nota'}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label>Inscrição *</Label>
                <Select
                  value={form.entry_id || undefined}
                  onValueChange={(value) => {
                    const selected = (entriesQuery.data ?? []).find((entry) => entry.id === value)
                    setForm((prev) => ({
                      ...prev,
                      entry_id: value,
                      stage: selected?.stage ?? prev.stage,
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma inscrição" />
                  </SelectTrigger>
                  <SelectContent>
                    {(entriesQuery.data ?? []).map((entry: EntryRecord) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.stage}a - {entry.competitor?.name ?? '--'} / {entry.horse?.name ?? '--'} ({entry.level ?? 'Sem nível'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1 rounded-md border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                Etapa da inscrição: <span className="font-semibold text-foreground">{selectedEntry?.stage ?? '--'}a etapa</span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label>Nota *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.score}
                    onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Penalidades</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.penalties}
                    onChange={(e) => setForm((prev) => ({ ...prev, penalties: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canJudgeWrite}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar nota'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordem</TableHead>
              <TableHead>Competidor</TableHead>
              <TableHead>Cavalo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Juiz</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-muted-foreground">
                  Nenhuma nota lançada.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((score) => (
                <TableRow key={score.id}>
                  <TableCell>{score.entry?.draw_order ?? '--'}</TableCell>
                  <TableCell>{score.entry?.competitor?.name ?? '--'}</TableCell>
                  <TableCell>{score.entry?.horse?.name ?? '--'}</TableCell>
                  <TableCell>{score.entry?.category?.name ?? '--'}</TableCell>
                  <TableCell>
                    <LevelBadge level={score.entry?.level ?? null} />
                  </TableCell>
                  <TableCell>{score.stage}a</TableCell>
                  <TableCell>
                    {score.score} - {score.penalties} = <strong>{score.final_score}</strong>
                  </TableCell>
                  <TableCell>{score.judge?.name ?? score.judge?.email ?? '--'}</TableCell>
                  <TableCell>{score.entry?.status ?? '--'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(score)} disabled={!canEditScore(score)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteMutation.mutate(score.id)}
                        disabled={!isAdmin}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

