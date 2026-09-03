export function AutoEncodeRow({
  label,
  labelId,
  children,
}: {
  label: string
  /**
   * Set where the row's control takes its name from this label rather than
   * from anything of its own — a switch draws no text, and the word beside it
   * is its value, not what it is for.
   */
  labelId?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 min-[760px]:grid-cols-[210px_1fr] min-[760px]:gap-4">
      <span id={labelId} className="heading text-ui text-ink">
        {label}
      </span>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
