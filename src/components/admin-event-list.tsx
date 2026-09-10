import { Link } from '@tanstack/react-router'
import { ArrowRight, CalendarDays, MapPin, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import type { EventRecord } from '@/types/domain'

export function AdminEventList({ events, live = false }: { events: EventRecord[]; live?: boolean }) {
  return (
    <div className="admin-event-list">
      {events.map((event) => (
        <article key={event.id} className="admin-event-card">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2>{event.name}</h2>
              <StatusBadge type="event" status={event.status} />
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {event.starts_on ? new Date(`${event.starts_on}T00:00:00`).toLocaleDateString('pt-BR') : 'Data a definir'}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {event.location || 'Local a definir'}
              </span>
            </div>
          </div>

          <div className="admin-event-actions">
            {!live && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/events/$eventId" params={{ eventId: event.id }}>
                    Gerenciar
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/events/$eventId" params={{ eventId: event.id }} hash="entries">
                    Inscrições
                  </Link>
                </Button>
              </>
            )}
            <Button variant={live ? 'default' : 'outline'} size="sm" asChild>
              <Link to="/admin/events/$eventId/scores" params={{ eventId: event.id }}>
                <Radio className="h-4 w-4" />
                Lançar notas
              </Link>
            </Button>
          </div>
        </article>
      ))}

      {events.length === 0 && <p className="admin-empty-state">Nenhum evento encontrado.</p>}
    </div>
  )
}
