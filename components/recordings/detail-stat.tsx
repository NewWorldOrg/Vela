import { cn } from '@/lib/utils'
import { TINT_CLASS, type TintName } from '@/components/vela/surface'

export const METRIC_TILE_TINT: TintName = 'lavender'

export function DetailStat({
  label,
  value,
  unit,
  wordy,
}: {
  label: string
  value: string
  unit?: string
  wordy?: boolean
}) {
  return (
    <div
      data-slot="metric-tile"
      className={cn(
        'min-w-0 rounded-lg px-3.5 py-[calc(11rem/16)] text-ink',
        TINT_CLASS[METRIC_TILE_TINT],
      )}
    >
      <span className="mb-0.5 block text-cap font-medium text-ink-3">
        {label}
      </span>
      <span
        className={cn(
          'leading-snug break-all',
          wordy
            ? 'text-[calc(15rem/16)] font-bold'
            : 'font-code text-[calc(19rem/16)] font-medium tabular-nums',
        )}
      >
        {value}
        {unit && (
          <small className="ml-1 font-sans text-cap font-normal text-ink-3">
            {unit}
          </small>
        )}
      </span>
    </div>
  )
}
