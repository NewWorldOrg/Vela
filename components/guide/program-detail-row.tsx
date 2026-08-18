export function ProgramDetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3.5 border-b border-dashed border-line py-2.5 text-[13px] last:border-b-0">
      <span className="w-24 shrink-0 pt-px text-sub text-ink-3">{label}</span>
      <span className="min-w-0">{children}</span>
    </div>
  )
}
