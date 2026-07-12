import { FilePenLine, Newspaper, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { deleteNewsPost, getAdminEvents, getAdminNews, saveNewsPost } from '@/services/api'
import type { NewsPostRecord, NewsPostStatus, NewsPostType } from '@/types/domain'

interface ContentForm {
  id?: string
  event_id: string
  title: string
  summary: string
  content: string
  post_type: NewsPostType
  status: NewsPostStatus
  featured: boolean
}

const defaultForm: ContentForm = {
  event_id: '',
  title: '',
  summary: '',
  content: '',
  post_type: 'news',
  status: 'draft',
  featured: false,
}

export function ContentManager() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<ContentForm>(defaultForm)

  const postsQuery = useQuery({ queryKey: ['admin-news'], queryFn: getAdminNews })
  const eventsQuery = useQuery({ queryKey: ['admin-events'], queryFn: getAdminEvents })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.title.trim() || !form.content.trim()) {
        throw new Error('Título e conteúdo são obrigatórios.')
      }
      return saveNewsPost(form)
    },
    onSuccess: () => {
      toast.success('Publicação salva.')
      setDialogOpen(false)
      setForm(defaultForm)
      void queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      void queryClient.invalidateQueries({ queryKey: ['public-news'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao salvar publicação'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNewsPost,
    onSuccess: () => {
      toast.success('Publicação removida.')
      void queryClient.invalidateQueries({ queryKey: ['admin-news'] })
      void queryClient.invalidateQueries({ queryKey: ['public-news'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao remover publicação'),
  })

  const openEdit = (post: NewsPostRecord) => {
    setForm({
      id: post.id,
      event_id: post.event_id ?? '',
      title: post.title,
      summary: post.summary ?? '',
      content: post.content,
      post_type: post.post_type,
      status: post.status,
      featured: post.featured,
    })
    setDialogOpen(true)
  }

  const posts = postsQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Notícias e publicações</h2>
          <p className="text-sm text-muted-foreground">Conteúdo publicado aparece na página inicial e no evento vinculado.</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setForm(defaultForm)
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => setForm(defaultForm)}>
              <Plus className="h-4 w-4" />
              Nova publicação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Editar publicação' : 'Nova publicação'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.post_type} onValueChange={(value) => setForm((prev) => ({ ...prev, post_type: value as NewsPostType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">Notícia geral</SelectItem>
                      <SelectItem value="event_update">Publicação de evento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Evento vinculado</Label>
                  <Select value={form.event_id || 'none'} onValueChange={(value) => setForm((prev) => ({ ...prev, event_id: value === 'none' ? '' : value }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {(eventsQuery.data ?? []).map((event) => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="post-title">Título *</Label>
                <Input id="post-title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="post-summary">Resumo</Label>
                <Textarea id="post-summary" rows={2} value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="post-content">Conteúdo *</Label>
                <Textarea id="post-content" rows={8} value={form.content} onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as NewsPostStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
                  <input type="checkbox" checked={form.featured} onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))} />
                  Destacar na página inicial
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : 'Salvar publicação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(postsQuery.error || eventsQuery.error) && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar as publicações</AlertTitle>
          <AlertDescription>
            {(postsQuery.error ?? eventsQuery.error) instanceof Error
              ? (postsQuery.error ?? eventsQuery.error)?.message
              : 'Tente novamente.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {postsQuery.isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">Carregando publicações...</TableCell></TableRow>
            ) : posts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhuma publicação cadastrada.</TableCell></TableRow>
            ) : posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-semibold">{post.title}</TableCell>
                <TableCell>{post.post_type === 'news' ? <Newspaper className="h-4 w-4" /> : <FilePenLine className="h-4 w-4" />}</TableCell>
                <TableCell>{post.event?.name ?? '--'}</TableCell>
                <TableCell><Badge variant={post.status === 'published' ? 'default' : 'outline'}>{post.status === 'published' ? 'Publicado' : 'Rascunho'}</Badge></TableCell>
                <TableCell>{new Date(post.published_at ?? post.created_at).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="outline" onClick={() => openEdit(post)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="destructive" onClick={() => deleteMutation.mutate(post.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
