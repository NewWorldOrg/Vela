import { cn } from '@/lib/utils'

export function MigrationCountCell({
  tint,
  label,
  value,
  unit,
}: {
  tint: string
  label: string
  value: string
  unit: string
}) {
  return (
    <span
      className={cn(
        'flex min-w-[130px] flex-col rounded-lg px-3 py-2 text-ink',
        tint,
      )}
    >
      <span className="text-note">{label}</span>
      <span className="font-code text-[19px] leading-tight font-medium tabular-nums">
        {value}
        <em className="ml-0.5 font-sans text-note not-italic">{unit}</em>
      </span>
    </span>
  )
}
