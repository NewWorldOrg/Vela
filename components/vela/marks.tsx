import { useId } from 'react'

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
      className={cn('size-6 shrink-0', className)}
    >
      <defs>
        <mask id={mask}>
          <path d={KEEL} stroke="white" {...line} />
        </mask>
      </defs>
      <path d={KEEL} className="stroke-(--mark-keel)" {...line} />
      <path d={SAIL} className="stroke-(--mark-sail)" {...line} />
      <path
        d={SAIL}
        className="stroke-(--mark-star)"
        mask={`url(#${mask})`}
        {...line}
      />
    </svg>
  )
}

function star(cx: number, cy: number, r: number): string {
  const k = r * 0.26

  return (
    `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} ` +
    `Q${cx + k} ${cy + k} ${cx} ${cy + r} ` +
    `Q${cx - k} ${cy + k} ${cx - r} ${cy} ` +
    `Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`
  )
}

const MAST = { x: 9.5, y: 18.5, width: 45, height: 8, rx: 4 }
const BOAT_SAIL = 'M43 11 C60 17 72 28 74 39 L43 39 Z'
const LEGS: { side: 'left' | 'right'; x: number; turn: string }[] = [
  { side: 'left', x: 15.95, turn: 'rotate(135 23.5 94.5)' },
  { side: 'right', x: 68.95, turn: 'rotate(45 76.5 94.5)' },
]

function Boat({ edge }: { edge: boolean }) {
  const width = edge ? 8 : 0
  const paint = edge ? 'fill-bg stroke-bg' : undefined

  return (
    <>
      <g data-part="rig">
        <g transform="rotate(4 32 46)">
          <rect
            {...MAST}
            transform="rotate(90 32 22.5)"
            className={paint ?? 'fill-(--mark-sail)'}
            strokeWidth={width}
          />
          <g data-part="sail">
            <path
              d={BOAT_SAIL}
              className={paint ?? 'fill-(--mark-sail) stroke-(--mark-sail)'}
              strokeWidth={6 + width}
              strokeLinejoin="round"
            />
          </g>
        </g>
      </g>
      <rect
        x="12"
        y="47"
        width="76"
        height="42"
        rx="16"
        className={paint ?? 'fill-(--mark-keel)'}
        strokeWidth={width}
      />
      {LEGS.map(({ side, x, turn }) => (
        <g key={side} data-part="leg" data-side={side}>
          <rect
            x={x}
            y="90.5"
            width="15.1"
            height="8"
            rx="4"
            transform={turn}
            className={paint ?? 'fill-(--mark-keel)'}
            strokeWidth={width}
          />
        </g>
      ))}
    </>
  )
}

/**
 * The app icon's television under sail, off its plate: the mast and the sail,
 * the set with a face on its screen, two legs and the star.
 * Both faces are drawn; `mood` shows one of them, and the curtain turns one
 * into the other. `edged` rims it in the ground colour.
 */
export function TelevisionBoat({
  mood = 'plain',
  edged = false,
  className,
}: {
  mood?: 'plain' | 'glad'
  edged?: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="-21 -6 112 112"
      aria-hidden="true"
      focusable="false"
      data-slot="television-boat"
      className={cn('size-24 shrink-0 overflow-visible', className)}
    >
      {edged && (
        <g data-edge="" strokeLinejoin="round">
          <Boat edge />
        </g>
      )}
      <Boat edge={false} />
      <rect x="20" y="55" width="60" height="26" rx="8" className="fill-bg" />
      <g data-face="plain" opacity={mood === 'plain' ? 1 : 0}>
        <circle cx="42" cy="64" r="4.6" className="fill-(--mark-sail)" />
        <circle cx="58" cy="64" r="4.6" className="fill-(--mark-sail)" />
        <path
          d="M46 72 Q50 76 54 72"
          className="stroke-(--mark-sail)"
          fill="none"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
      </g>
      <g data-face="glad" opacity={mood === 'glad' ? 1 : 0}>
        <path
          d="M37.5 66 Q42 59.5 46.5 66 M53.5 66 Q58 59.5 62.5 66"
          className="stroke-(--mark-sail)"
          fill="none"
          strokeWidth={3.6}
          strokeLinecap="round"
        />
        <path
          d="M45.5 71 Q50 78 54.5 71 Z"
          className="fill-(--mark-sail) stroke-(--mark-sail)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </g>
      <g data-part="star">
        <path
          d={star(84, 15, 13)}
          className={cn('fill-(--mark-star)', edged && 'stroke-bg')}
          strokeWidth={edged ? 3 : 0}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </g>
    </svg>
  )
}
