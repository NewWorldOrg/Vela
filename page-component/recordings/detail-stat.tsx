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
    <div className="min-w-0 rounded-lg bg-surface-2 px-3.5 py-[11px]">
      <span className="mb-0.5 block text-[11px] font-medium text-ink-3">
        {label}
      </span>
      <span
        className={cn(
          'leading-snug break-all',
          wordy
            ? 'text-[15px] font-bold'
            : 'font-code text-[19px] font-medium tabular-nums',
        )}
      >
        {value}
        {unit && (
          <small className="ml-1 font-sans text-[11px] font-normal text-ink-3">
            {unit}
          </small>
        )}
      </span>
    </div>
  )
}
