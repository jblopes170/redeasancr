import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { CategoryLevel, EntryRecord, Stage } from '@/types/domain'
import { LEVEL_OPTIONS, NO_LEVEL_VALUE, categoryLabel } from '@/lib/constants'
import { downloadCsv } from '@/lib/csv'
import { deleteEntry, getCategories, getCompetitors, getEntries, getHorses, saveEntry } from '@/services/api'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LevelBadge } from '@/components/level-badge'
import { StageSelect } from '@/components/stage-select'
import { StatusBadge } from '@/components/status-badge'

interface EntryManagerProps {
  eventId: string
  canEdit: boolean
}

interface EntryFormState {
  id?: string
  competitor_id: string
  horse_id: string
  category_id: string
  stage: Stage
  entry_number: string
  draw_order: string
  status: EntryRecord['status']
}

const defaultForm: EntryFormState = {
  competitor_id: '',
  horse_id: '',
  category_id: '',
  stage: 1,
  entry_number: '',
  draw_order: '',
  status: 'registered',
}

export function EntryManager({ eventId, canEdit }: EntryManagerProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<Stage | undefined>()
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>()
  const [filterLevel, setFilterLevel] = useState<CategoryLevel | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<EntryFormState>(defaultForm)
  const [registerAllStages, setRegisterAllStages] = useState(true)
  const [selectedStages, setSelectedStages] = useState<Record<Stage, boolean>>({
    1: true,
    2: true,
    3: true,
  })

  const competitorsQuery = useQuery({ queryKey: ['competitors', 'entries', search], queryFn: () => getCompetitors(search) })
  const horsesQuery = useQuery({ queryKey: ['horses', 'entries'], queryFn: () => getHorses('') })
  const categoriesQuery = useQuery({ queryKey: ['categories', eventId], queryFn: () => getCategories(eventId) })

  const entriesQuery = useQuery({
    queryKey: ['entries', eventId, filterStage, filterCategoryId, filterLevel],
    queryFn: () =>
      getEntries(eventId, {
        stage: filterStage,
        categoryId: filterCategoryId,
        level: filterLevel,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const category = (categoriesQuery.data ?? []).find((item) => item.id === form.category_id)

      if (!form.competitor_id || !form.horse_id || !category || !form.stage) {
        throw new Error('Preencha competidor, cavalo, categoria e etapa.')
      }

      if (form.id) {
        await saveEntry({
          id: form.id,
          event_id: eventId,
          competitor_id: form.competitor_id,
          horse_id: form.horse_id,
          category_id: form.category_id,
          level: category.level,
          stage: form.stage,
          entry_number: form.entry_number,
          draw_order: form.draw_order ? Number(form.draw_order) : undefined,
          status: form.status,
        })

        return { created: 1, errors: [] as string[] }
      }

      const stagesToCreate: Stage[] = registerAllStages
        ? ([1, 2, 3] as Stage[]).filter((stage) => selectedStages[stage])
        : [form.stage]

      if (stagesToCreate.length === 0) {
        throw new Error('Selecione ao menos uma etapa para inscrição.')
      }

      const errors: string[] = []
      let created = 0

      for (const stage of stagesToCreate) {
        try {
          await saveEntry({
            event_id: eventId,
            competitor_id: form.competitor_id,
            horse_id: form.horse_id,
            category_id: form.category_id,
            level: category.level,
            stage,
            entry_number: form.entry_number,
            draw_order: form.draw_order ? Number(form.draw_order) : undefined,
            status: form.status,
          })
          created += 1
        } catch (error) {
          errors.push(
            `Etapa ${stage}: ${error instanceof Error ? error.message : 'erro ao salvar inscrição'}`,
          )
        }
      }

      if (created === 0) {
        throw new Error(errors.join(' | '))
      }

      return { created, errors }
    },
    onSuccess: (result) => {
      const label = result.created === 1 ? 'Inscrição salva com sucesso.' : `${result.created} inscrições salvas com sucesso.`
      toast.success(label)
      if (result.errors.length > 0) {
        toast.warning(result.errors.join(' | '))
      }
      setDialogOpen(false)
      setForm(defaultForm)
      setRegisterAllStages(true)
      setSelectedStages({ 1: true, 2: true, 3: true })
      void queryClient.invalidateQueries({ queryKey: ['entries', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar inscrição')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      toast.success('Inscrição removida.')
      void queryClient.invalidateQueries({ queryKey: ['entries', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover inscrição')
    },
  })

  const rows = useMemo(() => {
    const list = entriesQuery.data ?? []
    const normalized = search.trim().toLowerCase()

    if (!normalized) return list

    return list.filter((item) => {
      const competitorName = item.competitor?.name?.toLowerCase() ?? ''
      const horseName = item.horse?.name?.toLowerCase() ?? ''
      return competitorName.includes(normalized) || horseName.includes(normalized)
    })
  }, [entriesQuery.data, search])

  const openEdit = (entry: EntryRecord) => {
    setForm({
      id: entry.id,
      competitor_id: entry.competitor_id,
      horse_id: entry.horse_id,
      category_id: entry.category_id,
      stage: entry.stage,
      entry_number: entry.entry_number ?? '',
      draw_order: entry.draw_order ? String(entry.draw_order) : '',
      status: entry.status,
    })
    setRegisterAllStages(false)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Alert>
          <AlertTitle>Modo somente leitura</AlertTitle>
          <AlertDescription>Apenas administradores podem criar ou editar inscricoes.</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-3 md:grid-cols-4">
        <div>
          <Label>Etapa</Label>
          <StageSelect value={filterStage} onChange={setFilterStage} placeholder="Todas as etapas" />
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
              <SelectValue placeholder="Todos os níveis" />
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
          <Label>Categoria</Label>
          <Select
            value={filterCategoryId ?? 'all'}
            onValueChange={(value) => setFilterCategoryId(value === 'all' ? undefined : value)}
          >
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
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setFilterStage(undefined)
              setFilterCategoryId(undefined)
              setFilterLevel(undefined)
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar competidor ou cavalo"
          />
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={() =>
            downloadCsv(
              'inscricoes.csv',
              rows.map((row) => ({
                competidor_nome: row.competitor?.name ?? '',
                cavalo_nome: row.horse?.name ?? '',
                categoria_nome: row.category?.name ?? '',
                nivel: row.level ?? '',
                etapa: row.stage,
                numero_entrada: row.entry_number ?? '',
                ordem_apresentacao: row.draw_order ?? '',
                status: row.status,
              })),
            )
          }
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>

        {canEdit && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(value) => {
              setDialogOpen(value)
              if (!value) {
                setForm(defaultForm)
                setRegisterAllStages(true)
                setSelectedStages({ 1: true, 2: true, 3: true })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="gap-2"
                onClick={() => {
                  setForm(defaultForm)
                  setRegisterAllStages(true)
                  setSelectedStages({ 1: true, 2: true, 3: true })
                }}
              >
                <Plus className="h-4 w-4" />
                Nova inscrição
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? 'Editar inscrição' : 'Nova inscrição'}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3">
                {!form.id && (
                  <div className="grid gap-2 rounded-md border border-border/70 bg-muted/20 p-3">
                    <Label className="text-sm font-semibold text-foreground">Inscrição de campeonato</Label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={registerAllStages}
                        onChange={(e) => setRegisterAllStages(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Cadastrar competidor + cavalo em múltiplas etapas no mesmo lançamento.
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

                <div className="grid gap-1">
                  <Label>Competidor *</Label>
                  <Select
                    value={form.competitor_id || undefined}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, competitor_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(competitorsQuery.data ?? []).map((competitor) => (
                        <SelectItem key={competitor.id} value={competitor.id}>
                          {competitor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label>Cavalo *</Label>
                  <Select
                    value={form.horse_id || undefined}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, horse_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(horsesQuery.data ?? []).map((horse) => (
                        <SelectItem key={horse.id} value={horse.id}>
                          {horse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label>Categoria *</Label>
                  <Select
                    value={form.category_id || undefined}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categoriesQuery.data ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {categoryLabel(category.name, category.level)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1 rounded-md border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                  Nível da inscrição: <span className="font-semibold text-foreground">{(() => {
                    const selected = (categoriesQuery.data ?? []).find((item) => item.id === form.category_id)
                    return selected?.level ?? 'Sem nível'
                  })()}</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label>Etapa *</Label>
                    <Select
                      value={String(form.stage)}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, stage: Number(value) as Stage }))}
                      disabled={!form.id && registerAllStages}
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
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="grid gap-1">
                    <Label>Número de entrada</Label>
                    <Input
                      value={form.entry_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, entry_number: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Ordem de apresentação</Label>
                    <Input value={form.draw_order} onChange={(e) => setForm((prev) => ({ ...prev, draw_order: e.target.value }))} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as EntryRecord['status'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registered">Inscrito</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                        <SelectItem value="finished">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar inscrição'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
              <TableHead>Status</TableHead>
              {canEdit && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 7} className="text-muted-foreground">
                  Nenhuma inscrição encontrada.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.draw_order ?? '--'}</TableCell>
                  <TableCell>{entry.competitor?.name ?? '--'}</TableCell>
                  <TableCell>{entry.horse?.name ?? '--'}</TableCell>
                  <TableCell>{entry.category?.name ?? '--'}</TableCell>
                  <TableCell>
                    <LevelBadge level={entry.level} />
                  </TableCell>
                  <TableCell>{entry.stage}a etapa</TableCell>
                  <TableCell>
                    <StatusBadge status={entry.status} type="entry" />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(entry.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
