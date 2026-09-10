import { SiteFooter } from '@/components/site-footer'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  Newspaper,
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
import type { NewsPostRecord } from '@/types/domain'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { session, profile } = useAuth()
  const panelRoute: '/admin' | '/minha-area' = profile?.role === 'admin' || profile?.role === 'judge' ? '/admin' : '/minha-area'
  const eventsQuery = useQuery({ queryKey: ['public-events'], queryFn: getPublicEvents })
  const newsQuery = useQuery({ queryKey: ['public-news'], queryFn: () => getPublicNews(undefined, 6) })
  const events = eventsQuery.data ?? []
  const news = newsQuery.data ?? []
  const featuredPost = news.find((post) => post.featured) ?? news[0]

  return (
    <div className="min-h-screen bg-background" id="inicio">
      <SiteHeader />

      <HomeHero
        ctaLabel={session ? 'Abrir meu painel' : 'Encontrar minha próxima etapa'}
        ctaRoute={session ? panelRoute : '/eventos'}
      />

      <main id="main-content" className="page-container space-y-16 py-14">
        <section id="calendario" className="scroll-mt-36 space-y-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow"><CalendarDays className="h-4 w-4" />Calendário oficial</p>
              <h2 className="font-headline-md">Próximos eventos</h2>
              <p className="mt-3 leading-7 text-muted-foreground">Tudo o que você precisa para chegar preparado à próxima etapa.</p>
            </div>
            <Button variant="outline" asChild><Link to="/eventos">Todos os eventos<ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
          {eventsQuery.isLoading ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Carregando eventos publicados...</CardContent></Card>
          ) : eventsQuery.error ? (
            <Alert variant="destructive"><AlertTitle>Não foi possível carregar os eventos</AlertTitle><AlertDescription>{eventsQuery.error.message}</AlertDescription></Alert>
          ) : events.length === 0 ? (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum evento publicado no momento.</CardContent></Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}</div>
          )}
        </section>

        <HomeNewsSection
          error={newsQuery.error}
          featuredPost={featuredPost}
          isLoading={newsQuery.isLoading}
          posts={news.slice(0, 3)}
        />

      </main>

      <SiteFooter />
    </div>
  )
}

