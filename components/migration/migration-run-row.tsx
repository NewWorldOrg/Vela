export function MigrationRunRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-0.5 min-[760px]:grid-cols-[150px_1fr] min-[760px]:gap-4">
      <dt className="text-ui text-ink-3">{label}</dt>
      <dd className="text-ui text-ink-2">{children}</dd>
    </div>
  )
}
