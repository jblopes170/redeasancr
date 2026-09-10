import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowRight, CalendarDays, Newspaper } from 'lucide-react'

import { PageHeading } from '@/components/page-heading'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getPublicNews } from '@/services/api'

export const Route = createFileRoute('/noticias')({ component: NewsPage })

function NewsPage() {
  const [limit, setLimit] = useState(12)
  const query = useQuery({ queryKey: ['public-news', 'directory', limit], queryFn: () => getPublicNews(undefined, limit) })
  const posts = query.data ?? []

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="page-container workspace-content">
        <PageHeading
          title="Notícias e comunicados"
          description="Avisos da organização, atualizações de eventos e orientações para competidores."
          eyebrow="Central NTMR"
        />

        {query.isPending ? (
          <Card className="border-zinc-800/60 bg-zinc-950/60">
            <CardContent className="p-6 text-sm text-zinc-400">Carregando notícias...</CardContent>
          </Card>
        ) : query.error ? (
          <p role="alert" className="text-destructive">Não foi possível carregar as notícias.</p>
        ) : posts.length === 0 ? (
          <p className="empty-state">Nenhuma publicação disponível.</p>
        ) : (
          <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-950/65 text-zinc-50 shadow-xl shadow-black/20 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-amber-500/35"
              >
                {post.image_url ? (
                  <img src={post.image_url} alt="" className="h-52 w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="grid h-36 place-items-center bg-[radial-gradient(circle_at_25%_20%,rgba(245,158,11,.2),transparent_28%),linear-gradient(135deg,rgba(255,255,255,.06),transparent)]">
                    <Newspaper className="h-8 w-8 text-amber-400" />
                  </div>
                )}
                <div className="p-5">
                  <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-amber-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(post.published_at || post.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <h2 className="mt-3 text-xl font-semibold leading-tight">{post.title}</h2>
                  {post.summary && <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{post.summary}</p>}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-amber-400">Ler publicação</summary>
                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">{post.content}</p>
                    {post.event_id && (
                      <Button variant="outline" size="sm" className="mt-4 border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10" asChild>
                        <Link to="/events/$eventId" params={{ eventId: post.event_id }}>
                          Ver evento relacionado
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </details>
                </div>
              </article>
            ))}
          </div>
        )}

        {posts.length === limit && (
          <Button variant="outline" className="self-center border-white/15 bg-white/5 text-zinc-50 hover:border-amber-500/40 hover:bg-amber-500/10" onClick={() => setLimit(limit + 12)}>
            Carregar mais notícias
          </Button>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
