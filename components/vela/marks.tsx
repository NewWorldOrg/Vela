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
        d={BOAT_SAIL}
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
  {
    antenna: string
    star: string
    eyes: [number, number, number][]
    face: ReactNode
  }
> = {
  plain: {
    antenna: 'M24 14 L35 29 L47 14',
    star: star(65, 12, 13),
    eyes: [
      [51, 54, 5.4],
      [67, 54, 5.4],
    ],
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
    eyes: [],
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
    eyes: [
      [51, 55, 4.8],
      [67, 55, 4.8],
    ],
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

const SAIL_BODY = 'M29 29 A50 45 0 0 1 84 72 L29 72 Z'

const SWEAT = 'M23 36 Q19.5 42 21 44.5 Q23 47 25 44.5 Q26.5 42 23 36 Z'

const SPARKS = 4

function Antenna({
  d,
  className,
  strokeWidth,
}: {
  d: string
  className?: string
  strokeWidth: number
}) {
  return (
    <g data-part="antenna">
      <g data-part="antenna-answer">
        <path
          d={d}
          className={className}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </g>
  )
}

/**
 * The usher: a sail riding on a hull, an antenna on its head and a star above
 * its shoulder, with its face cut through the sail.
 * The body, the antenna, the lids, the star and its sparks are drawn apart so
 * `usher-arrives` can move each of them; drawn without it, they stand still.
 */
export function Usher({
  mood = 'plain',
  className,
}: {
  mood?: UsherMood
  className?: string
}) {
  const id = useId()
  const face = maskIdOf(id, 'usher')
  const above = maskIdOf(id, 'usher-above')
  const drawn = MOODS[mood]

  return (
    <svg
      viewBox="2 -6 104 104"
      aria-hidden="true"
      focusable="false"
      data-slot="usher"
      data-mood={mood}
      className={cn(
        'size-[calc(78rem/16)] shrink-0 overflow-visible',
        className,
      )}
    >
      <defs>
        <mask id={face}>
          <rect x="2" y="-6" width="104" height="104" fill="#fff" />
          <g fill="#000">{drawn.face}</g>
        </mask>
        <clipPath id={above}>
          <rect x="-60" y="-90" width="230" height="178" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${above})`}>
        <g data-part="leap">
          <g data-part="answer">
            <g data-part="squash">
              <Antenna
                d={drawn.antenna}
                className="stroke-brand"
                strokeWidth={8}
              />
              <path
                d={SAIL_BODY}
                className="fill-brand stroke-brand"
                strokeWidth={6}
                strokeLinejoin="round"
                mask={`url(#${face})`}
                data-sail=""
              />
              {drawn.eyes.map(([cx, cy, r]) => (
                <circle
                  key={cx}
                  cx={cx}
                  cy={cy}
                  r={r}
                  className="fill-brand"
                  transform="scale(1 0)"
                  data-part="lid"
                />
              ))}
              {mood === 'troubled' && (
                <path
                  d={SWEAT}
                  className="fill-sky"
                  opacity={0}
                  data-part="sweat"
                />
              )}
            </g>
          </g>
        </g>
      </g>
      <g data-part="hull">
        <rect
          x="14"
          y="82"
          width="80"
          height="16"
          rx="8"
          className="fill-sky"
        />
      </g>
      <g data-part="sparks">
        {Array.from({ length: SPARKS }, (_, nth) => (
          <circle
            key={nth}
            cx={mood === 'troubled' ? 66 : 65.5}
            cy={mood === 'troubled' ? 17 : 11.5}
            r={mood === 'glad' ? 4.4 : 3.6}
            className="fill-spark"
            opacity={0}
          />
        ))}
      </g>
      <g data-part="star">
        <g data-part="star-answer">
          <path d={drawn.star} className="fill-spark" data-star="" />
        </g>
      </g>
    </svg>
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
            className={paint ?? 'fill-brand'}
            strokeWidth={width}
          />
          <g data-part="sail">
            <path
              d={BOAT_SAIL}
              className={paint ?? 'fill-brand stroke-brand'}
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
        className={paint ?? 'fill-sky'}
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
            className={paint ?? 'fill-sky'}
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
        <circle cx="42" cy="64" r="4.6" className="fill-brand" />
        <circle cx="58" cy="64" r="4.6" className="fill-brand" />
        <path
          d="M46 72 Q50 76 54 72"
          className="stroke-brand"
          fill="none"
          strokeWidth={3.4}
          strokeLinecap="round"
        />
      </g>
      <g data-face="glad" opacity={mood === 'glad' ? 1 : 0}>
        <path
          d="M37.5 66 Q42 59.5 46.5 66 M53.5 66 Q58 59.5 62.5 66"
          className="stroke-brand"
          fill="none"
          strokeWidth={3.6}
          strokeLinecap="round"
        />
        <path
          d="M45.5 71 Q50 78 54.5 71 Z"
          className="fill-brand stroke-brand"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </g>
      <g data-part="star">
        <path
          d={star(84, 15, 13)}
          className={cn('fill-spark', edged && 'stroke-bg')}
          strokeWidth={edged ? 3 : 0}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
      </g>
    </svg>
  )
}
