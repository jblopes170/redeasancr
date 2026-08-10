import { useState } from 'react'

import { cn } from '@/lib/utils'

interface HorseTrailProps {
  className?: string
}

function HorseSilhouette() {
  return (
    <svg viewBox="0 0 360 180" className="h-full w-full" role="img" aria-label="Cavalo de redeas em movimento">
      <defs>
        <linearGradient id="horse-coat" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.98" />
          <stop offset="0.58" stopColor="currentColor" stopOpacity="0.82" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.62" />
        </linearGradient>
        <filter id="horse-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#5c2b1d" floodOpacity="0.22" />
        </filter>
      </defs>

      <g className="horse-trail__figure" fill="url(#horse-coat)" filter="url(#horse-shadow)">
        <path d="M54 91 C71 71 104 66 143 72 C168 76 188 87 216 84 C233 82 244 74 252 62 C260 49 269 42 283 39 C292 37 303 39 311 44 L327 56 C333 61 334 68 329 73 L317 78 C311 80 304 80 298 78 L284 73 C279 72 274 75 271 82 L256 117 C251 130 239 138 224 139 L114 139 C91 139 72 126 61 111 Z" />
        <path d="M247 65 C251 51 257 38 267 29 C271 25 276 21 283 18 C282 27 282 34 286 39 C276 42 266 51 260 65 Z" />
        <path d="M258 35 C247 31 241 26 239 20 C247 20 255 22 263 25 C258 19 258 13 260 8 C269 14 275 20 279 27 Z" />
        <path d="M61 94 C45 91 32 84 21 76 C37 78 51 79 64 75 C53 70 46 65 40 57 C58 62 74 66 84 72 Z" />
      </g>

      <g className="horse-trail__legs" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path className="horse-trail__leg horse-trail__leg--rear" strokeWidth="13" d="M91 116 C88 130 82 143 71 157 C66 163 59 165 52 163" />
        <path className="horse-trail__leg horse-trail__leg--rear-alt" strokeWidth="12" d="M119 122 C115 136 117 147 127 158 C131 162 137 164 143 162" />
        <path className="horse-trail__leg horse-trail__leg--front" strokeWidth="13" d="M220 119 C223 134 232 145 245 153 C251 157 258 157 264 154" />
        <path className="horse-trail__leg horse-trail__leg--front-alt" strokeWidth="12" d="M239 113 C248 125 256 132 268 137 C275 140 281 138 286 134" />
      </g>

      <path className="horse-trail__mane" d="M252 63 C242 52 238 43 243 35 C250 40 256 42 261 43 C254 34 254 26 259 20 C267 28 274 34 282 37 C273 43 265 52 258 66 Z" fill="currentColor" opacity="0.9" />
      <path d="M303 45 C311 47 316 50 320 54" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" opacity="0.5" />
      <circle cx="300" cy="54" r="3.5" fill="#fff" />
      <circle cx="301" cy="54" r="1.5" fill="#351b18" />
      <path d="M274 73 C287 79 303 83 316 79" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" opacity="0.65" />
      <path d="M267 76 C273 92 275 101 273 111" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2" opacity="0.22" />
      <path d="M83 90 C113 79 151 84 181 95" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="3" opacity="0.18" />
    </svg>
  )
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
          <HorseSilhouette />
        </button>
      </div>
      <div className="horse-trail__ground absolute inset-x-0 bottom-4 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" aria-hidden="true" />
    </div>
  )
}
