'use client'

import { formatClock } from '@/lib/format'

function clockOf(at: string): string {
  return formatClock(new Date(at).getTime())
}

/** The start in the row's own size and the end under it, quieter. */
export function RowTimes({
  span,
  whenLabel,
}: {
  span?: { startAt: string; endAt: string }
  whenLabel: string
}) {
  if (!span) {
    return (
      <span className="font-code text-sub leading-[calc(18rem/16)] text-ink-2">
        {whenLabel}
      </span>
    )
  }

  return (
    <span className="flex flex-col font-code leading-[calc(18rem/16)] tabular-nums">
      <span className="text-title font-semibold text-ink">
        {clockOf(span.startAt)}
      </span>
      <span className="text-sub text-ink-2">– {clockOf(span.endAt)}</span>
    </span>
  )
}
