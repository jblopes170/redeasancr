import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Radio, Trophy } from 'lucide-react'

import { AdminLayout } from '@/components/admin-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { ScoreLaunchPanel } from '@/components/score-launch-panel'
import { StatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/providers/auth-provider'
import { getEventById } from '@/services/api'

export const Route = createFileRoute('/admin/events/$eventId/scores')({
  component: LiveScorePage,
})

function LiveScorePage() {
  const { eventId } = Route.useParams()
  const { profile } = useAuth()
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => getEventById(eventId) })
  const isAdmin = profile?.role === 'admin'
  const isJudge = profile?.role === 'judge'

  return (
    <ProtectedRoute allowedRoles={['admin', 'judge']}>
      <AdminLayout title="Lançamento de Notas" eventId={eventId}>
        <div className="space-y-6">
          <section className="flex flex-col gap-4 border-b border-outline/20 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Radio className="h-4 w-4" />Central da prova ao vivo</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Tela exclusiva para acompanhar o pódio, localizar a próxima passada e salvar notas com rapidez.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild><Link to="/admin/events/$eventId" params={{ eventId }}><ArrowLeft className="h-4 w-4" />Voltar ao evento</Link></Button>
              <Button variant="outline" asChild><Link to="/events/$eventId" params={{ eventId }}><Trophy className="h-4 w-4" />Ranking público<ExternalLink className="h-3.5 w-3.5" /></Link></Button>
            </div>
          </section>

          {eventQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Preparando a central da prova...</CardContent></Card>
          ) : eventQuery.error ? (
            <Alert variant="destructive"><AlertTitle>Não foi possível abrir a prova</AlertTitle><AlertDescription>{eventQuery.error.message}</AlertDescription></Alert>
          ) : eventQuery.data ? (
            <>
              <div className="flex flex-col gap-3 border border-outline/20 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 className="font-serif text-3xl font-semibold text-foreground">{eventQuery.data.name}</h2><p className="mt-1 text-sm text-muted-foreground">{eventQuery.data.location || 'Local não informado'}</p></div>
                <StatusBadge type="event" status={eventQuery.data.status} />
              </div>
              <ScoreLaunchPanel
                event={eventQuery.data}
                currentUserId={profile?.id ?? ''}
                isAdmin={isAdmin}
                isJudge={isJudge}
                showLiveRanking
                allowEntryManagement={false}
              />
            </>
          ) : null}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  )
}
