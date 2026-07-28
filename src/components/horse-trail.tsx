import { cn } from '@/lib/utils'

interface HorseTrailProps {
  className?: string
}

function HorseSilhouette() {
  return (
    <svg viewBox="0 0 520 220" className="h-full w-full" fill="currentColor" role="img" aria-label="Cavalo de rédeas em movimento">
      <g>
        <path d="M108 112C125 84 173 70 229 78c38 6 58 15 90 5 16-5 26-20 33-38 7-19 21-29 41-27l30 5c16 3 31 12 41 21l-10 9c-10 0-22-5-33-5l-20-2c-10-1-16 6-21 19l-13 32c-8 19-8 42 4 59-21 6-38-4-51-15-22-10-45-10-69-4-28 7-52 7-75 1-25-7-47-11-68-10Z" />
        <path d="M112 105c-29-10-56-6-75 10 25 0 40 10 10 25 31-4 54-13 75-23Z" />
        <path d="M146 126c-2 27-9 46-24 64l8 9c15-4 32-22 42-48l7-22Z" />
        <path d="M176 133c8 24 4 44-6 63l10 7c16-9 27-31 28-56l-7-16Z" />
        <path d="M323 132c1 25-7 47-16 63l10 8c17-10 28-32 29-59l-5-18Z" />
        <path d="M349 129c9 22 10 42 5 62l11 5c13-14 17-38 10-63l-7-14Z" />
        <path d="M348 51c-7-13-6-24 2-35l9 8 11-18 7 19 17-13 2 22-19 18Z" />
      </g>
      <path d="M214 91c25-11 58-11 86 2l-12 30c-24-9-49-9-73-1Z" fill="none" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
      <path d="M274 93c11 6 20 14 27 24M302 117c24 8 52 13 91 12M393 129c17 1 31-4 40-13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="418" cy="42" r="3" fill="currentColor" />
    </svg>
  )
}

export function HorseTrail({ className }: HorseTrailProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-full overflow-hidden', className)} aria-hidden="true">
      <div className="horse-trail__ribbon absolute bottom-5 h-px w-72 bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="horse-trail__horse absolute bottom-2 h-16 w-40 text-primary/75 sm:h-20 sm:w-48">
        <HorseSilhouette />
      </div>
    </div>
  )
}
