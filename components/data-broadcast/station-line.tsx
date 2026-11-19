'use client'

import { cn } from '@/lib/utils'

export function StationLine({
  station,
  what,
  className,
}: {
  station: string
  what: string
  className?: string
}) {
  return (
    <p
      data-slot="station-line"
      className={cn(
        'flex min-w-0 flex-wrap items-baseline gap-x-[0.4em] leading-tight whitespace-nowrap text-(--pl-ink)',
        className,
      )}
    >
      {station && <b className="min-w-0 truncate font-bold">{station}</b>}
      <span className="shrink-0 font-medium text-(--pl-ink-2)">{what}</span>
    </p>
  )
}
