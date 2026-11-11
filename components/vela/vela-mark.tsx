import { useId } from 'react'

import { cn } from '@/lib/utils'

const KEEL = 'M20 32 Q20 68 50 86'

const SAIL = 'M82 10 Q82 64 50 86'

const THICK = 16

const THICK_WHEN_SMALL = 21

export function maskIdOf(id: string, part: string): string {
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

export function star(cx: number, cy: number, r: number): string {
  const k = r * 0.26

  return (
    `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} ` +
    `Q${cx + k} ${cy + k} ${cx} ${cy + r} ` +
    `Q${cx - k} ${cy + k} ${cx - r} ${cy} ` +
    `Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`
  )
}
