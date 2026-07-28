import { horseMascotPath } from '@/lib/brand-assets'
import { cn } from '@/lib/utils'

interface HorseTrailProps {
  className?: string
}

export function HorseTrail({ className }: HorseTrailProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-full overflow-hidden', className)} aria-hidden="true">
      <div className="horse-trail__ribbon absolute bottom-5 h-px w-72 bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <img src={horseMascotPath} alt="" className="horse-trail__horse absolute bottom-0 h-24 w-44 object-cover object-[75%_center] mix-blend-multiply opacity-90 sm:h-28 sm:w-52" />
    </div>
  )
}
