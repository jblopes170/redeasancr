import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageHeading } from '@/components/page-heading'
import { getPublicNews } from '@/services/api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
export const Route = createFileRoute('/noticias')({ component: NewsPage })
function NewsPage() {
  const [limit, setLimit] = useState(12)
  const query = useQuery({ queryKey: ['public-news', 'directory', limit], queryFn: () => getPublicNews(undefined, limit) })
  return <><SiteHeader /><main id="main-content" className="page-container workspace-content"><PageHeading title="Notícias e comunicados" description="Novidades da temporada e orientações da organização." eyebrow="Central NTMR" />{query.isPending ? <p role="status">Carregando notícias...</p> : query.error ? <p role="alert" className="text-destructive">Não foi possível carregar as notícias.</p> : !query.data.length ? <p className="empty-state">Nenhuma publicação disponível.</p> : <div className="grid items-start gap-5 md:grid-cols-2">{query.data.map(post => <article key={post.id} className="rounded-xl border bg-card p-6"><p className="mb-3 text-sm text-muted-foreground">{new Date(post.published_at || post.created_at).toLocaleDateString('pt-BR')}</p><h2 className="text-xl font-semibold">{post.title}</h2>{post.summary && <p className="mt-3 text-sm leading-7 text-muted-foreground">{post.summary}</p>}<details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-primary">Ler publicação</summary><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{post.content}</p>{post.event_id && <Link className="mt-4 inline-block text-sm text-primary underline" to="/events/$eventId" params={{ eventId: post.event_id }}>Ver evento relacionado</Link>}</details></article>)}</div>}{query.data?.length === limit && <Button variant="outline" onClick={() => setLimit(limit + 12)}>Carregar mais notícias</Button>}</main><SiteFooter /></>
}
