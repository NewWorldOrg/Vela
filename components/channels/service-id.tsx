export function ServiceId({ sid }: { sid: number }) {
  return (
    <span
      data-slot="service-id"
      className="font-code text-note font-normal whitespace-nowrap tabular-nums text-ink-3"
    >
      SID {sid}
    </span>
  )
}
