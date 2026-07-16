import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminLayout } from '@/components/admin-layout'
import { CategoryManager } from '@/components/category-manager'
import { CompetitorManager } from '@/components/competitor-manager'
import { EventFormDialog } from '@/components/event-form-dialog'
import { DeleteEventDialog } from '@/components/delete-event-dialog'
import { EntryManager } from '@/components/entry-manager'
import { FinancialManager } from '@/components/financial-manager'
import { ImportExportPanel } from '@/components/import-export-panel'
import { HorseManager } from '@/components/horse-manager'
import { ProtectedRoute } from '@/components/protected-route'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/providers/auth-provider'
import { getCategories, getCompetitors, getEntries, getEventById, getHorses, getScores } from '@/services/api'

export const Route = createFileRoute('/admin/events/$eventId')({
  component: AdminEventPage,
})

function AdminEventPage() {
  const { eventId } = Route.useParams()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(() => window.location.hash === '#inscricoes' ? 'entries' : 'overview')

  const isAdmin = profile?.role === 'admin'

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => getEventById(eventId) })
  const categoriesQuery = useQuery({ queryKey: ['categories', eventId], queryFn: () => getCategories(eventId) })
  const competitorsQuery = useQuery({ queryKey: ['competitors', 'event-panel'], queryFn: () => getCompetitors('') })
  const horsesQuery = useQuery({ queryKey: ['horses', 'event-panel'], queryFn: () => getHorses('') })
  const entriesQuery = useQuery({ queryKey: ['entries', eventId, 'panel'], queryFn: () => getEntries(eventId) })
  const scoresQuery = useQuery({ queryKey: ['scores', eventId, 'panel'], queryFn: () => getScores(eventId) })

  const stats = useMemo(
    () => ({
      categories: categoriesQuery.data?.length ?? 0,
      competitors: competitorsQuery.data?.length ?? 0,
      horses: horsesQuery.data?.length ?? 0,
      entries: entriesQuery.data?.length ?? 0,
      scores: scoresQuery.data?.length ?? 0,
    }),
    [categoriesQuery.data, competitorsQuery.data, entriesQuery.data, horsesQuery.data, scoresQuery.data],
  )

  return (
    <ProtectedRoute allowedRoles={['admin', 'judge']}>
      <AdminLayout title="Painel do Evento" eventId={eventId}>
        {!eventQuery.data ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Carregando evento...</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-3xl text-primary">{eventQuery.data.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {eventQuery.data.location || 'Local não informado'} | {eventQuery.data.starts_on || '--'} até {eventQuery.data.ends_on || '--'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge type="event" status={eventQuery.data.status} />
                  {isAdmin && (
                    <EventFormDialog
                      triggerLabel="Editar evento"
                      event={eventQuery.data}
                      onSaved={() => {
                        void queryClient.invalidateQueries({ queryKey: ['event', eventId] })
                        void queryClient.invalidateQueries({ queryKey: ['admin-events'] })
                      }}
                    />
                  )}
                  <Button asChild>
                    <Link to="/admin/events/$eventId/scores" params={{ eventId }}>
                      Lançamento ao vivo
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/events/$eventId" params={{ eventId }}>
                      Ranking público
                    </Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>

            <Tabs id="inscricoes" value={activeTab} onValueChange={setActiveTab} className="scroll-mt-36 space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="overview">Resumo</TabsTrigger>
                <TabsTrigger value="categories">Categorias</TabsTrigger>
                <TabsTrigger value="records">Bases</TabsTrigger>
                <TabsTrigger value="entries">Inscrições</TabsTrigger>
                {isAdmin && <TabsTrigger value="finance">Financeiro</TabsTrigger>}
                <TabsTrigger value="import-export">Importar</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Categorias</p><p className="text-2xl font-semibold">{stats.categories}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Competidores</p><p className="text-2xl font-semibold">{stats.competitors}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cavalos</p><p className="text-2xl font-semibold">{stats.horses}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Inscrições</p><p className="text-2xl font-semibold">{stats.entries}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Notas lançadas</p><p className="text-2xl font-semibold">{stats.scores}</p></CardContent></Card>
                </div>

                <Card className="mt-3">
                  <CardContent className="flex flex-wrap gap-2 p-4">
                    <Button asChild><Link to="/admin/events/$eventId/scores" params={{ eventId }}>Abrir prova e lançar notas</Link></Button>
                    <Button variant="outline" asChild>
                      <Link to="/events/$eventId" params={{ eventId }}>Ver ranking</Link>
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('import-export')}>Importar planilha</Button>
                    {isAdmin && <Button variant="outline" onClick={() => setActiveTab('finance')}>Abrir financeiro</Button>}
                  </CardContent>
                </Card>

                {isAdmin && (
                  <Card className="mt-3 border-red-200">
                    <CardHeader><CardTitle className="text-red-700">Zona de perigo</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-2xl text-sm text-muted-foreground">Exclui definitivamente este evento e os cadastros operacionais vinculados a ele.</p>
                      <DeleteEventDialog event={eventQuery.data} onDeleted={() => void navigate({ to: '/admin' })} />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="categories">
                <CategoryManager eventId={eventId} canEdit={isAdmin} />
              </TabsContent>

              <TabsContent value="records">
                <Tabs defaultValue="competitors" className="space-y-4">
                  <TabsList className="grid h-auto w-full max-w-md grid-cols-2">
                    <TabsTrigger value="competitors">Competidores</TabsTrigger>
                    <TabsTrigger value="horses">Cavalos</TabsTrigger>
                  </TabsList>
                  <TabsContent value="competitors">
                    <CompetitorManager canEdit={isAdmin} />
                  </TabsContent>
                  <TabsContent value="horses">
                    <HorseManager canEdit={isAdmin} />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="entries">
                <EntryManager eventId={eventId} canEdit={isAdmin} />
              </TabsContent>

              {isAdmin && <TabsContent value="finance"><FinancialManager eventId={eventId} /></TabsContent>}

              <TabsContent value="import-export">
                {isAdmin ? (
                  <ImportExportPanel eventId={eventId} currentUserId={profile?.id ?? ''} />
                ) : (
                  <Card>
                    <CardContent className="p-6 text-sm text-muted-foreground">
                      Apenas administradores podem importar e exportar bases.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  )
}
