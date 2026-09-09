import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageHeading } from '@/components/page-heading'
import { EventCard } from '@/components/event-card'
import { Input } from '@/components/ui/input'
import { getPublicEvents } from '@/services/api'
export const Route = createFileRoute('/eventos')({ component: EventsPage })
function EventsPage() {
  const query = useQuery({ queryKey: ['public-events'], queryFn: getPublicEvents })
  const [search, setSearch] = useState('')
  const events = (query.data ?? []).filter(event => `${event.name} ${event.location}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  return <><SiteHeader /><main id="main-content" className="page-container workspace-content"><PageHeading title="Eventos" description="Escolha a competição para consultar as etapas, inscrever-se ou acompanhar os resultados." eyebrow="Calendário NTMR" /><div className="max-w-md"><label htmlFor="event-search" className="mb-2 block text-sm">Buscar evento ou local</label><Input id="event-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome do evento ou cidade" /></div>{query.isPending ? <p role="status">Carregando eventos...</p> : query.error ? <p role="alert" className="text-destructive">Não foi possível carregar os eventos. {query.error.message}</p> : events.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{events.map(event => <EventCard key={event.id} event={event} />)}</div> : <p className="empty-state">Nenhum evento encontrado.</p>}</main><SiteFooter /></>
}
