import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { RankingTable } from '@/components/ranking-table'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { PageHeading } from '@/components/page-heading'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPublicEvents } from '@/services/api'
export const Route = createFileRoute('/ranking')({ component: PublicRankingPage })
function PublicRankingPage() {
  const query = useQuery({ queryKey: ['public-events'], queryFn: getPublicEvents })
  const [selection, setSelection] = useState('')
  const eventId = selection || query.data?.[0]?.id
  const selected = query.data?.find(event => event.id === eventId)
  return <><SiteHeader /><main id="main-content" className="page-container workspace-content"><PageHeading title="Ranking e resultados" description="Notas e pontos da etapa ou do campeonato, atualizados durante a prova." eyebrow="Classificação oficial" />
    <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_1fr] md:items-end"><div className="space-y-2"><Label htmlFor="ranking-event">Evento</Label><Select value={eventId ?? ''} onValueChange={setSelection} disabled={query.isPending || !query.data?.length}><SelectTrigger id="ranking-event"><SelectValue placeholder={query.isPending ? 'Carregando...' : 'Escolha um evento'} /></SelectTrigger><SelectContent>{query.data?.map(event => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}</SelectContent></Select></div>{selected && <p className="text-sm text-muted-foreground md:pb-3 md:pl-4">{selected.location || 'Local a definir'}{selected.starts_on && ` · ${new Date(`${selected.starts_on}T00:00:00`).toLocaleDateString('pt-BR')}`}</p>}</div>
    {query.error ? <p role="alert" className="text-destructive">{query.error.message}</p> : query.isPending ? <p role="status">Carregando classificação...</p> : eventId ? <RankingTable key={eventId} eventId={eventId} /> : <p className="empty-state">Nenhum evento publicado.</p>}
  </main><SiteFooter /></>
}
