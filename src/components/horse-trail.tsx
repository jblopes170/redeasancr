import { cn } from '@/lib/utils'

interface HorseTrailProps {
  className?: string
}

export function HorseTrail({ className }: HorseTrailProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-16 overflow-hidden', className)} aria-hidden="true">
      <div className="horse-trail__ribbon absolute bottom-5 h-px w-64 bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="horse-trail__dots absolute bottom-3 flex gap-6 text-primary/25">
        <span>•</span><span>•</span><span>•</span><span>•</span><span>•</span>
      </div>
    </div>
  )
}
