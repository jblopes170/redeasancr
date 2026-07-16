import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CalendarDays, CheckCircle2, Newspaper, Trophy } from 'lucide-react'

import { EventCard } from '@/components/event-card'
import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { homeHeroPath, newsRiderPath } from '@/lib/brand-assets'
import { useAuth } from '@/providers/auth-provider'
import { getPublicEvents, getPublicNews } from '@/services/api'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { session } = useAuth()
  const eventsQuery = useQuery({ queryKey: ['public-events'], queryFn: getPublicEvents })
  const newsQuery = useQuery({ queryKey: ['public-news'], queryFn: () => getPublicNews(undefined, 6) })
  const events = eventsQuery.data ?? []
  const news = newsQuery.data ?? []
  const featuredPost = news.find((post) => post.featured) ?? news[0]

  return (
    <div className="min-h-screen" id="inicio">
      <SiteHeader />

      <section className="relative isolate min-h-[560px] overflow-hidden bg-primary text-white lg:min-h-[650px]">
        <img src={homeHeroPath} alt="Competidor executando uma manobra de rédeas" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
        <div className="mx-auto flex min-h-[560px] max-w-[1440px] items-center px-5 py-16 sm:px-8 lg:min-h-[650px] lg:px-12">
          <div className="max-w-3xl">
            <Badge className="mb-6 border-white/25 bg-white/10 text-white backdrop-blur">Temporada oficial NTMR</Badge>
            <h1 className="font-headline-lg text-white">Campeonato de Rédeas NTMR</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">Inscrições, notas e classificação ao vivo para competidores, organização e público acompanharem cada passada.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
                <Link to={session ? '/minha-area' : '/login'}>{session ? 'Abrir minha área' : 'Ver próxima etapa e inscrever-se'}<ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/60 bg-black/15 text-white hover:bg-white hover:text-foreground" asChild><Link to="/ranking"><Trophy className="h-4 w-4" />Ranking ao vivo</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1440px] space-y-20 px-4 py-16 sm:px-6 lg:px-8">
        <section id="calendario" className="scroll-mt-36 space-y-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow"><CalendarDays className="h-4 w-4" />Calendário oficial</p><h2 className="font-headline-md">Próximos eventos</h2><p className="mt-2 text-muted-foreground">Acompanhe as etapas, inscrições e resultados do campeonato.</p></div>
            <Button variant="link" asChild><Link to="/ranking">Ver classificação completa<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {eventsQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando eventos publicados...</CardContent></Card>
          ) : eventsQuery.error ? (
            <Alert variant="destructive"><AlertTitle>Não foi possível carregar os eventos</AlertTitle><AlertDescription>{eventsQuery.error.message}</AlertDescription></Alert>
          ) : events.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum evento publicado no momento.</CardContent></Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>
          )}
        </section>

        <section id="noticias" className="scroll-mt-36 grid gap-8 border-y py-14 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
          <div>
            <p className="eyebrow"><Newspaper className="h-4 w-4" />Central NTMR</p>
            <h2 className="font-headline-md mb-6">Últimas notícias</h2>
            {newsQuery.isLoading ? (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando publicações...</CardContent></Card>
            ) : featuredPost ? (
              <article className="group relative min-h-[360px] overflow-hidden rounded-lg bg-primary text-white">
                <img src={newsRiderPath} alt="Competidora ao lado de seu cavalo" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <Badge className="mb-3 bg-secondary text-secondary-foreground">Destaque</Badge>
                  <h3 className="max-w-3xl font-serif text-3xl font-semibold leading-tight">{featuredPost.title}</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">{featuredPost.summary || featuredPost.content}</p>
                </div>
              </article>
            ) : (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma notícia publicada ainda.</CardContent></Card>
            )}
          </div>

          <div className="self-end">
            <div className="mb-5 flex items-center justify-between"><h2 className="font-serif text-3xl font-semibold">Classificação ao vivo</h2><Trophy className="h-7 w-7 text-secondary" /></div>
            <Card className="rounded-lg shadow-none"><CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-4 border-b pb-4"><span className="podium-number podium-number--gold">1</span><div><p className="font-bold">Liderança atualizada</p><p className="text-sm text-muted-foreground">Consulte por evento, categoria e nível.</p></div></div>
              <div className="grid gap-3 text-sm">
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Notas publicadas em tempo real</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />N1, N2, N3 e N4 separados</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-700" />Etapas e resultado do campeonato</p>
              </div>
              <Button className="w-full" asChild><Link to="/ranking">Abrir ranking oficial<ArrowRight className="h-4 w-4" /></Link></Button>
            </CardContent></Card>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-36">
          <div className="mb-8 max-w-2xl"><p className="eyebrow">Como funciona</p><h2 className="font-headline-md">Da inscrição ao pódio</h2></div>
          <div className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
            {[['01', 'Inscreva o conjunto', 'Escolha evento, cavalo, categoria, níveis e etapas.'], ['02', 'Acompanhe a prova', 'As notas são lançadas na ordem de entrada.'], ['03', 'Veja a classificação', 'O ranking atualiza por etapa e no campeonato.']].map(([number, title, description]) => (
              <div key={number} className="bg-card p-7"><span className="font-serif text-4xl font-bold text-secondary">{number}</span><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/50 px-4 py-10 sm:px-6"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 md:flex-row md:items-center"><div><p className="font-serif text-2xl font-bold">NTMR</p><p className="text-sm text-muted-foreground">Núcleo Triângulo Mineiro de Rédeas</p></div><div className="flex flex-wrap gap-5 text-sm font-semibold"><Link to="/" hash="calendario">Eventos</Link><Link to="/ranking">Ranking</Link><Link to={session ? '/minha-area' : '/login'}>{session ? 'Minha área' : 'Entrar'}</Link></div></div></footer>
    </div>
  )
}
