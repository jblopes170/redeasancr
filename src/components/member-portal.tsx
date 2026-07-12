import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Lightbulb,
  Medal,
  PlusCircle,
  Send,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { categoryLabel } from '@/lib/constants'
import { useAuth } from '@/providers/auth-provider'
import {
  createRegistrationRequest,
  createSuggestion,
  getCategories,
  getMyRegistrationRequests,
  getMySuggestions,
  getPublicEvents,
  updateRegistrationRequestStatus,
} from '@/services/api'
import type { RegistrationRequestStatus, Stage, SuggestionStatus } from '@/types/domain'

const REQUEST_STATUS: Record<RegistrationRequestStatus, { label: string; className: string }> = {
  pending: { label: 'Aguardando análise', className: 'border-amber-300 bg-amber-50 text-amber-800' },
  approved: { label: 'Aprovada', className: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  rejected: { label: 'Não aprovada', className: 'border-red-300 bg-red-50 text-red-800' },
  cancelled: { label: 'Cancelada', className: 'border-slate-300 bg-slate-50 text-slate-700' },
}

const SUGGESTION_STATUS: Record<SuggestionStatus, string> = {
  new: 'Enviada',
  read: 'Em análise',
  answered: 'Respondida',
  archived: 'Arquivada',
}

interface RegistrationForm {
  eventId: string
  categoryId: string
  competitorName: string
  competitorDocument: string
  competitorCity: string
  competitorUf: string
  horseName: string
  horseRegistration: string
  horseOwner: string
  notes: string
}

const emptyRegistration: RegistrationForm = {
  eventId: '',
  categoryId: '',
  competitorName: '',
  competitorDocument: '',
  competitorCity: '',
  competitorUf: '',
  horseName: '',
  horseRegistration: '',
  horseOwner: '',
  notes: '',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export function MemberPortal() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [registration, setRegistration] = useState<RegistrationForm>(emptyRegistration)
  const [stages, setStages] = useState<Stage[]>([1])
  const [suggestionEventId, setSuggestionEventId] = useState('none')
  const [suggestionSubject, setSuggestionSubject] = useState('')
  const [suggestionMessage, setSuggestionMessage] = useState('')

  const eventsQuery = useQuery({ queryKey: ['public-events'], queryFn: getPublicEvents })
  const categoriesQuery = useQuery({
    queryKey: ['categories', registration.eventId, 'member'],
    queryFn: () => getCategories(registration.eventId),
    enabled: Boolean(registration.eventId),
  })
  const requestsQuery = useQuery({
    queryKey: ['my-registration-requests', profile?.id],
    queryFn: () => getMyRegistrationRequests(profile!.id),
    enabled: Boolean(profile?.id),
  })
  const suggestionsQuery = useQuery({
    queryKey: ['my-suggestions', profile?.id],
    queryFn: () => getMySuggestions(profile!.id),
    enabled: Boolean(profile?.id),
  })

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data])
  const registrationEvents = useMemo(
    () => events.filter((event) => event.status === 'active' || event.status === 'published'),
    [events],
  )
  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.active),
    [categoriesQuery.data],
  )

  useEffect(() => {
    if (!registration.eventId && registrationEvents.length > 0) {
      setRegistration((current) => ({ ...current, eventId: registrationEvents[0].id }))
    }
  }, [registration.eventId, registrationEvents])

  const registrationMutation = useMutation({
    mutationFn: () => {
      if (!registration.eventId || !registration.categoryId) {
        throw new Error('Selecione o evento e a categoria.')
      }
      if (!registration.competitorName.trim() || !registration.horseName.trim()) {
        throw new Error('Informe o nome do competidor e do animal.')
      }
      if (stages.length === 0) {
        throw new Error('Selecione pelo menos uma etapa.')
      }

      return createRegistrationRequest({
        event_id: registration.eventId,
        category_id: registration.categoryId,
        stages,
        competitor_name: registration.competitorName.trim(),
        competitor_document: registration.competitorDocument,
        competitor_city: registration.competitorCity,
        competitor_uf: registration.competitorUf,
        horse_name: registration.horseName.trim(),
        horse_registration: registration.horseRegistration,
        horse_owner: registration.horseOwner,
        notes: registration.notes,
      })
    },
    onSuccess: () => {
      toast.success('Inscrição enviada para análise.')
      setRegistration((current) => ({
        ...emptyRegistration,
        eventId: current.eventId,
      }))
      setStages([1])
      void queryClient.invalidateQueries({ queryKey: ['my-registration-requests'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao enviar inscrição.'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => updateRegistrationRequestStatus(id, 'cancelled'),
    onSuccess: () => {
      toast.success('Solicitação cancelada.')
      void queryClient.invalidateQueries({ queryKey: ['my-registration-requests'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao cancelar solicitação.'),
  })

  const suggestionMutation = useMutation({
    mutationFn: () => {
      if (!suggestionSubject.trim() || !suggestionMessage.trim()) {
        throw new Error('Informe o assunto e a mensagem.')
      }
      return createSuggestion({
        event_id: suggestionEventId === 'none' ? undefined : suggestionEventId,
        subject: suggestionSubject,
        message: suggestionMessage,
      })
    },
    onSuccess: () => {
      toast.success('Sugestão enviada. Obrigado por contribuir!')
      setSuggestionSubject('')
      setSuggestionMessage('')
      setSuggestionEventId('none')
      void queryClient.invalidateQueries({ queryKey: ['my-suggestions'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao enviar sugestão.'),
  })

  const toggleStage = (stage: Stage) => {
    setStages((current) => (
      current.includes(stage)
        ? current.filter((item) => item !== stage)
        : [...current, stage].sort()
    ))
  }

  const portalError = requestsQuery.error ?? suggestionsQuery.error

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary to-red-800 text-primary-foreground">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/75">Área do participante</p>
            <h1 className="mt-1 text-3xl font-extrabold">Olá, {profile?.name ?? profile?.email ?? 'competidor'}</h1>
            <p className="mt-1 max-w-2xl text-sm text-primary-foreground/85">
              Faça sua inscrição, acompanhe a aprovação e consulte os resultados em um só lugar.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link to="/ranking"><Trophy className="mr-2 h-4 w-4" />Ranking ao vivo</Link>
          </Button>
        </CardContent>
      </Card>

      {portalError && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o portal</AlertTitle>
          <AlertDescription>{portalError instanceof Error ? portalError.message : 'Tente novamente.'}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 lg:grid-cols-4">
          <TabsTrigger value="new" className="gap-2"><PlusCircle className="h-4 w-4" />Nova inscrição</TabsTrigger>
          <TabsTrigger value="registrations" className="gap-2"><ClipboardList className="h-4 w-4" />Minhas inscrições</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2"><Lightbulb className="h-4 w-4" />Sugestões</TabsTrigger>
          <TabsTrigger value="results" className="gap-2"><Medal className="h-4 w-4" />Resultados</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Solicitar inscrição</CardTitle>
              <p className="text-sm text-muted-foreground">
                Preencha competidor e animal juntos. A organização revisará os dados antes de confirmar a inscrição.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              {registrationEvents.length === 0 && !eventsQuery.isLoading ? (
                <Alert>
                  <CalendarDays className="h-4 w-4" />
                  <AlertTitle>Inscrições indisponíveis</AlertTitle>
                  <AlertDescription>Nenhum evento publicado está recebendo solicitações.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label>Evento *</Label>
                      <Select
                        value={registration.eventId}
                        onValueChange={(value) => setRegistration((current) => ({ ...current, eventId: value, categoryId: '' }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione o evento" /></SelectTrigger>
                        <SelectContent>
                          {registrationEvents.map((event) => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Categoria *</Label>
                      <Select
                        value={registration.categoryId}
                        onValueChange={(value) => setRegistration((current) => ({ ...current, categoryId: value }))}
                        disabled={!registration.eventId || categoriesQuery.isLoading}
                      >
                        <SelectTrigger><SelectValue placeholder={categoriesQuery.isLoading ? 'Carregando...' : 'Selecione a categoria'} /></SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{categoryLabel(category.name, category.level)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/35 p-4">
                    <Label className="mb-3 block">Etapas desejadas *</Label>
                    <div className="flex flex-wrap gap-4">
                      {([1, 2, 3] as Stage[]).map((stage) => (
                        <label key={stage} className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                          <input type="checkbox" checked={stages.includes(stage)} onChange={() => toggleStage(stage)} />
                          {stage}ª etapa
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-bold text-primary">Competidor</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="grid gap-1.5 sm:col-span-2"><Label>Nome completo *</Label><Input value={registration.competitorName} onChange={(event) => setRegistration((current) => ({ ...current, competitorName: event.target.value }))} /></div>
                      <div className="grid gap-1.5"><Label>Documento</Label><Input value={registration.competitorDocument} onChange={(event) => setRegistration((current) => ({ ...current, competitorDocument: event.target.value }))} /></div>
                      <div className="grid gap-1.5"><Label>Cidade</Label><Input value={registration.competitorCity} onChange={(event) => setRegistration((current) => ({ ...current, competitorCity: event.target.value }))} /></div>
                      <div className="grid gap-1.5"><Label>UF</Label><Input maxLength={2} value={registration.competitorUf} onChange={(event) => setRegistration((current) => ({ ...current, competitorUf: event.target.value.toUpperCase() }))} /></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-bold text-primary">Animal</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="grid gap-1.5 sm:col-span-2"><Label>Nome do animal *</Label><Input value={registration.horseName} onChange={(event) => setRegistration((current) => ({ ...current, horseName: event.target.value }))} /></div>
                      <div className="grid gap-1.5"><Label>Registro</Label><Input value={registration.horseRegistration} onChange={(event) => setRegistration((current) => ({ ...current, horseRegistration: event.target.value }))} /></div>
                      <div className="grid gap-1.5"><Label>Proprietário</Label><Input value={registration.horseOwner} onChange={(event) => setRegistration((current) => ({ ...current, horseOwner: event.target.value }))} /></div>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Observações</Label>
                    <Textarea rows={3} value={registration.notes} onChange={(event) => setRegistration((current) => ({ ...current, notes: event.target.value }))} />
                  </div>

                  <div className="flex justify-end">
                    <Button className="gap-2" onClick={() => registrationMutation.mutate()} disabled={registrationMutation.isPending || registrationEvents.length === 0}>
                      <Send className="h-4 w-4" />
                      {registrationMutation.isPending ? 'Enviando...' : 'Enviar inscrição'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registrations">
          <div className="grid gap-3">
            {requestsQuery.isLoading ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando suas inscrições...</CardContent></Card>
            ) : (requestsQuery.data ?? []).length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Você ainda não enviou nenhuma inscrição.</CardContent></Card>
            ) : (requestsQuery.data ?? []).map((request) => {
              const status = REQUEST_STATUS[request.status]
              return (
                <Card key={request.id}>
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-primary">{request.event?.name ?? 'Evento'}</p>
                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                      </div>
                      <p className="text-sm"><strong>{request.competitor_name}</strong> com <strong>{request.horse_name}</strong></p>
                      <p className="text-sm text-muted-foreground">
                        {request.category ? categoryLabel(request.category.name, request.category.level) : 'Categoria'} · Etapas {request.stages.join(', ')}
                      </p>
                      <p className="text-xs text-muted-foreground">Enviada em {formatDate(request.created_at)}</p>
                      {request.admin_notes && <p className="text-sm text-destructive">Observação: {request.admin_notes}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {request.status === 'approved' && (
                        <Button size="sm" variant="outline" asChild><Link to="/events/$eventId" params={{ eventId: request.event_id }}>Ver evento</Link></Button>
                      )}
                      {request.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(request.id)} disabled={cancelMutation.isPending}>Cancelar solicitação</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <Card>
              <CardHeader><CardTitle>Enviar sugestão</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-1.5">
                  <Label>Evento relacionado</Label>
                  <Select value={suggestionEventId} onValueChange={setSuggestionEventId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Assunto geral</SelectItem>
                      {events.map((event) => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label>Assunto *</Label><Input value={suggestionSubject} onChange={(event) => setSuggestionSubject(event.target.value)} /></div>
                <div className="grid gap-1.5"><Label>Mensagem *</Label><Textarea rows={6} value={suggestionMessage} onChange={(event) => setSuggestionMessage(event.target.value)} /></div>
                <Button className="w-full gap-2" onClick={() => suggestionMutation.mutate()} disabled={suggestionMutation.isPending}><Send className="h-4 w-4" />Enviar sugestão</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Minhas mensagens</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(suggestionsQuery.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma sugestão enviada.</p>
                ) : (suggestionsQuery.data ?? []).map((suggestion) => (
                  <div key={suggestion.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-bold">{suggestion.subject}</p><p className="text-xs text-muted-foreground">{suggestion.event?.name ?? 'Assunto geral'} · {formatDate(suggestion.created_at)}</p></div>
                      <Badge variant={suggestion.status === 'answered' ? 'default' : 'secondary'}>{SUGGESTION_STATUS[suggestion.status]}</Badge>
                    </div>
                    <p className="mt-3 text-sm">{suggestion.message}</p>
                    {suggestion.response && (
                      <div className="mt-3 rounded-md border-l-4 border-primary bg-muted/45 p-3 text-sm"><strong>Resposta da organização:</strong><br />{suggestion.response}</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/25">
              <CardContent className="p-6">
                <Trophy className="h-8 w-8 text-primary" />
                <h2 className="mt-4 text-xl font-bold">Ranking geral</h2>
                <p className="mt-1 text-sm text-muted-foreground">Acompanhe notas, pontos, posições por etapa e o resultado do campeonato.</p>
                <Button className="mt-4" asChild><Link to="/ranking">Abrir ranking ao vivo</Link></Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <h2 className="mt-4 text-xl font-bold">Eventos e resultados</h2>
                <p className="mt-1 text-sm text-muted-foreground">Consulte os resultados e as publicações de cada evento.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {events.slice(0, 3).map((event) => <Button key={event.id} size="sm" variant="outline" asChild><Link to="/events/$eventId" params={{ eventId: event.id }}>{event.name}</Link></Button>)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
