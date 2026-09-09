import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AdminLayout } from '@/components/admin-layout'
import { AdminEventList } from '@/components/admin-event-list'
import { EventFormDialog } from '@/components/event-form-dialog'
import { Input } from '@/components/ui/input'
import { getAdminEvents } from '@/services/api'
import { useAuth } from '@/providers/auth-provider'
export const Route = createFileRoute('/admin/eventos')({ component: AdminEventsPage })
function AdminEventsPage() {
  const { profile } = useAuth()
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-events'], queryFn: getAdminEvents })
  const [search, setSearch] = useState('')
  const events = (query.data ?? []).filter(event => `${event.name} ${event.location}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
  return <AdminLayout title="Eventos" description="Cadastre a competição, prepare as inscrições e abra a operação da prova." actions={profile?.role === 'admin' && <EventFormDialog triggerLabel="Novo evento" onSaved={() => void client.invalidateQueries({ queryKey: ['admin-events'] })} />}><div className="max-w-md"><label htmlFor="admin-event-search" className="mb-2 block text-sm">Buscar evento</label><Input id="admin-event-search" placeholder="Nome ou local" value={search} onChange={e => setSearch(e.target.value)} /></div>{query.isPending ? <p role="status">Carregando eventos...</p> : query.error ? <p role="alert" className="text-destructive">{query.error.message}</p> : <AdminEventList events={events} />}</AdminLayout>
}
