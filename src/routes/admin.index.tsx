import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ClipboardCheck, MessageSquare, Newspaper, Radio, Sparkles } from 'lucide-react'
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
  const pending = requests.data?.filter((item) => item.status === 'pending').length ?? 0
  const unread = suggestions.data?.filter((item) => item.status === 'new').length ?? 0

  return (
    <AdminLayout
      title="Visão geral"
      description="Acompanhe pendências, eventos e publicações em uma tela executiva."
      actions={(
        <Button asChild className="admin-glow-button">
          <Link to="/admin/live">
            <Radio className="h-4 w-4" />
            Lançar notas ao vivo
          </Link>
        </Button>
      )}
    >
      <section className="admin-hero-panel">
        <div>
          <p className="admin-premium-kicker">
            <Sparkles className="h-4 w-4" />
            Organização NTMR
          </p>
          <h2>Painel administrativo premium</h2>
          <p>
            Tudo que move a prova em poucos cliques: inscrições, notas ao vivo, financeiro e comunicação.
          </p>
        </div>
        <Button asChild className="admin-glow-button">
          <Link to="/admin/live">
            Abrir central da prova
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {isAdmin && (
        <section aria-label="Pendências" className="admin-metric-grid">
          <Link to="/admin/requests" className="admin-metric-card">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            <div>
              <span>Inscrições</span>
              <strong>{requests.isPending ? '...' : pending}</strong>
              <p>{requests.error ? 'Não foi possível consultar' : 'aguardando análise'}</p>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link to="/admin/requests" hash="suggestions" className="admin-metric-card">
            <MessageSquare className="h-6 w-6 text-primary" />
            <div>
              <span>Atendimento</span>
              <strong>{suggestions.isPending ? '...' : unread}</strong>
              <p>{suggestions.error ? 'Não foi possível consultar' : 'novas mensagens'}</p>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link to="/admin/content" className="admin-metric-card">
            <Newspaper className="h-6 w-6 text-primary" />
            <div>
              <span>Publicações</span>
              <strong>{news.isPending ? '...' : news.data?.length ?? 0}</strong>
              <p>{news.error ? 'Não foi possível consultar' : 'notícias e comunicados'}</p>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      <section className="space-y-4">
        <div className="admin-section-heading">
          <div>
            <p className="admin-premium-kicker">Operação</p>
            <h2>Eventos em andamento</h2>
          </div>
          <Button variant="ghost" asChild>
            <Link to="/admin/eventos">
              Todos os eventos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {events.isPending ? (
          <p role="status" className="admin-empty-state">Carregando eventos...</p>
        ) : events.error ? (
          <p role="alert" className="text-destructive">{events.error.message}</p>
        ) : (
          <AdminEventList events={(events.data ?? []).filter((event) => event.status !== 'finished').slice(0, 3)} />
        )}
      </section>

      {isAdmin && (
        <section className="space-y-4">
          <div className="admin-section-heading">
            <div>
              <p className="admin-premium-kicker">Comunicação</p>
              <h2>Últimas publicações</h2>
            </div>
            <Link to="/admin/content" className="text-sm font-semibold text-primary hover:text-amber-300">
              Gerenciar publicações
            </Link>
          </div>
          <div className="admin-news-list">
            {news.isPending ? (
              <p>Carregando publicações...</p>
            ) : news.error ? (
              <p className="text-destructive">Não foi possível carregar as publicações.</p>
            ) : news.data?.length ? (
              news.data.slice(0, 3).map((post) => (
                <article key={post.id}>
                  <div>
                    <h3>{post.title}</h3>
                    <p>{post.summary || 'Sem resumo cadastrado.'}</p>
                  </div>
                  <span>{post.status === 'published' ? 'Publicada' : 'Rascunho'}</span>
                </article>
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma publicação cadastrada.</p>
            )}
          </div>
        </section>
      )}
    </AdminLayout>
  )
}
