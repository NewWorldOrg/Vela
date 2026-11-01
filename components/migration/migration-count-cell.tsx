export function MigrationCountCell({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit: string
}) {
  return (
    <span className="flex min-w-[calc(112rem/16)] flex-col text-ink">
      <span className="text-note text-ink-2">{label}</span>
      <span className="text-heading font-bold tabular-nums">
        {value}
        <em className="ml-0.5 text-note font-normal text-ink-2 not-italic">
          {unit}
        </em>
      </span>
    </span>
  )
}
