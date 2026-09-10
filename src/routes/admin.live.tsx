import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Radio, Search, Sparkles } from 'lucide-react'
import { AdminLayout } from '@/components/admin-layout'
import { AdminEventList } from '@/components/admin-event-list'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/providers/auth-provider'
import { getAdminEvents } from '@/services/api'

export const Route = createFileRoute('/admin/live')({ component: LiveCenterPage })

function LiveCenterPage() {
  const { profile } = useAuth()
  const query = useQuery({ queryKey: ['admin-events'], queryFn: getAdminEvents })
  const [search, setSearch] = useState('')
  const events = (query.data ?? []).filter(event => (profile?.role === 'admin' || event.status === 'active') && event.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))

  return (
    <AdminLayout title="Notas ao vivo" description="Escolha o evento, entre na prova e lance as notas com foco total.">
      <section className="admin-hero-panel admin-live-hero">
        <div>
          <p className="admin-premium-kicker">
            <Radio className="h-4 w-4" />
            Central da prova
          </p>
          <h2>Lançamento rápido, seguro e ao vivo</h2>
          <p>
            Acesse a tela dedicada de notas, acompanhe a classificação em tempo real e reduza cliques durante a prova.
          </p>
        </div>
        <div className="admin-live-status">
          <Sparkles className="h-5 w-5" />
          <span>{events.length}</span>
          <small>provas disponíveis</small>
        </div>
      </section>

      <section className="admin-search-panel">
        <label htmlFor="live-search">Buscar prova</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            id="live-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite o nome do evento"
            className="pl-10"
          />
        </div>
      </section>

      {query.isPending ? (
        <p role="status" className="admin-empty-state">Carregando provas...</p>
      ) : query.error ? (
        <p role="alert" className="text-destructive">{query.error.message}</p>
      ) : (
        <AdminEventList events={events} live />
      )}
    </AdminLayout>
  )
}
