'use client'

import { cn } from '@/lib/utils'
import { formatCalendarDate } from '@/lib/format'
import { calendarDayOf, watchStateOf } from '@/lib/library-days'
import { type Series } from '@/lib/library-series'
import type { Recording } from '@/repository/recordings'
import { Picture } from '@/components/library/picture'

export function SeriesCard({
  series,
  chosen,
  onChoose,
}: {
  series: Series<Recording>
  chosen: boolean
  onChoose: () => void
}) {
  const latest = series.items[0]
  const unwatched = series.items.filter(
    (one) => watchStateOf(one) === 'unwatched',
  ).length
  const single = series.items.length === 1

  return (
    <button
      type="button"
      aria-expanded={chosen}
      onClick={onChoose}
      data-series={series.key}
      className="group block w-full cursor-pointer pt-3 text-left text-ink outline-none"
    >
      <span
        className={cn(
          'relative block',
          !single &&
            'before:absolute before:inset-x-[12%] before:-top-[calc(11*var(--px))] before:h-3 before:rounded-t-md before:bg-[color-mix(in_srgb,var(--ink)_10%,var(--bg))] after:absolute after:inset-x-[6%] after:-top-1.5 after:h-3 after:rounded-t-md after:bg-[color-mix(in_srgb,var(--ink)_20%,var(--bg))]',
        )}
      >
        <span
          className={cn(
            'relative z-[1] block rounded-md transition-shadow duration-[140ms] ease-toy group-focus-visible:shadow-ring',
            chosen && 'shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--accent)]',
          )}
        >
          <Picture
            recording={latest}
            corner="rounded-md"
            lengthShown={false}
            watchedShown={false}
          >
            <span className="pointer-events-none absolute bottom-2 left-2 z-[1] inline-flex h-5 items-center rounded-full bg-[rgba(20,20,22,.6)] px-2 text-micro leading-none font-semibold text-white backdrop-blur-md">
              <span className="font-code">{series.items.length}</span>
              &nbsp;話
            </span>
          </Picture>
        </span>
      </span>
      <span className="mt-2.5 block truncate text-title leading-5 font-semibold tracking-[-0.01em]">
        {series.name}
      </span>
      <span className="mt-[3px] flex items-center gap-1.5 truncate text-sub text-ink-2">
        {unwatched > 0 && (
          <span className="inline-flex items-center gap-[5px] font-semibold text-acc-text">
            <span className="size-1.5 rounded-full bg-accent" />
            未視聴 <span className="font-code">{unwatched}</span>
          </span>
        )}
        <span className="truncate">
          {unwatched > 0 && '· '}
          {latest.channel} · 最新{' '}
          <span className="font-code">
            {formatCalendarDate(calendarDayOf(latest.startedAt))}
          </span>
        </span>
      </span>
    </button>
  )
}
