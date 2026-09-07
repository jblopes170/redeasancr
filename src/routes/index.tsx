import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Newspaper,
  ShieldCheck,
  Trophy,
} from 'lucide-react'

import { EventCard } from '@/components/event-card'
import { SiteHeader } from '@/components/site-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { heroReiningPath, newsRiderPath } from '@/lib/brand-assets'
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
    <div className="min-h-screen bg-background" id="inicio">
      <SiteHeader />

      <section className="hero-premium relative isolate min-h-[650px] overflow-hidden bg-[#17100e] text-white lg:min-h-[calc(100vh-68px)]">
        <img
          src={heroReiningPath}
          alt="Cavalo e competidor em uma prova de rédeas"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[88%_center] opacity-60 sm:object-[70%_center] sm:opacity-90"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#17100e_0%,rgba(23,16,14,.96)_24%,rgba(23,16,14,.56)_53%,rgba(23,16,14,.18)_78%,rgba(23,16,14,.42)_100%)]" />
        <div className="absolute inset-y-0 left-0 -z-10 w-1/2 bg-[radial-gradient(circle_at_20%_50%,rgba(135,19,25,.16),transparent_65%)]" />

        <div className="mx-auto flex min-h-[650px] max-w-[1440px] items-center px-5 py-16 sm:px-8 lg:min-h-[calc(100vh-68px)] lg:px-12">
          <div className="max-w-4xl">
            <p className="mb-6 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.22em] text-[#e1ad51]">
              <span className="h-px w-10 bg-[#e1ad51]" />Temporada oficial NTMR
            </p>
            <h1 className="hero-display max-w-4xl text-[clamp(3.5rem,8.5vw,8rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.065em] text-white">
              Rédeas<br /><span className="text-[#e1ad51]">ao vivo.</span>
            </h1>
            <p className="mt-7 max-w-lg text-base font-semibold leading-7 text-white/78 sm:text-lg">
              Inscreva-se. Acompanhe cada nota. Veja o pódio mudar.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-12 bg-secondary px-6 text-secondary-foreground hover:bg-[#b78312]" asChild>
                <Link to={session ? '/minha-area' : '/login'}>
                  {session ? 'Abrir minha área' : 'Ver próxima etapa e inscrever-se'}<ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 border-white/40 bg-white/5 px-6 text-white backdrop-blur hover:bg-white hover:text-primary" asChild>
                <Link to="/ranking"><Trophy className="h-4 w-4" />Acompanhar ranking</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1440px] space-y-24 bg-background px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <section id="calendario" className="scroll-mt-36 space-y-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow"><CalendarDays className="h-4 w-4" />Calendário oficial</p>
              <h2 className="font-headline-md">Próximos eventos</h2>
              <p className="mt-3 leading-7 text-muted-foreground">Tudo o que você precisa para chegar preparado à próxima etapa.</p>
            </div>
            <Button variant="outline" asChild><Link to="/ranking">Resultados anteriores<ArrowRight className="h-4 w-4" /></Link></Button>
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

        <section id="noticias" className="scroll-mt-36 grid overflow-hidden bg-[#17100e] text-white lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
          <div className="relative min-h-[470px] overflow-hidden">
            <img loading="lazy" decoding="async" src={newsRiderPath} alt="Competidora ao lado de seu cavalo" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
              <p className="eyebrow !text-[#e1ad51]"><Newspaper className="h-4 w-4" />Central NTMR</p>
              {newsQuery.isLoading ? (
                <p className="text-sm text-white/70">Carregando publicações...</p>
              ) : featuredPost ? (
                <>
                  <h2 className="max-w-3xl font-serif text-3xl font-semibold leading-tight sm:text-4xl">{featuredPost.title}</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75">{featuredPost.summary || featuredPost.content}</p>
                </>
              ) : (
                <><h2 className="font-serif text-3xl font-semibold">Notícias e comunicados</h2><p className="mt-3 text-sm text-white/70">As novidades da temporada aparecerão aqui.</p></>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between border-l border-white/10 p-7 sm:p-10">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e1ad51]">Classificação ao vivo</p>
              <h2 className="mt-4 font-serif text-3xl font-semibold">Cada nota transforma o pódio.</h2>
              <div className="mt-7 grid gap-4 text-sm text-white/70">
                <p className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e1ad51]" />Resultados atualizados durante a prova</p>
                <p className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e1ad51]" />Classificação por categoria e níveis elegíveis</p>
                <p className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e1ad51]" />Notas e pontos reunidos no campeonato</p>
              </div>
            </div>
            <Button className="mt-10 h-12 bg-white text-primary hover:bg-white/90" asChild><Link to="/ranking">Abrir ranking oficial<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-36">
          <div className="mb-8 max-w-2xl"><p className="eyebrow"><ShieldCheck className="h-4 w-4" />Jornada simples</p><h2 className="font-headline-md">Da inscrição ao pódio</h2></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['01', 'Escolha a etapa', 'Veja o evento e faça sua inscrição.'],
              ['02', 'Acompanhe a prova', 'Notas e passadas ficam disponíveis ao vivo.'],
              ['03', 'Consulte o resultado', 'Filtre o ranking por categoria, nível e etapa.'],
            ].map(([number, title, description]) => (
              <div key={number} className="group surface-band border-t-2 border-t-secondary p-7 transition hover:-translate-y-1 hover:border-secondary/50">
                <span className="font-serif text-5xl font-semibold text-secondary/70">{number}</span>
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#17100e] px-4 py-12 text-white sm:px-6">
        <div className="mx-auto grid max-w-[1440px] gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div><p className="font-serif text-3xl font-semibold">NTMR</p><p className="mt-2 text-sm text-white/55">Núcleo Triângulo Mineiro de Rédeas</p></div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-white/75">
            <Link to="/" hash="calendario">Eventos</Link><Link to="/ranking">Ranking</Link><Link to="/" hash="noticias">Notícias</Link><Link to={session ? '/minha-area' : '/login'}>{session ? 'Minha área e suporte' : 'Entrar'}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
