import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarDays, Radio } from 'lucide-react'

import { AdminLayout } from '@/components/admin-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/providers/auth-provider'
import { getAdminEvents } from '@/services/api'

export const Route = createFileRoute('/admin/live')({
  component: LiveCenterPage,
})

function formatDate(value: string | null) {
  if (!value) return '--'
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

function LiveCenterPage() {
  const { profile } = useAuth()
  const eventsQuery = useQuery({ queryKey: ['admin-events', 'live-center'], queryFn: getAdminEvents })
  const isAdmin = profile?.role === 'admin'
  const events = (eventsQuery.data ?? []).filter((event) => isAdmin || event.status === 'active')

  return (
    <ProtectedRoute allowedRoles={['admin', 'judge']}>
      <AdminLayout title="Lançamento ao vivo">
        <div className="space-y-6">
          <section className="rounded-xl border border-primary/20 bg-primary px-5 py-6 text-primary-foreground shadow-sm sm:px-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground/75"><Radio className="h-4 w-4" />Central da prova</p>
                <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Escolha o evento para lançar notas</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-primary-foreground/80">Tela exclusiva para lançar notas com rapidez, acompanhar o ranking e atualizar a classificação ao vivo.</p>
              </div>
              <Radio className="hidden h-16 w-16 text-primary-foreground/25 sm:block" />
            </div>
          </section>

          {eventsQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando provas...</CardContent></Card>
          ) : eventsQuery.error ? (
            <Alert variant="destructive"><AlertTitle>Não foi possível carregar os eventos</AlertTitle><AlertDescription>{eventsQuery.error.message}</AlertDescription></Alert>
          ) : events.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum evento disponível para lançamento de notas.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="border-primary/15 shadow-sm">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="font-serif text-2xl leading-tight">{event.name}</CardTitle>
                      <StatusBadge type="event" status={event.status} />
                    </div>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />{formatDate(event.starts_on)} a {formatDate(event.ends_on)}</p>
                    <p className="text-sm text-muted-foreground">{event.location || 'Local não informado'}</p>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full gap-2" asChild>
                      <Link to="/admin/events/$eventId/scores" params={{ eventId: event.id }}>
                        Abrir lançamento ao vivo <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}
