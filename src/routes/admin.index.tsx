import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Gauge, KeyRound, Megaphone, Newspaper, Trophy } from 'lucide-react'

import { AdminLayout } from '@/components/admin-layout'
import { EventCard } from '@/components/event-card'
import { EventFormDialog } from '@/components/event-form-dialog'
import { ProtectedRoute } from '@/components/protected-route'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/providers/auth-provider'
import {
  getAdminEvents,
  getAdminNews,
  getAdminRegistrationRequests,
  getAdminSuggestions,
} from '@/services/api'

export const Route = createFileRoute('/admin/')({
  component: AdminIndexPage,
})

function AdminIndexPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const eventsQuery = useQuery({ queryKey: ['admin-events'], queryFn: getAdminEvents })
  const requestsQuery = useQuery({
    queryKey: ['admin-registration-requests'],
    queryFn: () => getAdminRegistrationRequests(),
    enabled: isAdmin,
  })
  const suggestionsQuery = useQuery({
    queryKey: ['admin-suggestions'],
    queryFn: () => getAdminSuggestions(),
    enabled: isAdmin,
  })
  const newsQuery = useQuery({ queryKey: ['admin-news'], queryFn: getAdminNews, enabled: isAdmin })

  const events = eventsQuery.data ?? []
  const pendingRequests = (requestsQuery.data ?? []).filter((item) => item.status === 'pending').length
  const newSuggestions = (suggestionsQuery.data ?? []).filter((item) => item.status === 'new').length
  const publishedNews = (newsQuery.data ?? []).filter((item) => item.status === 'published').length
  const portalError = requestsQuery.error ?? suggestionsQuery.error ?? newsQuery.error

  return (
    <ProtectedRoute allowedRoles={['admin', 'judge']}>
      <AdminLayout title="Painel Administrativo">
        <div className="space-y-6">
          <section>
            <div className="mb-3">
              <h2 className="text-xl font-extrabold">Fluxo de trabalho</h2>
              <p className="text-sm text-muted-foreground">Acesse cada tarefa sem passar por telas repetidas.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Card className="border-primary/25">
                <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                  <div>
                    <Gauge className="h-7 w-7 text-primary" />
                    <h3 className="mt-3 text-lg font-bold">1. Eventos</h3>
                    <p className="text-sm text-muted-foreground">Crie etapas e abra o painel operacional da prova.</p>
                  </div>
                  {isAdmin ? (
                    <EventFormDialog
                      triggerLabel="Criar novo evento"
                      onSaved={() => void queryClient.invalidateQueries({ queryKey: ['admin-events'] })}
                    />
                  ) : (
                    <Button asChild><a href="#admin-events">Escolher evento</a></Button>
                  )}
                </CardContent>
              </Card>

              {isAdmin && (
                <Card>
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><ClipboardCheck className="h-7 w-7 text-primary" /><h3 className="mt-3 text-lg font-bold">2. Inscrições</h3></div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {pendingRequests > 0 && <Badge>{pendingRequests} pendentes</Badge>}
                        {newSuggestions > 0 && <Badge variant="secondary">{newSuggestions} sugestões</Badge>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Aprove solicitações ou use o cadastro manual dentro do evento.</p>
                    <Button variant="outline" asChild><Link to="/admin/requests">Abrir atendimento</Link></Button>
                  </CardContent>
                </Card>
              )}

              <Card className="border-primary/25">
                <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                  <div>
                    <Megaphone className="h-7 w-7 text-primary" />
                    <h3 className="mt-3 text-lg font-bold">{isAdmin ? '3.' : '2.'} Prova e notas</h3>
                    <p className="text-sm text-muted-foreground">Escolha o evento abaixo para inscrever, ordenar entradas e lançar notas.</p>
                  </div>
                  <Button asChild><a href="#admin-events">Ir para os eventos</a></Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                  <div>
                    <Trophy className="h-7 w-7 text-primary" />
                    <h3 className="mt-3 text-lg font-bold">{isAdmin ? '4.' : '3.'} Resultados</h3>
                    <p className="text-sm text-muted-foreground">Confira exatamente o ranking que o público acompanha.</p>
                  </div>
                  <Button variant="outline" asChild><Link to="/ranking">Ver ranking público</Link></Button>
                </CardContent>
              </Card>

              {isAdmin && (
                <Card>
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><Newspaper className="h-7 w-7 text-primary" /><h3 className="mt-3 text-lg font-bold">Publicações</h3></div>
                      {publishedNews > 0 && <Badge variant="outline">{publishedNews} publicadas</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">Publique notícias gerais e atualizações de cada evento.</p>
                    <Button variant="outline" asChild><Link to="/admin/content">Gerenciar notícias</Link></Button>
                  </CardContent>
                </Card>
              )}

              {isAdmin && (
                <Card>
                  <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                    <div><KeyRound className="h-7 w-7 text-primary" /><h3 className="mt-3 text-lg font-bold">Acessos</h3></div>
                    <p className="text-sm text-muted-foreground">Defina administradores, juízes e usuários ativos.</p>
                    <Button variant="outline" asChild><Link to="/admin/access">Gerenciar acessos</Link></Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {isAdmin && portalError && (
            <Alert variant="destructive">
              <AlertTitle>Portal ainda não configurado no Supabase</AlertTitle>
              <AlertDescription>{portalError instanceof Error ? portalError.message : 'Execute a migration do portal.'}</AlertDescription>
            </Alert>
          )}

          <section id="admin-events" className="scroll-mt-44 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold text-primary">Eventos e operação da prova</h2>
                <p className="text-sm text-muted-foreground">Entre no evento para cadastrar inscrições e lançar as notas.</p>
              </div>
              {isAdmin && (
                <EventFormDialog
                  triggerLabel="Novo evento"
                  onSaved={() => void queryClient.invalidateQueries({ queryKey: ['admin-events'] })}
                />
              )}
            </div>

            {eventsQuery.isLoading ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando eventos...</CardContent></Card>
            ) : eventsQuery.error ? (
              <Alert variant="destructive"><AlertTitle>Erro ao carregar eventos</AlertTitle><AlertDescription>{eventsQuery.error.message}</AlertDescription></Alert>
            ) : events.length === 0 ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum evento cadastrado.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {events.map((event) => <EventCard key={event.id} event={event} admin />)}
              </div>
            )}
          </section>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}
