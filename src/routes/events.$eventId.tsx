import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { RankingTable } from '@/components/ranking-table'
import { SiteHeader } from '@/components/site-header'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/providers/auth-provider'
import { getEventById, getPublicNews } from '@/services/api'

export const Route = createFileRoute('/events/$eventId')({
  component: EventPublicPage,
})

function EventPublicPage() {
  const { eventId } = Route.useParams()
  const { profile } = useAuth()

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEventById(eventId),
  })
  const newsQuery = useQuery({
    queryKey: ['public-news', eventId],
    queryFn: () => getPublicNews(eventId, 8),
  })

  const event = eventQuery.data
  const isPrivileged = profile?.role === 'admin' || profile?.role === 'judge'
  const canView = !!event && (['active', 'finished', 'published'].includes(event.status) || isPrivileged)

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {eventQuery.isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Carregando evento...</CardContent>
          </Card>
        ) : !event || !canView ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm text-muted-foreground">
                Este evento não está disponível para visualização pública.
              </p>
              <Button asChild variant="outline">
                <Link to="/">Voltar para início</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl text-primary">{event.name}</CardTitle>
                <div className="text-sm text-muted-foreground">
                  {event.location || 'Local não informado'} | {event.starts_on || '--'} a {event.ends_on || '--'}
                </div>
                <StatusBadge type="event" status={event.status} />
              </CardHeader>
            </Card>

            {(newsQuery.data ?? []).length > 0 && (
              <section className="space-y-3">
                <h2 className="text-2xl font-extrabold">Publicações do evento</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {(newsQuery.data ?? []).map((post) => (
                    <Card key={post.id} className={post.featured ? 'border-primary/35' : ''}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={post.featured ? 'default' : 'outline'}>Comunicado</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.published_at ?? post.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-primary">{post.title}</h3>
                        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{post.summary || post.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <RankingTable eventId={event.id} />
          </div>
        )}
      </main>
    </div>
  )
}