function HomeNewsSection({ error, featuredPost, isLoading, posts }: { error: Error | null; featuredPost?: NewsPostRecord; isLoading: boolean; posts: NewsPostRecord[] }) {
  return (
    <section id="noticias" className="home-news-section scroll-mt-36 grid overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950/55 text-white shadow-[0_24px_72px_rgba(0,0,0,.32)] backdrop-blur-md lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,.8fr)]">
      <div className="group relative min-h-[470px] overflow-hidden">
        <img loading="lazy" decoding="async" src={featuredPost?.image_url || newsRiderPath} alt="Competidora ao lado de seu cavalo" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/52 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
          <p className="eyebrow !text-amber-500"><Newspaper className="h-4 w-4" />Central NTMR</p>
          {isLoading ? (
            <div className="mt-5 grid max-w-xl gap-3">
              <div className="h-8 w-3/4 animate-pulse rounded bg-zinc-800/80" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-800/70" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800/70" />
            </div>
          ) : error ? (
            <p className="max-w-xl text-sm text-red-200">Não foi possível carregar as publicações.</p>
          ) : featuredPost ? (
            <>
              <h2 className="max-w-3xl font-serif text-3xl font-semibold leading-tight text-zinc-50 sm:text-4xl">{featuredPost.title}</h2>
              <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-6 text-zinc-300">{featuredPost.summary || featuredPost.content}</p>
            </>
          ) : (
            <><h2 className="font-serif text-3xl font-semibold text-zinc-50">Notícias e comunicados</h2><p className="mt-3 text-sm text-zinc-400">As novidades da temporada aparecerão aqui.</p></>
          )}
          <Button variant="outline" className="mt-6 border-zinc-700/70 bg-zinc-950/50 text-zinc-50 backdrop-blur-md hover:border-amber-500/60 hover:bg-amber-500/10 hover:text-white active:scale-95" asChild><Link to="/noticias">Ler notícias<ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>

      <div className="flex flex-col justify-between border-t border-white/10 p-6 sm:p-8 lg:border-l lg:border-t-0">
        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-500">Últimas notícias</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-zinc-50">Comunicados rápidos</h2>
            </div>
            <Button size="sm" variant="ghost" className="hidden text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 sm:inline-flex" asChild><Link to="/noticias">Ver todas</Link></Button>
          </div>

          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg border border-zinc-800/50 bg-zinc-900/40" />)}
            </div>
          ) : error ? (
            <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">Publicações indisponíveis agora.</p>
          ) : posts.length > 0 ? (
            <div className="grid gap-3">
              {posts.map((post) => (
                <Link key={post.id} to="/noticias" className="home-news-card group rounded-lg border border-zinc-800/60 bg-zinc-900/35 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-amber-500/45 hover:bg-zinc-900/70 hover:shadow-[0_18px_48px_rgba(0,0,0,.3)]">
                  <div className="flex gap-3">
                    {post.image_url && <img src={post.image_url} alt="" className="h-16 w-20 shrink-0 rounded-md object-cover opacity-90" />}
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-500/85">{formatNewsDate(post.published_at ?? post.created_at)}</p>
                      <h3 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-zinc-50 group-hover:text-amber-100">{post.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{post.summary || post.content}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-zinc-800/80 bg-zinc-900/25 p-4 text-sm text-zinc-400">Nenhuma publicação disponível.</p>
          )}
        </div>

        <Button className="mt-8 h-12 bg-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:bg-amber-500 active:scale-95" asChild><Link to="/ranking">Abrir ranking oficial<ArrowRight className="h-4 w-4" /></Link></Button>
      </div>
    </section>
  )
}

function formatNewsDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function HomeHero({ ctaLabel, ctaRoute }: { ctaLabel: string; ctaRoute: '/admin' | '/minha-area' | '/eventos' }) {
  return (
    <section className="home-hero hero-premium relative isolate min-h-[520px] overflow-hidden bg-black text-white lg:min-h-[620px]">
      <img
        src={heroReiningPath}
        alt="Cavalo e competidor em uma prova de rédeas"
        className="home-hero-media absolute inset-0 -z-30 h-full w-full object-cover object-[82%_42%] opacity-70 sm:object-[72%_36%] sm:opacity-90 xl:object-[70%_32%]"
      />
      <div className="absolute inset-0 -z-20 bg-gradient-to-t from-black via-black/52 to-black/20" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,.94)_28%,rgba(5,5,5,.54)_58%,rgba(5,5,5,.18)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-36 bg-gradient-to-t from-background to-transparent" />

      <div className="mx-auto flex min-h-[520px] max-w-[1440px] items-center px-5 py-14 sm:px-8 lg:min-h-[620px] lg:px-12">
        <div className="home-hero-copy max-w-4xl">
          <p className="home-hero-kicker mb-6 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-500">
            <span className="h-px w-10 bg-amber-500" />Temporada oficial NTMR
          </p>
          <h1 className="home-hero-title hero-display max-w-4xl text-5xl font-extrabold uppercase leading-none tracking-normal text-zinc-50 sm:text-7xl lg:text-8xl xl:text-9xl">
            Rédeas<br /><span className="text-amber-500">ao vivo.</span>
          </h1>
          <p className="home-hero-subtitle mt-7 max-w-xl text-base font-semibold leading-7 text-zinc-300 sm:text-lg">
            Inscrições, notas e ranking em uma experiência rápida para competidores, organização e público.
          </p>
          <div className="home-hero-actions mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="home-hero-primary h-12 bg-amber-600 px-6 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:bg-amber-500 active:scale-95" asChild>
              <Link to={ctaRoute}>
                {ctaLabel}<ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="home-hero-secondary h-12 border-zinc-700/70 bg-zinc-950/40 px-6 text-zinc-50 shadow-lg backdrop-blur-md hover:border-amber-500/60 hover:bg-zinc-900/65 hover:text-white active:scale-95" asChild>
              <Link to="/ranking"><Trophy className="h-4 w-4" />Acompanhar ranking</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
