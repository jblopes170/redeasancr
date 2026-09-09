import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Radio, ClipboardCheck, MessageSquare } from 'lucide-react'
import { AdminLayout } from '@/components/admin-layout'
import { AdminEventList } from '@/components/admin-event-list'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/auth-provider'
import { getAdminEvents, getAdminNews, getAdminRegistrationRequests, getAdminSuggestions } from '@/services/api'
export const Route = createFileRoute('/admin/')({ component: AdminIndexPage })
function AdminIndexPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const events = useQuery({ queryKey: ['admin-events'], queryFn: getAdminEvents })
  const requests = useQuery({ queryKey: ['admin-registration-requests'], queryFn: () => getAdminRegistrationRequests(), enabled: isAdmin })
  const suggestions = useQuery({ queryKey: ['admin-suggestions'], queryFn: () => getAdminSuggestions(), enabled: isAdmin })
  const news = useQuery({ queryKey: ['admin-news'], queryFn: getAdminNews, enabled: isAdmin })
  const pending = requests.data?.filter(item => item.status === 'pending').length
  const unread = suggestions.data?.filter(item => item.status === 'new').length
  return <AdminLayout title="Visão geral" description="Pendências e próximos passos da organização." actions={<Button asChild><Link to="/admin/live"><Radio className="h-4 w-4" />Lançar notas ao vivo</Link></Button>}>
    {isAdmin && <section aria-label="Pendências" className="grid gap-4 sm:grid-cols-2"><Link to="/admin/requests" className="flex items-center gap-4 rounded-xl border bg-card p-5 transition hover:border-primary/50"><ClipboardCheck className="h-6 w-6 text-primary" /><div className="flex-1"><h2 className="text-base font-semibold">Analisar inscrições</h2><p className="mt-1 text-sm text-muted-foreground">{requests.isPending ? 'Carregando pendências...' : requests.error ? 'Não foi possível consultar as pendências' : `${pending} aguardando aprovação`}</p></div><ArrowRight className="h-4 w-4" /></Link><Link to="/admin/requests" hash="suggestions" className="flex items-center gap-4 rounded-xl border bg-card p-5 transition hover:border-primary/50"><MessageSquare className="h-6 w-6 text-primary" /><div className="flex-1"><h2 className="text-base font-semibold">Atender solicitações</h2><p className="mt-1 text-sm text-muted-foreground">{suggestions.isPending ? 'Carregando mensagens...' : suggestions.error ? 'Não foi possível consultar as mensagens' : `${unread} novas mensagens`}</p></div><ArrowRight className="h-4 w-4" /></Link></section>}
    <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Operação dos eventos</h2><Button variant="ghost" asChild><Link to="/admin/eventos">Todos os eventos<ArrowRight className="h-4 w-4" /></Link></Button></div>{events.isPending ? <p role="status">Carregando eventos...</p> : events.error ? <p role="alert" className="text-destructive">{events.error.message}</p> : <AdminEventList events={(events.data ?? []).filter(event => event.status !== 'finished').slice(0, 3)} />}</section>
    {isAdmin && <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Últimas publicações</h2><Link to="/admin/content" className="text-sm text-primary">Gerenciar publicações</Link></div><div className="divide-y rounded-xl border bg-card">{news.isPending ? <p className="p-5 text-sm">Carregando publicações...</p> : news.error ? <p className="p-5 text-sm text-destructive">Não foi possível carregar as publicações.</p> : news.data?.length ? news.data.slice(0, 3).map(post => <div key={post.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><p className="text-sm font-medium">{post.title}</p><span className="text-sm text-muted-foreground">{post.status === 'published' ? 'Publicada' : 'Rascunho'}</span></div>) : <p className="p-5 text-sm text-muted-foreground">Nenhuma publicação cadastrada.</p>}</div></section>}
  </AdminLayout>
}
