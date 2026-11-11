'use client'

import { cn } from '@/lib/utils'

/** The station and what is open on it, `データ放送` or `Hybridcast`: the station bold, what is open in the quieter ink. Where both do not fit on one line, what is open goes under the station, and only a station that does not fit on its own line is cut short. */
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
