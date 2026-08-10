import { useState } from 'react'

import realHorsePath from '@/assets/real-horse-gallop.png'
import { cn } from '@/lib/utils'

interface HorseTrailProps {
  className?: string
}

export function HorseTrail({ className }: HorseTrailProps) {
  const [isSprinting, setIsSprinting] = useState(false)

  const toggleSprint = () => setIsSprinting((current) => !current)

  return (
    <div className={cn('absolute inset-x-0 bottom-0 h-full overflow-hidden', className)}>
      <div className={cn('horse-trail__scene absolute bottom-1', isSprinting && 'horse-trail__scene--sprint')}>
        <div className="horse-trail__dust" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => <span key={index} className="horse-trail__dust-particle" />)}
        </div>
        <button
          type="button"
          className="horse-trail__horse"
          onClick={toggleSprint}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleSprint()
            }
          }}
          aria-label={isSprinting ? 'Reduzir a velocidade do cavalo' : 'Acelerar o cavalo'}
          title={isSprinting ? 'Clique para reduzir a velocidade' : 'Clique para acelerar'}
        >
          <img src={realHorsePath} alt="Cavalo real em galope" className="horse-trail__figure h-full w-full object-contain" draggable="false" />
        </button>
      </div>
      <div className="horse-trail__ground absolute inset-x-0 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" aria-hidden="true" />
    </div>
  )
}
