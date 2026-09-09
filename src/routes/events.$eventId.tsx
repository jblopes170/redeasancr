import { PageHeading } from '@/components/page-heading'
import { SiteFooter } from '@/components/site-footer'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { RankingTable } from '@/components/ranking-table'
import { SiteHeader } from '@/components/site-header'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
      <main id="main-content" className="page-container workspace-content">
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
            <PageHeading title={event.name} description={event.location || 'Local a definir'} eyebrow="Evento NTMR" actions={<><Button variant="outline" asChild><Link to="/eventos">Todos os eventos</Link></Button>{event.status !== 'finished' && <Button asChild><Link to="/minha-area" hash="nova-inscricao">Fazer inscrição</Link></Button>}</>} />
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><StatusBadge type="event" status={event.status} /><span>{event.starts_on ? new Date(event.starts_on+'T00:00:00').toLocaleDateString('pt-BR') : 'Data a definir'}</span></div>
            <RankingTable key={event.id} eventId={event.id} />

            {(newsQuery.data ?? []).length > 0 && (
              <section className="space-y-3">
                <h2 className="font-serif text-2xl font-semibold">Atualizações do evento</h2>
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


          </div>
        )}
      </main><SiteFooter />
    </div>
  )
}
