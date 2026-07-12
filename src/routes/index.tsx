import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CircleDollarSign, Newspaper, Trophy } from 'lucide-react'

import heroImage from '@/assets/hero.png'
import { EventCard } from '@/components/event-card'
import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/providers/auth-provider'
import { getPublicEvents, getPublicNews } from '@/services/api'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

function HomePage() {
  const { session } = useAuth()
  const eventsQuery = useQuery({ queryKey: ['public-events'], queryFn: getPublicEvents })
  const newsQuery = useQuery({ queryKey: ['public-news'], queryFn: () => getPublicNews(undefined, 6) })

  const events = eventsQuery.data ?? []
  const news = newsQuery.data ?? []
  const totalPrize = events.reduce((total, event) => total + Number(event.prize_pool || 0), 0)

  return (
    <div className="min-h-screen" id="inicio">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary via-red-800 to-neutral-900 text-primary-foreground shadow-2xl shadow-primary/20">
          <img src={heroImage} alt="Competidor em prova de rédeas" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/65 via-primary/50 to-transparent" />
          <div className="relative grid min-h-[420px] content-between gap-10 p-6 md:grid-cols-[1.45fr_0.75fr] md:p-10">
            <div className="self-center space-y-5">
              <Badge className="border-white/25 bg-white/10 text-white hover:bg-white/15">Sistema oficial NTMR</Badge>
              <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.95] sm:text-6xl lg:text-7xl">A prova acontece. O ranking responde na hora.</h1>
              <p className="max-w-2xl text-base text-white/85 sm:text-lg">
                Inscrições, notas, pontos e resultados do Núcleo Triângulo Mineiro de Rédeas em um só lugar.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" variant="secondary" asChild>
                  <Link to={session ? '/minha-area' : '/login'}>{session ? 'Abrir minha área' : 'Fazer inscrição'}</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/45 bg-transparent text-white hover:bg-white/10 hover:text-white" asChild>
                  <Link to="/ranking"><Trophy className="mr-2 h-4 w-4" />Ranking ao vivo</Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 self-end md:grid-cols-1">
              <div className="rounded-xl border border-white/20 bg-black/20 p-4 backdrop-blur-sm">
                <CalendarDays className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-3xl font-extrabold">{events.length}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-white/70">Eventos publicados</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/20 p-4 backdrop-blur-sm">
                <CircleDollarSign className="h-5 w-5 text-amber-300" />
                <p className="mt-3 text-2xl font-extrabold">{formatCurrency(totalPrize)}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-white/70">Bolsa anunciada</p>
              </div>
            </div>
          </div>
        </section>

        <section id="calendario" className="scroll-mt-44 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Calendário oficial</p>
              <h2 className="text-3xl font-extrabold">Eventos e resultados</h2>
            </div>
            <Button variant="outline" asChild><Link to="/ranking">Consultar todos os rankings</Link></Button>
          </div>

          {eventsQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando eventos publicados...</CardContent></Card>
          ) : eventsQuery.error ? (
            <Alert variant="destructive"><AlertTitle>Não foi possível carregar os eventos</AlertTitle><AlertDescription>{eventsQuery.error.message}</AlertDescription></Alert>
          ) : events.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum evento publicado no momento.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </section>

        <section id="noticias" className="scroll-mt-44 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Central NTMR</p>
            <h2 className="text-3xl font-extrabold">Notícias e comunicados</h2>
          </div>

          {newsQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando publicações...</CardContent></Card>
          ) : newsQuery.error ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">As publicações ficarão disponíveis após a configuração do portal.</CardContent></Card>
          ) : news.length === 0 ? (
            <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><Newspaper className="h-5 w-5" />Nenhuma notícia publicada ainda.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {news.map((post) => (
                <Card key={post.id} className={post.featured ? 'border-primary/40 shadow-lg shadow-primary/10' : ''}>
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={post.featured ? 'default' : 'outline'}>{post.post_type === 'event_update' ? 'Evento' : 'Notícia'}</Badge>
                      {post.event && <span className="text-xs font-semibold text-muted-foreground">{post.event.name}</span>}
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold text-primary">{post.title}</h3>
                    <p className="mt-2 flex-1 whitespace-pre-line text-sm text-muted-foreground">{post.summary || post.content}</p>
                    <div className="mt-5 flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                      <span>{new Date(post.published_at ?? post.created_at).toLocaleDateString('pt-BR')}</span>
                      {post.event && <Button size="sm" variant="ghost" asChild><Link to="/events/$eventId" params={{ eventId: post.event.id }}>Ver evento</Link></Button>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 rounded-2xl border border-primary/20 bg-card p-6 shadow-lg shadow-primary/10 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-primary">Tudo pronto para acompanhar a temporada</h2>
            <p className="mt-1 text-sm text-muted-foreground">Crie sua conta para solicitar inscrições e enviar sugestões. O ranking permanece aberto para todos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to={session ? '/minha-area' : '/login'}>{session ? 'Minha área' : 'Criar conta'}</Link></Button>
            <Button variant="outline" asChild><Link to="/ranking">Ver resultados</Link></Button>
          </div>
        </section>
      </main>
    </div>
  )
}
