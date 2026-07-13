import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, CircleDollarSign, Newspaper, Trophy } from 'lucide-react'

import heroImage from '@/assets/hero-reining.webp'
import { EventCard } from '@/components/event-card'
import { HorseTrail } from '@/components/horse-trail'
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

      <main className="mx-auto w-full max-w-7xl space-y-14 px-4 py-10 sm:px-6 lg:py-14">
        <section className="relative grid overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
          <HorseTrail className="z-0 opacity-20" />
          <div className="relative z-10 flex flex-col justify-center space-y-6 p-6 md:p-10 lg:p-12">
            <Badge className="w-fit bg-primary text-primary-foreground hover:bg-primary">Sistema oficial NTMR</Badge>
            <div className="space-y-4">
              <h1 className="font-headline-lg max-w-3xl text-primary">Ranking de Redeas simples, rapido e ao vivo.</h1>
              <p className="font-body-md max-w-2xl text-lg text-muted-foreground">
                Inscricoes, notas, pontos e resultados do Nucleo Triangulo Mineiro de Redeas em uma experiencia organizada para secretaria, juizes e publico.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to={session ? '/minha-area' : '/login'}>{session ? 'Abrir minha area' : 'Fazer inscricao'}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/ranking"><Trophy className="mr-2 h-4 w-4" />Ranking ao vivo</Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden bg-muted">
            <img src={heroImage} alt="Competidor em prova de redeas" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-transparent to-black/10" />
            <div className="absolute inset-x-4 bottom-4 grid grid-cols-2 gap-3 sm:left-auto sm:w-[420px]">
              <div className="rounded-2xl border border-white/45 bg-white/90 p-4 shadow-sm backdrop-blur">
                <CalendarDays className="h-5 w-5 text-primary" />
                <p className="mt-3 text-3xl font-extrabold text-foreground">{events.length}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Eventos publicados</p>
              </div>
              <div className="rounded-2xl border border-white/45 bg-white/90 p-4 shadow-sm backdrop-blur">
                <CircleDollarSign className="h-5 w-5 text-primary" />
                <p className="mt-3 text-2xl font-extrabold text-foreground">{formatCurrency(totalPrize)}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Bolsa anunciada</p>
              </div>
            </div>
          </div>
        </section>

        <section id="calendario" className="scroll-mt-44 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Calendario oficial</p>
              <h2 className="font-headline-md text-foreground">Eventos e resultados</h2>
            </div>
            <Button variant="outline" asChild><Link to="/ranking">Consultar todos os rankings</Link></Button>
          </div>

          {eventsQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando eventos publicados...</CardContent></Card>
          ) : eventsQuery.error ? (
            <Alert variant="destructive"><AlertTitle>Nao foi possivel carregar os eventos</AlertTitle><AlertDescription>{eventsQuery.error.message}</AlertDescription></Alert>
          ) : events.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum evento publicado no momento.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {events.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          )}
        </section>

        <section id="como-funciona" className="scroll-mt-44 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Como funciona</p>
              <h2 className="font-headline-md text-foreground">Fluxo simples para prova ao vivo.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-muted/35 p-4">
                <p className="text-xl font-extrabold text-primary">1</p>
                <p className="font-bold text-foreground">Inscreve</p>
                <p className="text-sm text-muted-foreground">Competidor, animal, categoria, etapa e niveis.</p>
              </div>
              <div className="rounded-2xl border bg-muted/35 p-4">
                <p className="text-xl font-extrabold text-primary">2</p>
                <p className="font-bold text-foreground">Lanca nota</p>
                <p className="text-sm text-muted-foreground">Admin registra a nota na hora da passada.</p>
              </div>
              <div className="rounded-2xl border bg-muted/35 p-4">
                <p className="text-xl font-extrabold text-primary">3</p>
                <p className="font-bold text-foreground">Acompanha</p>
                <p className="text-sm text-muted-foreground">Ranking atualiza para publico e organizacao.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-[2rem] border border-gray-200 bg-white p-7 shadow-sm md:p-10">
          <div className="mx-auto max-w-4xl space-y-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Ranking oficial</p>
            <h2 className="font-headline-md text-foreground">Pódio, pontos e premiação em uma leitura só.</h2>
            <p className="font-body-md text-muted-foreground">
              A visualização foi pensada para ficar parecida com a planilha oficial, mas com atualização ao vivo: uma linha por conjunto, níveis na mesma linha e premiação calculada ao lado.
            </p>
            <div className="grid gap-3 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl border bg-muted/40 p-4">
                <p className="text-2xl font-extrabold text-primary">1</p>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Conjunto por linha</p>
              </div>
              <div className="rounded-2xl border bg-muted/40 p-4">
                <p className="text-2xl font-extrabold text-primary">N1-N4</p>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Níveis juntos</p>
              </div>
              <div className="rounded-2xl border bg-muted/40 p-4">
                <p className="text-2xl font-extrabold text-primary">Ao vivo</p>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Notas e ranking</p>
              </div>
            </div>
          </div>
        </section>

        <section id="noticias" className="scroll-mt-44 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Central NTMR</p>
            <h2 className="font-headline-md text-foreground">Noticias e comunicados</h2>
          </div>

          {newsQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando publicacoes...</CardContent></Card>
          ) : newsQuery.error ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">As publicacoes ficarao disponiveis apos a configuracao do portal.</CardContent></Card>
          ) : news.length === 0 ? (
            <Card><CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground"><Newspaper className="h-5 w-5" />Nenhuma noticia publicada ainda.</CardContent></Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {news.map((post) => (
                <Card key={post.id} className={post.featured ? 'border-primary/30 shadow-md' : ''}>
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={post.featured ? 'default' : 'outline'}>{post.post_type === 'event_update' ? 'Evento' : 'Noticia'}</Badge>
                      {post.event && <span className="text-xs font-semibold text-muted-foreground">{post.event.name}</span>}
                    </div>
                    <h3 className="mt-4 font-serif text-2xl font-bold text-primary">{post.title}</h3>
                    <p className="mt-2 flex-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{post.summary || post.content}</p>
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

        <section className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-headline-md text-primary">Tudo pronto para acompanhar a temporada</h2>
            <p className="mt-2 text-sm text-muted-foreground">Crie sua conta para solicitar inscricoes e enviar sugestoes. O ranking permanece aberto para todos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to={session ? '/minha-area' : '/login'}>{session ? 'Minha area' : 'Criar conta'}</Link></Button>
            <Button variant="outline" asChild><Link to="/ranking">Ver resultados</Link></Button>
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t border-gray-200 bg-muted/60 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center md:flex-row md:text-left">
          <span className="font-serif text-2xl font-bold text-primary">NTMR</span>
          <p className="text-sm text-muted-foreground">Nucleo Triangulo Mineiro de Redeas. Todos os direitos reservados.</p>
          <div className="flex flex-wrap justify-center gap-5 text-sm font-semibold text-secondary">
            <Link to="/" hash="inicio" className="hover:text-primary">Inicio</Link>
            <Link to="/ranking" className="hover:text-primary">Ranking</Link>
            <Link to="/" hash="como-funciona" className="hover:text-primary">Como funciona</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

