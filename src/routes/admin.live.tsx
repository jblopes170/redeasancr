import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
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
  return <AdminLayout title="Notas ao vivo" description="Escolha o evento. Na próxima tela, selecione a etapa e lance a nota de cada conjunto aprovado."><div className="max-w-md"><label htmlFor="live-search" className="mb-2 block text-sm">Buscar prova</label><Input id="live-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome do evento" /></div>{query.isPending ? <p role="status">Carregando provas...</p> : query.error ? <p role="alert" className="text-destructive">{query.error.message}</p> : <AdminEventList events={events} live />}</AdminLayout>
}
