import { useLocation, useNavigate } from '@tanstack/react-router'
import { Check, CheckCircle2, FileText, ImagePlus, MessageSquareReply, MoreHorizontal, Pencil, ReceiptText, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { categoryOptionLabel } from '@/lib/constants'
import {
  approveRegistrationRequest,
  confirmRegistrationPayment,
  deleteRegistrationRequest,
  deleteSuggestion,
  getAdminRegistrationRequests,
  getAdminSuggestions,
  isPdfAttachmentUrl,
  rejectRegistrationPayment,
  respondSuggestion,
  updateRegistrationRequestAmount,
  updateRegistrationRequestStatus,
} from '@/services/api'
import type { PaymentStatus, RegistrationRequestRecord, RegistrationRequestStatus, SuggestionRecord } from '@/types/domain'

const REQUEST_LABEL: Record<RegistrationRequestStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
}

const PAYMENT_LABEL: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: 'Aguardando pagamento', className: 'border-amber-800/60 bg-amber-950/30 text-amber-300' },
  submitted: { label: 'Comprovante enviado', className: 'border-blue-800/60 bg-blue-950/30 text-blue-300' },
  confirmed: { label: 'Pago', className: 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300' },
  rejected: { label: 'Pagamento rejeitado', className: 'border-red-800/60 bg-red-950/30 text-red-300' },
  waived: { label: 'Isento', className: 'border-slate-800/60 bg-slate-950/30 text-slate-300' },
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function RequestManagement() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const activeSection = location.hash.replace(/^#/, '') === 'suggestions' ? 'suggestions' : 'registrations'
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionRecord | null>(null)
  const [response, setResponse] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<{ title: string; url: string } | null>(null)
  const [amountDraft, setAmountDraft] = useState('')
  const [search, setSearch] = useState('')
  const [requestFilter, setRequestFilter] = useState('all')

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

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: string) => confirmRegistrationPayment(id),
    onSuccess: () => {
      toast.success('Pagamento confirmado e receita enviada ao DRE.')
      void queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['financial-transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao confirmar pagamento.'),
  })

  const rejectPaymentMutation = useMutation({
    mutationFn: (id: string) => rejectRegistrationPayment(id),
    onSuccess: () => {
      toast.success('Pagamento marcado como rejeitado.')
      void queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao rejeitar pagamento.'),
  })

  const updateAmountMutation = useMutation({
    mutationFn: () => {
      const amount = Number(amountDraft.replace(',', '.'))
      if (!selectedRequestId || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Informe um valor maior que zero.')
      }
      return updateRegistrationRequestAmount(selectedRequestId, amount)
    },
    onSuccess: () => {
      toast.success('Valor da inscrição atualizado.')
      setSelectedRequestId(null)
      setAmountDraft('')
      void queryClient.invalidateQueries({ queryKey: ['admin-registration-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['financial-transactions'] })
      void queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao atualizar o valor.'),
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
  const visibleRequests = requests.filter(request => (requestFilter === 'all' || request.status === requestFilter) && [request.competitor_name, request.horse_name, request.event?.name].join(' ').toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  const suggestions = suggestionsQuery.data ?? []
  const managementError = requestsQuery.error ?? suggestionsQuery.error
  const renderRequestActions = (request: RegistrationRequestRecord) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline" aria-label={`Ações da inscrição de ${request.competitor_name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {request.status === 'pending' && (
          <>
            <DropdownMenuItem onClick={() => approveMutation.mutate(request.id)} disabled={approveMutation.isPending}>
              <Check className="mr-2 h-4 w-4" />
              Aprovar inscrição
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => rejectMutation.mutate(request.id)} disabled={rejectMutation.isPending}>
              <X className="mr-2 h-4 w-4" />
              Rejeitar inscrição
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {request.payment_receipt_url && (
          <DropdownMenuItem onClick={() => setSelectedReceipt({ title: `${request.competitor_name} / ${request.horse_name}`, url: request.payment_receipt_url! })}>
            <ReceiptText className="mr-2 h-4 w-4" />
            Ver comprovante
          </DropdownMenuItem>
        )}
        {request.status === 'approved' && request.payment_status !== 'confirmed' && request.payment_status !== 'waived' && (
          <>
            <DropdownMenuItem onClick={() => confirmPaymentMutation.mutate(request.id)} disabled={confirmPaymentMutation.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirmar pagamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => rejectPaymentMutation.mutate(request.id)} disabled={rejectPaymentMutation.isPending}>
              <X className="mr-2 h-4 w-4" />
              Rejeitar pagamento
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => { setSelectedRequestId(request.id); setAmountDraft(String(request.amount_due ?? 0)) }}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar valor
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => deleteRequestMutation.mutate(request.id)}
          disabled={deleteRequestMutation.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir inscrição
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderSuggestionActions = (suggestion: SuggestionRecord) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline" aria-label={`Ações da sugestão ${suggestion.subject}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => { setSelectedSuggestion(suggestion); setResponse(suggestion.response ?? '') }}>
          <MessageSquareReply className="mr-2 h-4 w-4" />
          Responder
        </DropdownMenuItem>
        {suggestion.attachment_url && (
          <DropdownMenuItem asChild>
            <a href={suggestion.attachment_url} target="_blank" rel="noreferrer">
              {isPdfAttachmentUrl(suggestion.attachment_url) ? <FileText className="mr-2 h-4 w-4" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              Ver anexo
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => deleteSuggestionMutation.mutate(suggestion.id)}
          disabled={deleteSuggestionMutation.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-4">
      {managementError && (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar o atendimento</AlertTitle>
          <AlertDescription>{managementError instanceof Error ? managementError.message : 'Tente novamente.'}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeSection} onValueChange={hash => void navigate({ to: '/admin/requests', hash, hashScrollIntoView: false })} className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-lg grid-cols-2">
          <TabsTrigger value="registrations">Inscrições ({requests.filter((item) => item.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões ({suggestions.filter((item) => item.status === 'new').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Label htmlFor="request-search">Buscar inscrição</Label><Input id="request-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Competidor, cavalo ou evento" /></div><div className="flex flex-wrap gap-1" aria-label="Filtrar inscrições">{[['all','Todas'],['pending','Aguardando análise'],['approved','Aprovadas'],['rejected','Rejeitadas'],['cancelled','Canceladas']].map(([value,label]) => <Button key={value} size="sm" variant={requestFilter === value ? 'default' : 'outline'} aria-pressed={requestFilter === value} onClick={() => setRequestFilter(value)}>{label}</Button>)}</div></div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table className="request-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Competidor / Animal</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Etapas</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-muted-foreground">Carregando solicitações...</TableCell></TableRow>
                ) : visibleRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-muted-foreground">Nenhuma inscrição encontrada para estes filtros.</TableCell></TableRow>
                ) : visibleRequests.map((request) => {
                  const payment = PAYMENT_LABEL[request.payment_status ?? 'pending']
                  return (
                  <TableRow key={request.id}>
                    <TableCell data-label="Solicitante">
                      <p className="font-semibold">{request.user?.name ?? request.user?.email ?? '--'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                    </TableCell>
                    <TableCell data-label="Evento">{request.event?.name ?? '--'}</TableCell>
                    <TableCell data-label="Competidor / Animal">
                      <p className="font-semibold">{request.competitor_name}</p>
                      <p className="text-xs text-muted-foreground">{request.horse_name} · {request.horse_registration || 'sem registro'}</p>
                    </TableCell>
                    <TableCell data-label="Categoria">
                      {request.category ? categoryOptionLabel(request.category.name) : '--'}
                      {request.requested_levels?.length
                        ? ` · Níveis ${request.requested_levels.join(', ')}`
                        : request.category?.level ? ` · ${request.category.level}` : ''}
                    </TableCell>
                    <TableCell data-label="Etapas">{request.stages.map((stage) => `${stage}ª`).join(', ')}</TableCell>
                    <TableCell data-label="Valor">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto gap-1 p-1 font-bold text-primary"
                        onClick={() => { setSelectedRequestId(request.id); setAmountDraft(String(request.amount_due ?? 0)) }}
                      >
                        {formatCurrency(request.amount_due ?? 0)}
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </TableCell>
                    <TableCell data-label="Inscrição"><Badge variant={request.status === 'approved' ? 'default' : request.status === 'pending' ? 'secondary' : 'outline'}>{REQUEST_LABEL[request.status]}</Badge></TableCell>
                    <TableCell data-label="Pagamento">
                      <div className="space-y-1">
                        <Badge variant="outline" className={payment.className}>{payment.label}</Badge>
                        {request.payment_receipt_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:underline"
                            onClick={() => setSelectedReceipt({ title: `${request.competitor_name} / ${request.horse_name}`, url: request.payment_receipt_url! })}
                          >
                            Ver comprovante
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{renderRequestActions(request)}</TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="overflow-x-auto rounded-lg border bg-card">
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
                    <TableCell className="max-w-sm whitespace-normal">
                      <p>{suggestion.message}</p>
                      {suggestion.attachment_url && (
                        <a
                          href={suggestion.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {isPdfAttachmentUrl(suggestion.attachment_url) ? <FileText className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />}
                          {suggestion.attachment_name ?? 'Ver anexo'}
                        </a>
                      )}
                    </TableCell>
                    <TableCell><Badge variant={suggestion.status === 'answered' ? 'default' : 'secondary'}>{suggestion.status === 'answered' ? 'Respondida' : 'Nova'}</Badge></TableCell>
                    <TableCell className="text-right">{renderSuggestionActions(suggestion)}</TableCell>
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
            {selectedSuggestion?.attachment_url && (
              <a
                href={selectedSuggestion.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border bg-muted/35 px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
              >
                {isPdfAttachmentUrl(selectedSuggestion.attachment_url) ? <FileText className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                {selectedSuggestion.attachment_name ?? 'Ver anexo enviado'}
              </a>
            )}
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

      <Dialog open={Boolean(selectedReceipt)} onOpenChange={(open) => { if (!open) setSelectedReceipt(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Comprovante de pagamento</DialogTitle></DialogHeader>
          {selectedReceipt && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{selectedReceipt.title}</p>
              {isPdfAttachmentUrl(selectedReceipt.url) ? (
                <div className="space-y-3">
                  <a
                    href={selectedReceipt.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    Abrir PDF em nova aba
                  </a>
                  <iframe title="Comprovante em PDF" src={selectedReceipt.url} className="h-[62vh] w-full rounded-lg border bg-white" />
                </div>
              ) : (
                <img src={selectedReceipt.url} alt="Comprovante de pagamento" className="max-h-[70vh] w-full rounded-lg object-contain" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRequestId)} onOpenChange={(open) => { if (!open) { setSelectedRequestId(null); setAmountDraft('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar valor da inscrição</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="registration-amount">Novo valor total (R$)</Label>
            <Input
              id="registration-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amountDraft}
              onChange={(event) => setAmountDraft(event.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Se o pagamento já foi confirmado, a receita vinculada também será atualizada no DRE.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequestId(null)}>Cancelar</Button>
            <Button onClick={() => updateAmountMutation.mutate()} disabled={updateAmountMutation.isPending}>
              {updateAmountMutation.isPending ? 'Salvando...' : 'Salvar valor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
