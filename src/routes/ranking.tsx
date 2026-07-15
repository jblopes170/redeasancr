import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { heroReiningPath } from '@/lib/brand-assets'
import { HorseTrail } from '@/components/horse-trail'
import { RankingTable } from '@/components/ranking-table'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getPublicEvents } from '@/services/api'

export const Route = createFileRoute('/ranking')({
  component: PublicRankingPage,
})

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
    if (!eventId && events.length > 0) {
      setEventId(events[0].id)
    }
  }, [events, eventId])

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-8 sm:px-6">
        <Card className="relative overflow-hidden border-primary/20 bg-primary text-primary-foreground">
          <img src={heroReiningPath} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary/55" />
          <HorseTrail className="opacity-25" />
          <CardHeader className="relative z-10 space-y-2">
            <CardTitle className="text-3xl text-primary-foreground">Ranking Publico</CardTitle>
            <p className="max-w-2xl text-sm text-primary-foreground/85">
              Consulte resultados por etapa ou campeonato, com filtros por categoria e nivel.
            </p>
          </CardHeader>
          <CardContent className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <Label>Evento</Label>
              <Select value={eventId} onValueChange={setEventId} disabled={eventsQuery.isLoading || events.length === 0}>
                <SelectTrigger className="bg-white text-foreground">
                  <SelectValue placeholder={eventsQuery.isLoading ? 'Carregando eventos...' : 'Selecione um evento'} />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="secondary" asChild>
                <Link to="/">Voltar para inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        {!eventId ? (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="text-sm text-muted-foreground">
                Nenhum evento publicado no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">{selectedEvent?.name}</p>
                <p>{selectedEvent?.location || 'Local não informado'}</p>
                <p>{formatDateRange(selectedEvent?.starts_on ?? null, selectedEvent?.ends_on ?? null)}</p>
              </CardContent>
            </Card>
            <RankingTable eventId={eventId} />
          </div>
        )}
      </main>
    </div>
  )
}



