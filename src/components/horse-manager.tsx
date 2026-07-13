import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { downloadExcel } from '@/lib/spreadsheet'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { SuggestionInput } from '@/components/ui/suggestion-input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deleteHorse, getHorses, saveHorse } from '@/services/api'
import type { HorseRecord } from '@/types/domain'

interface HorseManagerProps {
  canEdit: boolean
}

interface HorseForm {
  id?: string
  name: string
  registration: string
  owner: string
  notes: string
}

const defaultForm: HorseForm = {
  name: '',
  registration: '',
  owner: '',
  notes: '',
}

export function HorseManager({ canEdit }: HorseManagerProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<HorseForm>(defaultForm)

  const horsesQuery = useQuery({
    queryKey: ['horses', search],
    queryFn: () => getHorses(search),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) {
        throw new Error('Nome do cavalo é obrigatório.')
      }

      return saveHorse({
        id: form.id,
        name: form.name,
        registration: form.registration,
        owner: form.owner,
        notes: form.notes,
      })
    },
    onSuccess: () => {
      toast.success('Cavalo salvo com sucesso.')
      setDialogOpen(false)
      setForm(defaultForm)
      void queryClient.invalidateQueries({ queryKey: ['horses'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar cavalo')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHorse,
    onSuccess: () => {
      toast.success('Cavalo removido.')
      void queryClient.invalidateQueries({ queryKey: ['horses'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover cavalo')
    },
  })

  const rows = useMemo(() => horsesQuery.data ?? [], [horsesQuery.data])
  const ownerOptions = useMemo(
    () => Array.from(new Set(rows.map((item) => item.owner?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((value) => ({ value })),
    [rows],
  )

  const openEdit = (horse: HorseRecord) => {
    setForm({
      id: horse.id,
      name: horse.name,
      registration: horse.registration ?? '',
      owner: horse.owner ?? '',
      notes: horse.notes ?? '',
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Alert>
          <AlertTitle>Modo somente leitura</AlertTitle>
          <AlertDescription>
            Apenas administradores podem criar, editar ou excluir cavalos.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <Label>Buscar por nome</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Digite o nome do cavalo" />
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            downloadExcel(
              'cavalos.xlsx',
              rows.map((row) => ({
                nome: row.name,
                registro: row.registration ?? '',
                proprietario: row.owner ?? '',
                observacoes: row.notes ?? '',
              })),
              {
                sheetName: 'Cavalos',
                headers: ['nome', 'registro', 'proprietario', 'observacoes'],
              },
            )
          }
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>

        {canEdit && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(value) => {
              setDialogOpen(value)
              if (!value) setForm(defaultForm)
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => setForm(defaultForm)}>
                <Plus className="h-4 w-4" />
                Novo cavalo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form.id ? 'Editar cavalo' : 'Novo cavalo'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>Registro</Label>
                  <Input value={form.registration} onChange={(e) => setForm((prev) => ({ ...prev, registration: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label>Proprietário</Label>
                  <SuggestionInput
                    options={ownerOptions}
                    value={form.owner}
                    onChange={(e) => setForm((prev) => ({ ...prev, owner: e.target.value }))}
                    placeholder="Digite ou escolha um proprietário"
                  />
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
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
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
              <TableHead>Nome</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Proprietário</TableHead>
              {canEdit && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 4 : 3} className="text-muted-foreground">
                  Nenhum cavalo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((horse) => (
                <TableRow key={horse.id}>
                  <TableCell className="font-medium">{horse.name}</TableCell>
                  <TableCell>{horse.registration || '--'}</TableCell>
                  <TableCell>{horse.owner || '--'}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(horse)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(horse.id)}>
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

