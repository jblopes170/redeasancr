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
    <Card className="event-card-premium group h-full overflow-hidden rounded-lg border border-zinc-800/60 bg-zinc-950/55 shadow-[0_18px_52px_rgba(0,0,0,.24)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-amber-500/45 hover:bg-zinc-900/70 hover:shadow-[0_26px_72px_rgba(0,0,0,.36)]">
      <div className="relative h-44 overflow-hidden bg-muted">
        <img loading="lazy" decoding="async" src={eventImage(event)} alt="Arena de competição de rédeas" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/18 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute right-3 top-3"><StatusBadge type="event" status={event.status} /></div>
      </div>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-500/90"><CalendarDays className="h-3.5 w-3.5" />{formatDate(event.starts_on)} - {formatDate(event.ends_on)}</p>
          <h3 className="font-serif text-2xl font-semibold leading-tight text-zinc-50 transition group-hover:text-amber-100">{event.name}</h3>
        </div>
        <div className="grid gap-1.5 text-sm text-zinc-400">
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-500/80" />{event.location || 'Local não informado'}</p>
          <p className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500/80" />Bolsa: R$ {Number(event.prize_pool || 0).toLocaleString('pt-BR')}</p>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-zinc-800/80 pt-4">
          <Button size="sm" variant="outline" className="border-zinc-700/70 bg-zinc-950/40 hover:border-amber-500/50 hover:bg-amber-500/10 active:scale-95" asChild><Link to="/events/$eventId" params={{ eventId: event.id }}>Detalhes e ranking</Link></Button>
          {admin && <Button size="sm" variant="outline" asChild><Link to="/admin/events/$eventId" params={{ eventId: event.id }}>Gerenciar evento</Link></Button>}
          {admin && <Button size="sm" asChild><Link to="/admin/events/$eventId/scores" params={{ eventId: event.id }}><Radio className="h-4 w-4" />Prova ao vivo</Link></Button>}
        </div>
      </CardContent>
    </Card>
  )
}
