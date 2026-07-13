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
import { BRAZILIAN_UF_OPTIONS } from '@/lib/constants'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deleteCompetitor, getCompetitors, saveCompetitor } from '@/services/api'
import type { CompetitorRecord } from '@/types/domain'

interface CompetitorManagerProps {
  canEdit: boolean
}

interface CompetitorForm {
  id?: string
  name: string
  document: string
  phone: string
  email: string
  city: string
  uf: string
  notes: string
}

const defaultForm: CompetitorForm = {
  name: '',
  document: '',
  phone: '',
  email: '',
  city: '',
  uf: '',
  notes: '',
}

export function CompetitorManager({ canEdit }: CompetitorManagerProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CompetitorForm>(defaultForm)

  const competitorsQuery = useQuery({
    queryKey: ['competitors', search],
    queryFn: () => getCompetitors(search),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.name.trim()) {
        throw new Error('Nome do competidor é obrigatório.')
      }

      return saveCompetitor({
        id: form.id,
        name: form.name,
        document: form.document,
        phone: form.phone,
        email: form.email,
        city: form.city,
        uf: form.uf,
        notes: form.notes,
      })
    },
    onSuccess: () => {
      toast.success('Competidor salvo com sucesso.')
      setDialogOpen(false)
      setForm(defaultForm)
      void queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar competidor')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCompetitor,
    onSuccess: () => {
      toast.success('Competidor removido.')
      void queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover competidor')
    },
  })

  const rows = useMemo(() => competitorsQuery.data ?? [], [competitorsQuery.data])
  const cityOptions = useMemo(
    () => Array.from(new Set(rows.map((item) => item.city?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((value) => ({ value })),
    [rows],
  )

  const openEdit = (competitor: CompetitorRecord) => {
    setForm({
      id: competitor.id,
      name: competitor.name,
      document: competitor.document ?? '',
      phone: competitor.phone ?? '',
      email: competitor.email ?? '',
      city: competitor.city ?? '',
      uf: competitor.uf ?? '',
      notes: competitor.notes ?? '',
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Alert>
          <AlertTitle>Modo somente leitura</AlertTitle>
          <AlertDescription>
            Apenas administradores podem criar, editar ou excluir competidores.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[240px] flex-1">
          <Label>Buscar por nome</Label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite o nome do competidor"
            />
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            downloadExcel(
              'competidores.xlsx',
              rows.map((row) => ({
                nome: row.name,
                documento: row.document ?? '',
                telefone: row.phone ?? '',
                email: row.email ?? '',
                cidade: row.city ?? '',
                uf: row.uf ?? '',
                observacoes: row.notes ?? '',
              })),
              {
                sheetName: 'Competidores',
                headers: ['nome', 'documento', 'telefone', 'email', 'cidade', 'uf', 'observacoes'],
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
                Novo competidor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{form.id ? 'Editar competidor' : 'Novo competidor'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label>Documento</Label>
                    <Input value={form.document} onChange={(e) => setForm((prev) => ({ ...prev, document: e.target.value }))} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Cidade</Label>
                    <SuggestionInput
                      options={cityOptions}
                      value={form.city}
                      onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Digite ou escolha uma cidade"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label>UF</Label>
                    <SuggestionInput
                      options={BRAZILIAN_UF_OPTIONS.map((value) => ({ value }))}
                      maxLength={2}
                      className="uppercase"
                      value={form.uf}
                      onChange={(e) => setForm((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                      placeholder="Ex.: MG"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Observações</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </div>
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
              <TableHead>Documento</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>UF</TableHead>
              {canEdit && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-muted-foreground">
                  Nenhum competidor encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell className="font-medium">{competitor.name}</TableCell>
                  <TableCell>{competitor.document || '--'}</TableCell>
                  <TableCell>{competitor.phone || '--'}</TableCell>
                  <TableCell>{competitor.email || '--'}</TableCell>
                  <TableCell>{competitor.city || '--'}</TableCell>
                  <TableCell>{competitor.uf || '--'}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(competitor)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteMutation.mutate(competitor.id)}
                          disabled={deleteMutation.isPending}
                        >
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

