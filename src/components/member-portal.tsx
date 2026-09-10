import { PageHeading } from '@/components/page-heading'
import { memberSections, getMemberSection } from '@/lib/navigation'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileText,
  ImagePlus,
  MoreHorizontal,
  Newspaper,
  Paperclip,
  PlusCircle,
  ReceiptText,
  Send,
  Trophy,
  WalletCards,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SuggestionInput } from '@/components/ui/suggestion-input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  LEVEL_OPTIONS,
  BRAZILIAN_UF_OPTIONS,
  categoryOptionLabel,
  getUniqueCategoryOptions,
  isLeveledCategoryName,
  isOfficialCategoryName,
} from '@/lib/constants'
import { useAuth } from '@/providers/auth-provider'
import {
  createRegistrationRequest,
  createSuggestion,
  EVIDENCE_ATTACHMENT_ACCEPT,
  getCategories,
  getMyRegistrationRequests,
  getMySuggestions,
  getPublicEvents,
  getPublicNews,
  isPdfAttachmentUrl,
  PAYMENT_RECEIPT_ACCEPT,
  submitRegistrationPaymentReceipt,
  uploadPaymentReceipt,
  uploadSuggestionAttachment,
  updateRegistrationRequestStatus,
} from '@/services/api'
import type { Level, PaymentStatus, RegistrationRequestRecord, RegistrationRequestStatus, Stage, SuggestionStatus } from '@/types/domain'

