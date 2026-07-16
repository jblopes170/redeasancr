import { CalendarDays, MapPin, Radio, Trophy } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import type { EventRecord } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { eventArenaPath, eventSaddlePath, eventSpinPath } from '@/lib/brand-assets'

interface EventCardProps {
  event: EventRecord
  admin?: boolean
}

const eventImages = [eventSpinPath, eventSaddlePath, eventArenaPath]

function formatDate(value: string | null) {
  if (!value) return '--'
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

function eventImage(event: EventRecord) {
  const seed = [...event.id].reduce((total, character) => total + character.charCodeAt(0), 0)
  return eventImages[seed % eventImages.length]
}

export function EventCard({ event, admin = false }: EventCardProps) {
  return (
    <Card className="group h-full overflow-hidden rounded-lg border bg-card shadow-none transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-44 overflow-hidden bg-muted">
        <img src={eventImage(event)} alt="Arena de competição de rédeas" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <div className="absolute right-3 top-3"><StatusBadge type="event" status={event.status} /></div>
      </div>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground"><CalendarDays className="h-3.5 w-3.5 text-secondary" />{formatDate(event.starts_on)} - {formatDate(event.ends_on)}</p>
          <h3 className="font-serif text-2xl font-semibold leading-tight text-foreground">{event.name}</h3>
        </div>
        <div className="grid gap-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-secondary" />{event.location || 'Local não informado'}</p>
          <p className="flex items-center gap-2"><Trophy className="h-4 w-4 text-secondary" />Bolsa: R$ {Number(event.prize_pool || 0).toLocaleString('pt-BR')}</p>
        </div>
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button size="sm" variant="outline" asChild><Link to="/events/$eventId" params={{ eventId: event.id }}>Detalhes e ranking</Link></Button>
          {admin && <Button size="sm" variant="outline" asChild><Link to="/admin/events/$eventId" params={{ eventId: event.id }}>Gerenciar evento</Link></Button>}
          {admin && <Button size="sm" asChild><Link to="/admin/events/$eventId/scores" params={{ eventId: event.id }}><Radio className="h-4 w-4" />Prova ao vivo</Link></Button>}
        </div>
      </CardContent>
    </Card>
  )
}
