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
 * `edged` rims it in the ground colour so it stands on a surface of its own colour;
 * `starless` leaves the star to be drawn apart with `UsherStar`.
 */
export function Usher({
  mood = 'plain',
  edged = false,
  starless = false,
  className,
}: {
  mood?: UsherMood
  edged?: boolean
  starless?: boolean
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
              {edged && (
                <g className="stroke-bg" data-edge="">
                  <Antenna
                    d={drawn.antenna}
                    className="stroke-bg"
                    strokeWidth={16}
                  />
                  <path
                    d={SAIL_BODY}
                    className="fill-bg"
                    strokeWidth={14}
                    strokeLinejoin="round"
                  />
                </g>
              )}
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
        {edged && (
          <rect
            x="14"
            y="82"
            width="80"
            height="16"
            rx="8"
            className="fill-bg stroke-bg"
            strokeWidth={8}
            data-edge=""
          />
        )}
        <rect
          x="14"
          y="82"
          width="80"
          height="16"
          rx="8"
          className="fill-sky"
        />
      </g>
      {!starless && (
        <>
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
        </>
      )}
    </svg>
  )
}

/**
 * The usher's star alone, the glad one, rimmed in the ground colour.
 */
export function UsherStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-18 -18 36 36"
      aria-hidden="true"
      focusable="false"
      data-slot="usher-star"
      className={cn('overflow-visible', className)}
    >
      <path
        d={star(0, 0, 16)}
        className="fill-spark stroke-bg"
        strokeWidth={3}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  )
}
