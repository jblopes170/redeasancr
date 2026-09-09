import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { AdminLayout } from '@/components/admin-layout'
import { ScoreLaunchPanel } from '@/components/score-launch-panel'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { getEventById } from '@/services/api'
export const Route = createFileRoute('/admin/events/$eventId/scores')({ component: LiveScorePage })
function LiveScorePage() {
  const { eventId } = Route.useParams()
  const { profile } = useAuth()
  const query = useQuery({ queryKey: ['event', eventId], queryFn: () => getEventById(eventId) })
  return <AdminLayout title="Lançar notas" eventId={eventId} description={query.data?.name} actions={<><Button variant="ghost" size="sm" asChild><Link to="/admin/events/$eventId" params={{ eventId }}><ArrowLeft className="h-4 w-4" />Evento</Link></Button><Button variant="outline" size="sm" asChild><Link to="/events/$eventId" params={{ eventId }} target="_blank" rel="noopener noreferrer">Ranking público<ExternalLink className="h-4 w-4" /></Link></Button></>}>
    {query.isPending ? <p role="status">Preparando a prova...</p> : query.error ? <p role="alert" className="text-destructive">{query.error.message}</p> : query.data ? <ScoreLaunchPanel event={query.data} currentUserId={profile?.id ?? ''} isAdmin={profile?.role === 'admin'} isJudge={profile?.role === 'judge'} showLiveRanking allowEntryManagement={false} /> : <p className="empty-state">Evento não encontrado.</p>}
  </AdminLayout>
}
