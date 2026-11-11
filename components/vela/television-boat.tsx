import { cn } from '@/lib/utils'
import { star } from '@/components/vela/marks'

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
