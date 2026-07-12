import { CalendarDays, MapPin, Trophy } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import type { EventRecord } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'

interface EventCardProps {
  event: EventRecord
  admin?: boolean
}

function formatDate(value: string | null) {
  if (!value) return '--'
  const date = new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('pt-BR')
}

export function EventCard({ event, admin = false }: EventCardProps) {
  return (
    <Card className="h-full border-primary/20 bg-card/95 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/10">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{event.name}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
          <StatusBadge type="event" status={event.status} />
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(event.starts_on)} - {formatDate(event.ends_on)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <p className="inline-flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {event.location || 'Local não informado'}
          </p>
          <p className="inline-flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            Bolsa: R$ {Number(event.prize_pool || 0).toLocaleString('pt-BR')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild>
            <Link to="/events/$eventId" params={{ eventId: event.id }}>
              Ver ranking público
            </Link>
          </Button>
          {admin && (
            <Button size="sm" asChild>
              <Link to="/admin/events/$eventId" params={{ eventId: event.id }}>
                Abrir inscrições e notas
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
