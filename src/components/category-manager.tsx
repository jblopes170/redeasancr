import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { CategoryLevel, CategoryRecord, Level } from '@/types/domain'
import { LEVEL_OPTIONS, NTMR_CATEGORY_PRESETS } from '@/lib/constants'
import { deleteCategory, getCategories, saveCategory } from '@/services/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LevelBadge } from '@/components/level-badge'

interface CategoryManagerProps {
  eventId: string
  canEdit: boolean
}

interface CategoryFormState {
  id?: string
  name: string
  levelMode: 'without_level' | 'with_level'
  level: Level
  active: boolean
  display_order: string
  entry_fee: string
}

const defaultForm: CategoryFormState = {
  name: '',
  levelMode: 'without_level',
  level: 'N1',
  active: true,
  display_order: '0',
  entry_fee: '0',
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : 0
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CategoryManager({ eventId, canEdit }: CategoryManagerProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CategoryFormState>(defaultForm)

  const categoriesQuery = useQuery({
    queryKey: ['categories', eventId],
    queryFn: () => getCategories(eventId),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) {
        throw new Error('Nome da categoria e obrigatorio.')
      }

      const levelToSave: CategoryLevel = form.levelMode === 'with_level' ? form.level : null

      return saveCategory({
        id: form.id,
        event_id: eventId,
        name: form.name,
        level: levelToSave,
        active: form.active,
        display_order: Number(form.display_order || 0),
        entry_fee: parseMoney(form.entry_fee),
      })
    },
    onSuccess: () => {
      toast.success('Categoria salva com sucesso.')
      setForm(defaultForm)
      void queryClient.invalidateQueries({ queryKey: ['categories', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar categoria')
    },
  })

  const seedMutation = useMutation({
    mutationFn: async () => {
      let order = 1
      for (const preset of NTMR_CATEGORY_PRESETS) {
        if (preset.leveled) {
          for (const level of LEVEL_OPTIONS) {
            try {
              await saveCategory({
                event_id: eventId,
                name: preset.name,
                level,
                active: true,
                display_order: order,
                entry_fee: 0,
              })
            } catch (error) {
              if (!(error instanceof Error) || !error.message.toLowerCase().includes('duplicado')) {
                throw error
              }
            }
            order += 1
          }
          continue
        }

        try {
          await saveCategory({
            event_id: eventId,
            name: preset.name,
            level: null,
            active: true,
            display_order: order,
            entry_fee: 0,
          })
        } catch (error) {
          if (!(error instanceof Error) || !error.message.toLowerCase().includes('duplicado')) {
            throw error
          }
        }
        order += 1
      }
    },
    onSuccess: () => {
      toast.success('Categorias oficiais carregadas com sucesso.')
      void queryClient.invalidateQueries({ queryKey: ['categories', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar categorias oficiais')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Categoria removida com sucesso.')
      void queryClient.invalidateQueries({ queryKey: ['categories', eventId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover categoria')
    },
  })

  const grouped = useMemo(() => {
    const data = categoriesQuery.data ?? []

    return {
      withoutLevel: data.filter((item) => item.level === null),
      N1: data.filter((item) => item.level === 'N1'),
      N2: data.filter((item) => item.level === 'N2'),
      N3: data.filter((item) => item.level === 'N3'),
      N4: data.filter((item) => item.level === 'N4'),
    }
  }, [categoriesQuery.data])

  const openEdit = (category: CategoryRecord) => {
    setForm({
      id: category.id,
      name: category.name,
      levelMode: category.level ? 'with_level' : 'without_level',
      level: category.level ?? 'N1',
      active: category.active,
      display_order: String(category.display_order),
      entry_fee: String(category.entry_fee ?? 0).replace('.', ','),
    })
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Alert>
          <AlertTitle>Modo somente leitura</AlertTitle>
          <AlertDescription>Apenas administradores podem criar ou editar categorias.</AlertDescription>
        </Alert>
      )}

      {canEdit && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">Cadastrar categoria</h3>
              <p className="text-sm text-muted-foreground">
                Apenas Aberto, Amador e Futurity usam níveis N1, N2, N3 e N4.
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Sparkles className="h-4 w-4" />
              Carregar categorias oficiais NTMR
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label>Nome da categoria</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex.: Amador Principiante, Aberto, Futurity"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.levelMode}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, levelMode: value as CategoryFormState['levelMode'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="without_level">Sem nível</SelectItem>
                  <SelectItem value="with_level">Com nível (N1-N4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((prev) => ({ ...prev, display_order: e.target.value }))}
              />
            </div>
            <div>
              <Label>Valor inscricao (R$)</Label>
              <Input
                inputMode="decimal"
                value={form.entry_fee}
                onChange={(e) => setForm((prev) => ({ ...prev, entry_fee: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          {form.levelMode === 'with_level' && (
            <div className="mt-3 max-w-sm">
              <Label>Nível</Label>
              <Select value={form.level} onValueChange={(value) => setForm((prev) => ({ ...prev, level: value as Level }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {form.id ? 'Salvar edição' : 'Adicionar categoria'}
            </Button>
            {form.id && (
              <Button variant="outline" onClick={() => setForm(defaultForm)}>
                Cancelar edição
              </Button>
            )}
            <Button
              variant={form.active ? 'default' : 'secondary'}
              onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
            >
              {form.active ? 'Ativa: sim' : 'Ativa: não'}
            </Button>
          </div>
        </div>
      )}

      <CategoryTableSection
        title="Categorias sem nível"
        rows={grouped.withoutLevel}
        canEdit={canEdit}
        onEdit={openEdit}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      {LEVEL_OPTIONS.map((level) => (
        <CategoryTableSection
          key={level}
          title={`Categorias ${level}`}
          rows={grouped[level]}
          canEdit={canEdit}
          onEdit={openEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      ))}
    </div>
  )
}

interface CategoryTableSectionProps {
  title: string
  rows: CategoryRecord[]
  canEdit: boolean
  onEdit: (category: CategoryRecord) => void
  onDelete: (categoryId: string) => void
}

function CategoryTableSection({ title, rows, canEdit, onEdit, onDelete }: CategoryTableSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-base font-semibold">{title}</h4>
        <Badge variant="outline">{rows.length} categoria(s)</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead>Nível</TableHead>
            <TableHead>Ativa</TableHead>
            <TableHead>Ordem</TableHead>
            <TableHead>Valor</TableHead>
            {canEdit && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canEdit ? 6 : 5} className="text-muted-foreground">
                Nenhuma categoria cadastrada nesta seção.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>
                  <LevelBadge level={category.level} />
                </TableCell>
                <TableCell>{category.active ? 'Sim' : 'Não'}</TableCell>
                <TableCell>{category.display_order}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(category.entry_fee ?? 0)}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => onEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => onDelete(category.id)}>
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
  )
}
