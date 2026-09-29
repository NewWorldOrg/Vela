import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const KEEL = 'M20 32 Q20 68 50 86'
const SAIL = 'M82 10 Q82 64 50 86'
const THICK = 16
const THICK_WHEN_SMALL = 21

function maskIdOf(id: string, part: string): string {
  return `vela-${part}-${id.replace(/[^A-Za-z0-9_-]/g, '')}`
}

/**
 * The mark: the keel and the sail meeting at the foot, where they cross is the star.
 * `small` is the thicker cut for 32px and under.
 */
export function VelaMark({
  small = false,
  className,
}: {
  small?: boolean
  className?: string
}) {
  const mask = maskIdOf(useId(), 'mark')
  const line = {
    fill: 'none',
    strokeWidth: small ? THICK_WHEN_SMALL : THICK,
    strokeLinecap: 'round',
  } as const

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      data-slot="vela-mark"
      data-cut={small ? 'small' : 'full'}
      className={cn('size-4 shrink-0', className)}
    >
      <defs>
        <mask id={mask}>
          <path d={KEEL} stroke="#fff" {...line} />
        </mask>
      </defs>
      <path d={KEEL} className="stroke-sky" {...line} />
      <path d={SAIL} className="stroke-brand" {...line} />
      <path
        d={SAIL}
        className="stroke-spark"
        mask={`url(#${mask})`}
        {...line}
      />
    </svg>
  )
}

export type UsherMood = 'plain' | 'glad' | 'troubled'

function star(cx: number, cy: number, r: number): string {
  const k = r * 0.26

  return (
    `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} ` +
    `Q${cx + k} ${cy + k} ${cx} ${cy + r} ` +
    `Q${cx - k} ${cy + k} ${cx - r} ${cy} ` +
    `Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`
  )
}

const MOODS: Record<
  UsherMood,
  { antenna: string; star: string; face: ReactNode }
> = {
  plain: {
    antenna: 'M24 14 L35 29 L47 14',
    star: star(65, 12, 13),
    face: (
      <>
        <circle cx="51" cy="54" r="4.6" />
        <circle cx="67" cy="54" r="4.6" />
        <path
          d="M55 62 Q59 66 63 62"
          fill="none"
          stroke="#000"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
      </>
    ),
  },
  glad: {
    antenna: 'M21 10 L35 29 L50 10',
    star: star(66, 11, 16),
    face: (
      <>
        <path
          d="M46.5 55.5 Q51 49 55.5 55.5 M62.5 55.5 Q67 49 71.5 55.5"
          fill="none"
          stroke="#000"
          strokeWidth={3.6}
          strokeLinecap="round"
        />
        <path
          d="M54 61 Q59 69 64 61 Z"
          stroke="#000"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </>
    ),
  },
  troubled: {
    antenna: 'M21 24 L35 30 L50 24',
    star: star(66, 17, 9),
    face: (
      <>
        <circle cx="51" cy="55" r="4" />
        <circle cx="67" cy="55" r="4" />
        <path
          d="M54 64 Q56.5 61.5 59 64 Q61.5 66.5 64 64"
          fill="none"
          stroke="#000"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>
    ),
  },
}

/**
 * The usher: a sail riding on a hull, an antenna on its head and a star above
 * its shoulder, with its face cut through the sail.
 */
export function Usher({
  mood = 'plain',
  className,
}: {
  mood?: UsherMood
  className?: string
}) {
  const face = maskIdOf(useId(), 'usher')
  const drawn = MOODS[mood]

  return (
    <svg
      viewBox="2 -6 104 104"
      aria-hidden="true"
      focusable="false"
      data-slot="usher"
      data-mood={mood}
      className={cn('size-[calc(78rem/16)] shrink-0', className)}
    >
      <defs>
        <mask id={face}>
          <rect x="2" y="-6" width="104" height="104" fill="#fff" />
          <g fill="#000">{drawn.face}</g>
        </mask>
      </defs>
      <g className="fill-brand stroke-brand" mask={`url(#${face})`}>
        <path
          d={drawn.antenna}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M29 29 A50 45 0 0 1 84 72 L29 72 Z"
          strokeWidth={6}
          strokeLinejoin="round"
        />
      </g>
      <rect x="14" y="82" width="80" height="16" rx="8" className="fill-sky" />
      <path d={drawn.star} className="fill-spark" data-star="" />
    </svg>
  )
}