const REQUEST_STATUS: Record<RegistrationRequestStatus, { label: string; className: string }> = {
  pending: { label: 'Aguardando análise', className: 'border-amber-800/60 bg-amber-950/30 text-amber-300' },
  approved: { label: 'Aprovada', className: 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300' },
  rejected: { label: 'Não aprovada', className: 'border-red-800/60 bg-red-950/30 text-red-300' },
  cancelled: { label: 'Cancelada', className: 'border-slate-800/60 bg-slate-950/30 text-slate-300' },
}

const SUGGESTION_STATUS: Record<SuggestionStatus, string> = {
  new: 'Enviada',
  read: 'Em análise',
  answered: 'Respondida',
  archived: 'Arquivada',
}

const PAYMENT_STATUS: Record<PaymentStatus, { label: string; className: string }> = {
  pending: { label: 'Aguardando pagamento', className: 'border-amber-800/60 bg-amber-950/30 text-amber-300' },
  submitted: { label: 'Comprovante enviado', className: 'border-blue-800/60 bg-blue-950/30 text-blue-300' },
  confirmed: { label: 'Pagamento confirmado', className: 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300' },
  rejected: { label: 'Pagamento rejeitado', className: 'border-red-800/60 bg-red-950/30 text-red-300' },
  waived: { label: 'Isento', className: 'border-slate-800/60 bg-slate-950/30 text-slate-300' },
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

const emptySelectedLevels: Record<Level, boolean> = {
  N1: false,
  N2: false,
  N3: false,
  N4: false,
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function registrationCategoryLabel(request: RegistrationRequestRecord) {
  const base = request.category ? categoryOptionLabel(request.category.name) : 'Categoria'
  const levels = request.requested_levels?.length
    ? `Níveis ${request.requested_levels.join(', ')}`
    : request.category?.level ?? ''

  return levels ? `${base} · ${levels}` : base
}

function canUploadReceipt(request: RegistrationRequestRecord) {
  return request.status !== 'cancelled' && request.payment_status !== 'confirmed' && request.payment_status !== 'waived'
}

export function MemberPortal() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [registration, setRegistration] = useState<RegistrationForm>(emptyRegistration)
  const [selectedLevels, setSelectedLevels] = useState<Record<Level, boolean>>(emptySelectedLevels)
  const [stages, setStages] = useState<Stage[]>([1])
  const [suggestionEventId, setSuggestionEventId] = useState('none')
  const [suggestionSubject, setSuggestionSubject] = useState('')
  const [suggestionMessage, setSuggestionMessage] = useState('')
  const [suggestionAttachmentFile, setSuggestionAttachmentFile] = useState<File | null>(null)
  const [receiptFiles, setReceiptFiles] = useState<Record<string, File | undefined>>({})
  const [receiptDialogRequestId, setReceiptDialogRequestId] = useState<string | null>(null)
  const [receiptDialogMode, setReceiptDialogMode] = useState<'upload' | 'preview'>('upload')

  const eventsQuery = useQuery({ queryKey: ['public-events'], queryFn: getPublicEvents })
  const newsQuery = useQuery({ queryKey: ['public-news', 'member-dashboard'], queryFn: () => getPublicNews(undefined, 3) })
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

  const registrationHistory = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data])
  const competitorOptions = useMemo(() => {
    const unique = new Map<string, { value: string; label?: string }>()
    for (const item of registrationHistory) {
      const value = item.competitor_name.trim()
      if (!value) continue
      const location = [item.competitor_city, item.competitor_uf].filter(Boolean).join('/')
      unique.set(value.toLocaleLowerCase('pt-BR'), { value, label: location || undefined })
    }
    return Array.from(unique.values())
  }, [registrationHistory])
  const horseOptions = useMemo(() => {
    const unique = new Map<string, { value: string; label?: string }>()
    for (const item of registrationHistory) {
      const value = item.horse_name.trim()
      if (!value) continue
      unique.set(value.toLocaleLowerCase('pt-BR'), { value, label: item.horse_registration || undefined })
    }
    return Array.from(unique.values())
  }, [registrationHistory])
  const cityOptions = useMemo(
    () => Array.from(new Set(registrationHistory.map((item) => item.competitor_city?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((value) => ({ value })),
    [registrationHistory],
  )

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data])
  const registrationEvents = useMemo(
    () => events.filter((event) => event.status === 'active' || event.status === 'published'),
    [events],
  )
  const categories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.active && isOfficialCategoryName(category.name)),
    [categoriesQuery.data],
  )
  const categoryOptions = useMemo(() => getUniqueCategoryOptions(categories), [categories])
  const selectedCategory = categories.find((category) => category.id === registration.categoryId)
  const selectedCategoryIsLeveled = selectedCategory ? isLeveledCategoryName(selectedCategory.name) : false
  const selectedLevelValues = LEVEL_OPTIONS.filter((level) => selectedLevels[level])
  const selectedLevelCategories = selectedCategory
    ? LEVEL_OPTIONS
      .map((level) => categories.find((category) => category.name === selectedCategory.name && category.level === level))
      .filter(Boolean)
    : []
  const registrationAmountEstimate = useMemo(() => {
    if (!selectedCategory) return 0
    const stageMultiplier = Math.max(stages.length, 1)
    if (!selectedCategoryIsLeveled) return Number(selectedCategory.entry_fee ?? 0) * stageMultiplier

    const levelTotal = selectedLevelValues.reduce((total, level) => {
      const category = categories.find((item) => item.name === selectedCategory.name && item.level === level)
      return total + Number(category?.entry_fee ?? 0)
    }, 0)

    return levelTotal * stageMultiplier
  }, [categories, selectedCategory, selectedCategoryIsLeveled, selectedLevelValues, stages.length])
  const myRequests = requestsQuery.data ?? []
  const pendingRequests = myRequests.filter((item) => item.status === 'pending').length
  const pendingPayments = myRequests.filter((item) => item.status === 'approved' && (item.payment_status === 'pending' || !item.payment_status)).length
  const confirmedRequests = myRequests.filter((item) => item.status === 'approved').length
  const pendingPaymentAmount = myRequests
    .filter((item) => item.status === 'approved' && (item.payment_status === 'pending' || !item.payment_status))
    .reduce((total, item) => total + Number(item.amount_due ?? 0), 0)
  const latestRequest = myRequests[0]
  const latestRequestStatus = latestRequest ? REQUEST_STATUS[latestRequest.status] : undefined
  const latestRequestPayment = latestRequest ? PAYMENT_STATUS[latestRequest.payment_status ?? 'pending'] : undefined
  const latestNews = newsQuery.data ?? []
  const nextEvent = registrationEvents[0] ?? events[0]
  const memberFirstName = profile?.name?.trim().split(/\s+/)[0] || profile?.email?.split('@')[0] || 'Competidor'
  const receiptDialogRequest = myRequests.find((request) => request.id === receiptDialogRequestId)

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
      if (selectedCategoryIsLeveled && selectedLevelValues.length === 0) {
        throw new Error('Selecione pelo menos um nível para esta categoria.')
      }

      return createRegistrationRequest({
        event_id: registration.eventId,
        category_id: registration.categoryId,
        requested_levels: selectedCategoryIsLeveled ? selectedLevelValues : undefined,
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
      setSection('registrations')
      setRegistration((current) => ({
        ...emptyRegistration,
        eventId: current.eventId,
      }))
      setSelectedLevels(emptySelectedLevels)
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

  const receiptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const file = receiptFiles[requestId]
      if (!file) throw new Error('Selecione uma imagem ou PDF do comprovante.')
      const receiptUrl = await uploadPaymentReceipt(requestId, file)
      return submitRegistrationPaymentReceipt(requestId, receiptUrl)
    },
    onSuccess: () => {
      const requestId = receiptDialogRequestId
      toast.success('Comprovante enviado para validação.')
      setReceiptDialogRequestId(null)
      setReceiptDialogMode('upload')
      if (requestId) {
        setReceiptFiles((current) => {
          const next = { ...current }
          delete next[requestId]
          return next
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['my-registration-requests'] })
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Erro ao enviar comprovante.'),
  })

  const suggestionMutation = useMutation({
    mutationFn: async () => {
      if (!suggestionSubject.trim() || !suggestionMessage.trim()) {
        throw new Error('Informe o assunto e a mensagem.')
      }
      const attachmentUrl = suggestionAttachmentFile ? await uploadSuggestionAttachment(suggestionAttachmentFile) : null
      return createSuggestion({
        event_id: suggestionEventId === 'none' ? undefined : suggestionEventId,
        subject: suggestionSubject,
        message: suggestionMessage,
        attachment_url: attachmentUrl,
        attachment_name: suggestionAttachmentFile?.name,
        attachment_type: suggestionAttachmentFile?.type,
      })
    },
    onSuccess: () => {
      toast.success('Sugestão enviada. Obrigado por contribuir!')
      setSuggestionSubject('')
      setSuggestionMessage('')
      setSuggestionEventId('none')
      setSuggestionAttachmentFile(null)
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
  const location = useLocation()
  const navigate = useNavigate()
  const section = getMemberSection(location.hash)
  const setSection = (id: string) => void navigate({ to: '/minha-area', hash: memberSections.find(item => item.id === id)?.hash ?? 'resumo', hashScrollIntoView: false })
  const openReceiptDialog = (requestId: string, mode: 'upload' | 'preview') => {
    setReceiptDialogMode(mode)
    setReceiptDialogRequestId(requestId)
  }
  const renderRegistrationActions = (request: RegistrationRequestRecord) => {
    const canSendReceipt = canUploadReceipt(request)

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label={`Ações da inscrição de ${request.competitor_name}`} className="border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          {request.status === 'approved' && (
            <DropdownMenuItem asChild>
              <Link to="/events/$eventId" params={{ eventId: request.event_id }}>
                <Eye className="mr-2 h-4 w-4" />
                Ver evento
              </Link>
            </DropdownMenuItem>
          )}
          {request.payment_receipt_url && (
            <DropdownMenuItem onClick={() => openReceiptDialog(request.id, 'preview')}>
              <ReceiptText className="mr-2 h-4 w-4" />
              Ver comprovante
            </DropdownMenuItem>
          )}
          {canSendReceipt && (
            <DropdownMenuItem onClick={() => openReceiptDialog(request.id, 'upload')}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Enviar comprovante
            </DropdownMenuItem>
          )}
          {request.status === 'pending' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(request.id)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar solicitação
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-6" id="resumo">
      <PageHeading
        title={section.label}
        description={section.id === 'summary' ? 'Inscrições, pagamentos, resultados e suporte em uma visão rápida.' : undefined}
        actions={section.id === 'summary' && (
          <Button className="member-dashboard-primary active:scale-95" onClick={() => setSection('new')}>
            <PlusCircle className="h-4 w-4" />
            Nova inscrição
          </Button>
        )}
      />
      {portalError && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Não foi possível carregar o portal</AlertTitle>
          <AlertDescription>{portalError instanceof Error ? portalError.message : 'Tente novamente.'}</AlertDescription>
        </Alert>
      )}

      <Tabs value={section.id} onValueChange={setSection} className="space-y-4">
        <TabsContent value="summary" className="member-dashboard space-y-5">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <Card className="member-dashboard-panel overflow-hidden border-zinc-800/60 bg-zinc-950/75 text-zinc-50 shadow-2xl shadow-black/35 backdrop-blur-md">
              <CardContent className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,.36fr)] lg:items-end">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(245,158,11,.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,.08),transparent_46%)]" />
                <div className="relative">
                  <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Área do competidor
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">Olá, {memberFirstName}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                    Acompanhe suas inscrições, envie comprovantes e consulte resultados sem se perder entre telas.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button className="member-dashboard-primary min-w-[160px] active:scale-95" onClick={() => setSection('new')}>
                      <PlusCircle className="h-4 w-4" />
                      Fazer inscrição
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10 active:scale-95"
                      onClick={() => setSection('registrations')}
                    >
                      <WalletCards className="h-4 w-4" />
                      Pagamentos
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10 active:scale-95"
                      asChild
                    >
                      <Link to="/ranking">
                        <Trophy className="h-4 w-4" />
                        Ranking
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="relative rounded-lg border border-white/10 bg-black/25 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Próxima ação</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-50">
                    {pendingPayments > 0 ? 'Enviar comprovante' : pendingRequests > 0 ? 'Aguardar análise' : 'Nova passada'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {pendingPayments > 0
                      ? 'Há pagamento pendente para concluir inscrição.'
                      : pendingRequests > 0
                        ? 'A organização já recebeu sua solicitação.'
                        : 'Escolha o evento e prepare sua inscrição.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="member-dashboard-card rounded-xl border border-zinc-800/60 bg-zinc-950/65 p-5 text-zinc-50 shadow-xl shadow-black/25 backdrop-blur-md">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Evento em destaque</p>
              {nextEvent ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold leading-tight">{nextEvent.name}</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      {nextEvent.starts_on ? formatDate(nextEvent.starts_on) : 'Data a definir'}
                      {nextEvent.ends_on ? ` a ${formatDate(nextEvent.ends_on)}` : ''}
                      {nextEvent.location ? ` · ${nextEvent.location}` : ''}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10 active:scale-95" asChild>
                    <Link to="/events/$eventId" params={{ eventId: nextEvent.id }}>Ver detalhes</Link>
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-zinc-400">Nenhum evento publicado no momento.</p>
              )}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Inscrições', value: requestsQuery.isPending || requestsQuery.error ? '--' : myRequests.length, hint: 'solicitações enviadas', icon: ReceiptText },
              { label: 'Em análise', value: requestsQuery.isPending || requestsQuery.error ? '--' : pendingRequests, hint: 'aguardando retorno', icon: CalendarDays },
              {
                label: 'Pagamento',
                value: requestsQuery.isPending || requestsQuery.error ? '--' : pendingPayments,
                hint: pendingPaymentAmount > 0 ? formatCurrency(pendingPaymentAmount) : 'sem pendência',
                icon: WalletCards,
              },
              { label: 'Confirmadas', value: requestsQuery.isPending || requestsQuery.error ? '--' : confirmedRequests, hint: 'prontas para acompanhar', icon: CheckCircle2 },
            ].map((item) => (
              <div key={item.label} className="member-dashboard-card group rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-4 text-zinc-50 shadow-lg shadow-black/20 backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/35">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">{item.value}</p>
                  </div>
                  <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-amber-400 transition-colors group-hover:border-amber-500/45 group-hover:bg-amber-500/15">
                    <item.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-sm text-zinc-400">{item.hint}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
            <div className="member-dashboard-card rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-5 text-zinc-50 shadow-lg shadow-black/20 backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-400">Inscrição recente</p>
                  <h3 className="mt-2 text-xl font-semibold">{latestRequest ? latestRequest.event?.name ?? 'Evento' : 'Nenhuma inscrição enviada'}</h3>
                </div>
                <ReceiptText className="h-5 w-5 text-amber-400" />
              </div>
              {latestRequest ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-zinc-300">
                    <strong className="text-zinc-50">{latestRequest.competitor_name}</strong> com{' '}
                    <strong className="text-zinc-50">{latestRequest.horse_name}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {latestRequestStatus && <Badge variant="outline" className={latestRequestStatus.className}>{latestRequestStatus.label}</Badge>}
                    {latestRequestPayment && <Badge variant="outline" className={latestRequestPayment.className}>{latestRequestPayment.label}</Badge>}
                  </div>
                  <Button variant="outline" className="w-full border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10 active:scale-95" onClick={() => setSection('registrations')}>
                    Ver inscrições e pagamentos
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <p className="text-sm leading-6 text-zinc-400">Quando você enviar uma inscrição, ela aparecerá aqui com status e pagamento.</p>
                  <Button className="member-dashboard-primary w-full active:scale-95" onClick={() => setSection('new')}>Começar agora</Button>
                </div>
              )}
            </div>

            <div className="member-dashboard-card rounded-xl border border-zinc-800/60 bg-zinc-950/60 p-5 text-zinc-50 shadow-lg shadow-black/20 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-400">Avisos da organização</p>
                  <h3 className="mt-2 text-xl font-semibold">Notícias recentes</h3>
                </div>
                <Button variant="outline" size="sm" className="border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10 active:scale-95" asChild>
                  <Link to="/noticias">Ver todas</Link>
                </Button>
              </div>
              <div className="mt-4 grid gap-3">
                {newsQuery.isLoading ? (
                  <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">Carregando avisos...</p>
                ) : latestNews.length > 0 ? latestNews.map((post) => (
                  <Link
                    key={post.id}
                    to="/noticias"
                    className="member-dashboard-news rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/35 hover:bg-amber-500/10"
                  >
                    <div className="flex items-start gap-3">
                      <Newspaper className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-50">{post.title}</p>
                        {post.summary && <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-400">{post.summary}</p>}
                      </div>
                    </div>
                  </Link>
                )) : (
                  <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400">Nenhum aviso publicado ainda.</p>
                )}
              </div>
            </div>
          </section>
        </TabsContent>
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
                        onValueChange={(value) => {
                          setRegistration((current) => ({ ...current, eventId: value, categoryId: '' }))
                          setSelectedLevels(emptySelectedLevels)
                        }}
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
                        onValueChange={(value) => {
                          setRegistration((current) => ({ ...current, categoryId: value }))
                          setSelectedLevels(emptySelectedLevels)
                        }}
                        disabled={!registration.eventId || categoriesQuery.isLoading}
                      >
                        <SelectTrigger><SelectValue placeholder={categoriesQuery.isLoading ? 'Carregando...' : 'Selecione a categoria'} /></SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{categoryOptionLabel(category.name)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedCategoryIsLeveled && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <Label className="mb-2 block">Níveis elegíveis *</Label>
                      <p className="mb-3 text-xs text-muted-foreground">
                        A inscrição gera uma única passada. A nota lançada depois valerá para todos os níveis marcados aqui.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {LEVEL_OPTIONS.map((level) => {
                          const categoryExists = selectedLevelCategories.some((category) => category?.level === level)

                          return (
                            <label key={level} className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                              <input
                                type="checkbox"
                                checked={selectedLevels[level]}
                                disabled={!categoryExists}
                                onChange={(event) => {
                                  setSelectedLevels((current) => ({
                                    ...current,
                                    [level]: event.target.checked,
                                  }))
                                }}
                              />
                              {level}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

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
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label>Nome completo *</Label>
                        <SuggestionInput
                          options={competitorOptions}
                          value={registration.competitorName}
                          placeholder="Digite um nome novo ou escolha uma sugestão"
                          onChange={(event) => setRegistration((current) => ({ ...current, competitorName: event.target.value }))}
                          onSuggestionSelect={(option) => {
                            const found = registrationHistory.find(
                              (item) => item.competitor_name.toLocaleLowerCase('pt-BR') === option.value.toLocaleLowerCase('pt-BR'),
                            )
                            if (!found) return
                            setRegistration((current) => ({
                              ...current,
                              competitorName: found.competitor_name,
                              competitorDocument: found.competitor_document ?? current.competitorDocument,
                              competitorCity: found.competitor_city ?? current.competitorCity,
                              competitorUf: found.competitor_uf ?? current.competitorUf,
                            }))
                          }}
                        />
                      </div>
                      <div className="grid gap-1.5"><Label>Documento</Label><Input value={registration.competitorDocument} onChange={(event) => setRegistration((current) => ({ ...current, competitorDocument: event.target.value }))} /></div>
                      <div className="grid gap-1.5"><Label>Cidade</Label><SuggestionInput options={cityOptions} value={registration.competitorCity} onChange={(event) => setRegistration((current) => ({ ...current, competitorCity: event.target.value }))} placeholder="Digite ou escolha" /></div>
                      <div className="grid gap-1.5"><Label>UF</Label><SuggestionInput options={BRAZILIAN_UF_OPTIONS.map((value) => ({ value }))} maxLength={2} className="uppercase" value={registration.competitorUf} onChange={(event) => setRegistration((current) => ({ ...current, competitorUf: event.target.value.toUpperCase() }))} placeholder="Ex.: MG" /></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 font-bold text-primary">Animal</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label>Nome do animal *</Label>
                        <SuggestionInput
                          options={horseOptions}
                          value={registration.horseName}
                          placeholder="Digite um animal novo ou escolha uma sugestão"
                          onChange={(event) => setRegistration((current) => ({ ...current, horseName: event.target.value }))}
                          onSuggestionSelect={(option) => {
                            const found = registrationHistory.find(
                              (item) => item.horse_name.toLocaleLowerCase('pt-BR') === option.value.toLocaleLowerCase('pt-BR'),
                            )
                            if (!found) return
                            setRegistration((current) => ({
                              ...current,
                              horseName: found.horse_name,
                              horseRegistration: found.horse_registration ?? current.horseRegistration,
                              horseOwner: found.horse_owner ?? current.horseOwner,
                            }))
                          }}
                        />
                      </div>
                      <div className="grid gap-1.5"><Label>Registro</Label><Input value={registration.horseRegistration} onChange={(event) => setRegistration((current) => ({ ...current, horseRegistration: event.target.value }))} /></div>
                      <div className="grid gap-1.5"><Label>Proprietário</Label><Input value={registration.horseOwner} onChange={(event) => setRegistration((current) => ({ ...current, horseOwner: event.target.value }))} /></div>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Observações</Label>
                    <Textarea rows={3} value={registration.notes} onChange={(event) => setRegistration((current) => ({ ...current, notes: event.target.value }))} />
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <WalletCards className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold">Valor estimado da inscrição</p>
                        <p className="text-xs text-muted-foreground">Calculado por categoria, níveis selecionados e quantidade de etapas.</p>
                      </div>
                    </div>
                    <strong className="text-2xl text-primary">{formatCurrency(registrationAmountEstimate)}</strong>
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

        <TabsContent value="registrations" className="space-y-4">
          <div className="member-dashboard-card rounded-xl border border-zinc-800/60 bg-zinc-950/65 p-5 text-zinc-50 shadow-xl shadow-black/25 backdrop-blur-md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Inscrições e pagamentos</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Sua planilha de participação</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Consulte status, valor e comprovantes em uma lista só. As ações ficam no menu de três pontos.
                </p>
              </div>
              <Button className="member-dashboard-primary w-full active:scale-95 sm:w-auto" onClick={() => setSection('new')}>
                <PlusCircle className="h-4 w-4" />
                Nova inscrição
              </Button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Total</p>
                <p className="mt-1 text-2xl font-black">{requestsQuery.isPending || requestsQuery.error ? '--' : myRequests.length}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Em análise</p>
                <p className="mt-1 text-2xl font-black">{requestsQuery.isPending || requestsQuery.error ? '--' : pendingRequests}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">A pagar</p>
                <p className="mt-1 text-2xl font-black text-amber-400">{requestsQuery.isPending || requestsQuery.error ? '--' : formatCurrency(pendingPaymentAmount)}</p>
              </div>
            </div>
          </div>

          {requestsQuery.isLoading ? (
            <Card className="border-zinc-800/60 bg-zinc-950/60 text-zinc-400"><CardContent className="p-6 text-sm">Carregando suas inscrições...</CardContent></Card>
          ) : myRequests.length === 0 ? (
            <Card className="border-zinc-800/60 bg-zinc-950/60 text-zinc-50">
              <CardContent className="grid gap-4 p-6 text-sm text-zinc-400 sm:grid-cols-[1fr_auto] sm:items-center">
                <span>Você ainda não enviou nenhuma inscrição.</span>
                <Button className="member-dashboard-primary active:scale-95" onClick={() => setSection('new')}>Fazer primeira inscrição</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950/65 shadow-xl shadow-black/25 backdrop-blur-md md:block">
                <Table className="member-table-premium">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento e conjunto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Etapas</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((request) => {
                      const status = REQUEST_STATUS[request.status]
                      const payment = PAYMENT_STATUS[request.payment_status ?? 'pending']

                      return (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="font-semibold text-zinc-50">{request.event?.name ?? 'Evento'}</p>
                              <p className="mt-1 text-sm text-zinc-400">{request.competitor_name} com {request.horse_name}</p>
                              <p className="mt-1 text-xs text-zinc-500">Enviada em {formatDate(request.created_at)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-zinc-300">{registrationCategoryLabel(request)}</p>
                          </TableCell>
                          <TableCell className="text-zinc-300">{request.stages.join(', ')}</TableCell>
                          <TableCell>
                            <p className="font-black text-amber-400">{formatCurrency(request.amount_due ?? 0)}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex max-w-[220px] flex-wrap gap-2">
                              <Badge variant="outline" className={status.className}>{status.label}</Badge>
                              <Badge variant="outline" className={payment.className}>{payment.label}</Badge>
                            </div>
                            {request.payment_notes && <p className="mt-2 text-xs text-red-300">{request.payment_notes}</p>}
                            {request.admin_notes && <p className="mt-2 text-xs text-red-300">{request.admin_notes}</p>}
                          </TableCell>
                          <TableCell className="text-right">{renderRegistrationActions(request)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {myRequests.map((request) => {
                  const status = REQUEST_STATUS[request.status]
                  const payment = PAYMENT_STATUS[request.payment_status ?? 'pending']

                  return (
                    <Card key={request.id} className="member-dashboard-card border-zinc-800/60 bg-zinc-950/65 text-zinc-50 shadow-lg shadow-black/20 backdrop-blur-md">
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{request.event?.name ?? 'Evento'}</p>
                            <p className="mt-1 text-sm text-zinc-400">{request.competitor_name} com {request.horse_name}</p>
                          </div>
                          {renderRegistrationActions(request)}
                        </div>
                        <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-sm text-zinc-300">{registrationCategoryLabel(request)}</p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                            <span>Etapas {request.stages.join(', ')}</span>
                            <span className="font-black text-amber-400">{formatCurrency(request.amount_due ?? 0)}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={status.className}>{status.label}</Badge>
                            <Badge variant="outline" className={payment.className}>{payment.label}</Badge>
                          </div>
                        </div>
                        {request.admin_notes && <p className="text-sm text-red-300">{request.admin_notes}</p>}
                        {request.payment_notes && <p className="text-sm text-red-300">{request.payment_notes}</p>}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}

          <Dialog
            open={Boolean(receiptDialogRequest)}
            onOpenChange={(open) => {
              if (!open) {
                setReceiptDialogRequestId(null)
                setReceiptDialogMode('upload')
              }
            }}
          >
            {receiptDialogRequest && (
              <DialogContent className="border-zinc-800/80 bg-zinc-950/95 text-zinc-50 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle>{receiptDialogMode === 'preview' ? 'Comprovante enviado' : 'Enviar comprovante'}</DialogTitle>
                  <DialogDescription className="text-zinc-400">
                    {receiptDialogRequest.event?.name ?? 'Evento'} · {formatCurrency(receiptDialogRequest.amount_due ?? 0)}
                  </DialogDescription>
                </DialogHeader>

                {receiptDialogMode === 'preview' && receiptDialogRequest.payment_receipt_url ? (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    {isPdfAttachmentUrl(receiptDialogRequest.payment_receipt_url) ? (
                      <div className="grid gap-3 p-4">
                        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                          <FileText className="h-5 w-5 text-amber-400" />
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-50">Comprovante em PDF</p>
                            <a
                              href={receiptDialogRequest.payment_receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-amber-300 underline-offset-4 hover:underline"
                            >
                              Abrir arquivo em nova aba
                            </a>
                          </div>
                        </div>
                        <iframe
                          title="Comprovante em PDF"
                          src={receiptDialogRequest.payment_receipt_url}
                          className="h-[58vh] w-full rounded-lg bg-white"
                        />
                      </div>
                    ) : (
                      <img
                        src={receiptDialogRequest.payment_receipt_url}
                        alt="Comprovante de pagamento enviado"
                        className="max-h-[62vh] w-full object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                      Envie uma imagem ou PDF com até 10 MB. A organização valida o pagamento depois do envio.
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="member-receipt-file" className="text-zinc-200">Arquivo do comprovante</Label>
                      <Input
                        id="member-receipt-file"
                        type="file"
                        accept={PAYMENT_RECEIPT_ACCEPT}
                        className="border-white/10 bg-white/[0.04] text-zinc-50"
                        onChange={(event) => setReceiptFiles((current) => ({ ...current, [receiptDialogRequest.id]: event.target.files?.[0] }))}
                      />
                      {receiptFiles[receiptDialogRequest.id] && <p className="text-xs text-zinc-400">{receiptFiles[receiptDialogRequest.id]?.name}</p>}
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2 sm:space-x-0">
                  {receiptDialogMode === 'preview' && canUploadReceipt(receiptDialogRequest) && (
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10"
                      onClick={() => setReceiptDialogMode('upload')}
                    >
                      Trocar arquivo
                    </Button>
                  )}
                  {receiptDialogMode === 'upload' && (
                    <Button
                      className="member-dashboard-primary active:scale-95"
                      onClick={() => receiptMutation.mutate(receiptDialogRequest.id)}
                      disabled={receiptMutation.isPending || !receiptFiles[receiptDialogRequest.id]}
                    >
                      <ImagePlus className="h-4 w-4" />
                      {receiptMutation.isPending ? 'Enviando...' : 'Enviar comprovante'}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
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
                <div className="grid gap-2 rounded-lg border bg-muted/25 p-3">
                  <Label htmlFor="suggestion-attachment">Anexo opcional</Label>
                  <Input
                    id="suggestion-attachment"
                    type="file"
                    accept={EVIDENCE_ATTACHMENT_ACCEPT}
                    onChange={(event) => setSuggestionAttachmentFile(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">Use imagem ou PDF até 10 MB para enviar evidências, prints ou documentos.</p>
                  {suggestionAttachmentFile && (
                    <p className="inline-flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      {suggestionAttachmentFile.name}
                    </p>
                  )}
                </div>
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
                    {suggestion.attachment_url && (
                      <a
                        href={suggestion.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-md border bg-muted/35 px-3 py-2 text-sm font-semibold text-primary hover:bg-muted"
                      >
                        {isPdfAttachmentUrl(suggestion.attachment_url) ? <FileText className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                        {suggestion.attachment_name ?? 'Ver anexo'}
                      </a>
                    )}
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
