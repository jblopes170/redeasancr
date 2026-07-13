import { cn } from '@/lib/utils'

interface HorseTrailProps {
  className?: string
}

function HorseIcon({ delay, scale = 1 }: { delay: string; scale?: number }) {
  return (
    <span
      className="horse-trail__horse absolute bottom-1 left-0 block text-primary/45"
      style={{ animationDelay: delay, transform: `scale(${scale})` }}
      aria-hidden="true"
    >
      <svg width="74" height="34" viewBox="0 0 74 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M13 23c4-8 11-12 21-12h9c5 0 9 2 12 5l6 7c2 2 1 5-1 6l-6 3c-3 1-6 1-8-2l-2-3c-1-1-3-2-5-2H26c-4 0-7 2-9 5l-1 2c-1 2-4 2-6 1l-6-2c-2-1-3-3-2-5l11-4Z"
          fill="currentColor"
        />
        <path d="M48 8c4-3 10-4 17-2-4 2-7 5-9 9-1 2-4 3-6 1l-5-4c-2-1-1-3 3-4Z" fill="currentColor" />
        <path d="M25 24c-3 3-5 6-6 10M38 24c0 4 1 7 4 10M47 24c4 2 7 5 9 9M18 24c-4 1-8 0-12-2" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export function HorseTrail({ className }: HorseTrailProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-12 overflow-hidden', className)} aria-hidden="true">
      <HorseIcon delay="0s" />
      <HorseIcon delay="-6s" scale={0.82} />
      <HorseIcon delay="-12s" scale={0.92} />
    </div>
  )
}
