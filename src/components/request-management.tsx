import { Check, MessageSquareReply, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { categoryOptionLabel } from '@/lib/constants'
import {
  approveRegistrationRequest,
  deleteRegistrationRequest,
  deleteSuggestion,
  getAdminRegistrationRequests,
  getAdminSuggestions,
  respondSuggestion,
  updateRegistrationRequestStatus,
} from '@/services/api'
import type { RegistrationRequestStatus, SuggestionRecord } from '@/types/domain'

const REQUEST_LABEL: Record<RegistrationRequestStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
}

export function RequestManagement() {
  const queryClient = useQueryClient()
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionRecord | null>(null)
  const [response, setResponse] = useState('')

  const requestsQuery = useQuery({ queryKey: ['admin-registration-requests'], queryFn: () => getAdminRegistrationRequests() })
  const suggestionsQuery = useQuery({ queryKey: ['admin-suggestions'], queryFn: () => getAdminSuggestions() })

  const approveMutation = useMutation({
    mutationFn: approveRegistrationRequest,
    onSuccess: () => {
      toast.success('Inscrição aprovada e adicionada ao evento.')
      void queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao aprovar inscrição'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => updateRegistrationRequestStatus(id, 'rejected'),
    onSuccess: () => {
      toast.success('Solicitação rejeitada.')
      void queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao rejeitar solicitação'),
  })

  const responseMutation = useMutation({
    mutationFn: () => {
      if (!selectedSuggestion || !response.trim()) throw new Error('Informe uma resposta.')
      return respondSuggestion(selectedSuggestion.id, response)
    },
    onSuccess: () => {
      toast.success('Sugestão respondida.')
      setSelectedSuggestion(null)
      setResponse('')
      void queryClient.invalidateQueries({ queryKey: ['admin-suggestions'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao responder sugestão'),
  })

  const deleteRequestMutation = useMutation({
    mutationFn: deleteRegistrationRequest,
    onSuccess: () => {
      toast.success('Solicitação e inscrições vinculadas foram excluídas.')
      void queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao excluir solicitação.'),
  })

  const deleteSuggestionMutation = useMutation({
    mutationFn: deleteSuggestion,
    onSuccess: () => {
      toast.success('Sugestão excluída.')
      void queryClient.invalidateQueries({ queryKey: ['admin-suggestions'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao excluir sugestão.'),
  })

  const requests = [...(requestsQuery.data ?? [])].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return b.created_at.localeCompare(a.created_at)
  })
  const suggestions = suggestionsQuery.data ?? []
  const managementError = requestsQuery.error ?? suggestionsQuery.error

  return (
    <div className="space-y-4">
      {managementError && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar o atendimento</AlertTitle>
          <AlertDescription>{managementError instanceof Error ? managementError.message : 'Tente novamente.'}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="registrations" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-lg grid-cols-2">
          <TabsTrigger value="registrations">Inscrições ({requests.filter((item) => item.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões ({suggestions.filter((item) => item.status === 'new').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations">
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Competidor / Animal</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Etapas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-muted-foreground">Carregando solicitações...</TableCell></TableRow>
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhuma solicitação de inscrição.</TableCell></TableRow>
                ) : requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <p className="font-semibold">{request.user?.name ?? request.user?.email ?? '--'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                    </TableCell>
                    <TableCell>{request.event?.name ?? '--'}</TableCell>
                    <TableCell>
                      <p className="font-semibold">{request.competitor_name}</p>
                      <p className="text-xs text-muted-foreground">{request.horse_name} · {request.horse_registration || 'sem registro'}</p>
                    </TableCell>
                    <TableCell>
                      {request.category ? categoryOptionLabel(request.category.name) : '--'}
                      {request.requested_levels?.length
                        ? ` · Níveis ${request.requested_levels.join(', ')}`
                        : request.category?.level ? ` · ${request.category.level}` : ''}
                    </TableCell>
                    <TableCell>{request.stages.map((stage) => `${stage}ª`).join(', ')}</TableCell>
                    <TableCell><Badge variant={request.status === 'approved' ? 'default' : request.status === 'pending' ? 'secondary' : 'outline'}>{REQUEST_LABEL[request.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {request.status === 'pending' && (
                          <>
                          <Button size="sm" className="gap-2" onClick={() => approveMutation.mutate(request.id)} disabled={approveMutation.isPending}>
                            <Check className="h-4 w-4" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => rejectMutation.mutate(request.id)} disabled={rejectMutation.isPending}>
                            <X className="h-4 w-4" /> Rejeitar
                          </Button>
                          </>
                        )}
                        <Button size="icon" variant="destructive" aria-label="Excluir solicitação" onClick={() => deleteRequestMutation.mutate(request.id)} disabled={deleteRequestMutation.isPending}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestionsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground">Carregando sugestões...</TableCell></TableRow>
                ) : suggestions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhuma sugestão recebida.</TableCell></TableRow>
                ) : suggestions.map((suggestion) => (
                  <TableRow key={suggestion.id}>
                    <TableCell>{suggestion.user?.name ?? suggestion.user?.email ?? '--'}</TableCell>
                    <TableCell className="font-semibold">{suggestion.subject}</TableCell>
                    <TableCell>{suggestion.event?.name ?? 'Geral'}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal">{suggestion.message}</TableCell>
                    <TableCell><Badge variant={suggestion.status === 'answered' ? 'default' : 'secondary'}>{suggestion.status === 'answered' ? 'Respondida' : 'Nova'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => { setSelectedSuggestion(suggestion); setResponse(suggestion.response ?? '') }}>
                          <MessageSquareReply className="h-4 w-4" /> Responder
                        </Button>
                        <Button size="icon" variant="destructive" aria-label="Excluir sugestão" onClick={() => deleteSuggestionMutation.mutate(suggestion.id)} disabled={deleteSuggestionMutation.isPending}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedSuggestion)} onOpenChange={(open) => { if (!open) { setSelectedSuggestion(null); setResponse('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Responder sugestão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted/45 p-3 text-sm">{selectedSuggestion?.message}</div>
            <div className="grid gap-1.5">
              <Label htmlFor="suggestion-response">Resposta</Label>
              <Textarea id="suggestion-response" rows={5} value={response} onChange={(event) => setResponse(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSuggestion(null)}>Cancelar</Button>
            <Button onClick={() => responseMutation.mutate()} disabled={responseMutation.isPending}>Enviar resposta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
