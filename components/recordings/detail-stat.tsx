import { cn } from '@/lib/utils'

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
        'min-w-0 rounded-md bg-surface-2 px-3.5 py-[calc(11rem/16)] text-ink',
      )}
    >
      <span className="mb-0.5 block text-cap font-medium text-ink-2">
        {label}
      </span>
      <span
        className={cn(
          'leading-snug break-all',
          wordy
            ? 'text-title font-bold'
            : 'font-code text-[calc(19rem/16)] font-medium tabular-nums',
        )}
      >
        {value}
        {unit && (
          <small className="ml-1 font-sans text-cap font-normal text-ink-2">
            {unit}
          </small>
        )}
      </span>
    </div>
  )
}
