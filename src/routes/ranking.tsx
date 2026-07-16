import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Download, Trophy } from 'lucide-react'

import { RankingTable } from '@/components/ranking-table'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPublicEvents } from '@/services/api'

export const Route = createFileRoute('/ranking')({ component: PublicRankingPage })

function formatDateRange(startsOn: string | null, endsOn: string | null) {
  if (!startsOn && !endsOn) return 'Data não informada'
  const start = startsOn ? new Date(`${startsOn}T00:00:00`).toLocaleDateString('pt-BR') : '--'
  const end = endsOn ? new Date(`${endsOn}T00:00:00`).toLocaleDateString('pt-BR') : '--'
  return `${start} até ${end}`
}

function PublicRankingPage() {
  const eventsQuery = useQuery({ queryKey: ['public-events'], queryFn: getPublicEvents })
  const [eventId, setEventId] = useState<string>()
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data])
  const selectedEvent = useMemo(() => events.find((event) => event.id === eventId), [events, eventId])

  useEffect(() => {
    if (!eventId && events.length > 0) setEventId(events[0].id)
  }, [events, eventId])

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] space-y-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="flex flex-col gap-5 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="eyebrow"><Trophy className="h-4 w-4" />Classificação oficial</p><h1 className="font-headline-lg !text-[clamp(2.6rem,5vw,4.5rem)]">Ranking do campeonato</h1><p className="mt-3 max-w-3xl text-lg text-muted-foreground">Explore o desempenho por evento, etapa, categoria e nível. Os resultados são atualizados conforme as notas são lançadas.</p></div>
          <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Download className="h-4 w-4" />Exportação disponível nos filtros</span>
        </header>

        <Card className="shadow-none"><CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)] md:items-end">
          <div className="space-y-1.5"><Label>Evento</Label><Select value={eventId ?? ''} onValueChange={setEventId} disabled={eventsQuery.isLoading || events.length === 0}><SelectTrigger><SelectValue placeholder={eventsQuery.isLoading ? 'Carregando eventos...' : 'Selecione um evento'} /></SelectTrigger><SelectContent>{events.map((event) => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="border-l-0 text-sm text-muted-foreground md:border-l md:pl-5"><p className="font-bold text-foreground">{selectedEvent?.name ?? 'Nenhum evento publicado'}</p><p>{selectedEvent?.location || 'Local não informado'}</p><p>{formatDateRange(selectedEvent?.starts_on ?? null, selectedEvent?.ends_on ?? null)}</p></div>
        </CardContent></Card>

        {!eventId ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum evento publicado no momento.</CardContent></Card> : <RankingTable eventId={eventId} />}
      </main>
    </div>
  )
}
