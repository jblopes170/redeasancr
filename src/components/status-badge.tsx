import { EVENT_STATUS_LABEL, ENTRY_STATUS_LABEL } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'

const EVENT_VARIANT = {
  draft: 'outline',
  active: 'default',
  finished: 'secondary',
  published: 'default',
} as const

const ENTRY_VARIANT = {
  registered: 'default',
  cancelled: 'destructive',
  finished: 'secondary',
} as const

interface StatusBadgeProps {
  status: string
  type: 'event' | 'entry'
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  if (type === 'event') {
    const variant = EVENT_VARIANT[status as keyof typeof EVENT_VARIANT] ?? 'outline'
    return <Badge variant={variant}>{EVENT_STATUS_LABEL[status] ?? status}</Badge>
  }

  const variant = ENTRY_VARIANT[status as keyof typeof ENTRY_VARIANT] ?? 'outline'
  return <Badge variant={variant}>{ENTRY_STATUS_LABEL[status] ?? status}</Badge>
}
