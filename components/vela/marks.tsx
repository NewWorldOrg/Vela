import { cn } from '@/lib/utils'

const SHORT_STROKE = 'M4.5 6.5 11 19.2'
const LONG_STROKE = 'M19.5 3.5 11 19.2'

/** The mark: a short stroke and a long one meeting at the foot, where they meet is the dot. */
export function VelaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-slot="vela-mark"
      className={cn('size-6 shrink-0', className)}
    >
      <path
        d={SHORT_STROKE}
        className="stroke-ink"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d={LONG_STROKE}
        className="stroke-ink"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={11} cy={19} r={2.6} className="fill-accent" />
    </svg>
  )
}
