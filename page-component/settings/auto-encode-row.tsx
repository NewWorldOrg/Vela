export function AutoEncodeRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 min-[760px]:grid-cols-[210px_1fr] min-[760px]:gap-4">
      <span className="heading text-ui text-ink">{label}</span>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
