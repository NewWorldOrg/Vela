import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatCalendarDate, formatClock } from '@/lib/format'
import { calendarDayOf, watchStateOf } from '@/lib/library-days'
import { episodeOf } from '@/lib/library-series'
import type { Recording } from '@/repository/recordings'
import { Picture } from '@/components/library/library-cards'

function minutesOf(sec: number | undefined): number | undefined {
  return sec !== undefined && sec > 0 ? Math.round(sec / 60) : undefined
}

/** The other recordings of the series the one on the page belongs to, newest first, beside the player: each picture with how far it was watched, the day it was on after the dot of one nobody has watched, its episode, and the channel, the hour and the length. */
export function SeriesEpisodes({
  name,
  current,
  episodes,
  className,
}: {
  name: string
  current: Recording
  episodes: readonly Recording[]
  className?: string
}) {
  const unwatched = [current, ...episodes].filter(
    (one) => watchStateOf(one) === 'unwatched',
  ).length

  return (
    <aside
      aria-label={name}
      data-slot="series-episodes"
      className={cn(
        'flex w-[calc(372rem/16)] shrink-0 flex-col max-[1180px]:w-full',
        'min-[1181px]:sticky min-[1181px]:top-[calc(var(--top-bar)+10rem/16)] min-[1181px]:max-h-[calc(100svh-var(--top-bar)-30rem/16)]',
        className,
      )}
    >
      <h2 className="flex min-h-10 flex-wrap items-baseline gap-x-2 pt-2.5 text-heading font-bold">
        <span className="[overflow-wrap:anywhere]">{name}</span>
        <small className="text-sub font-medium tracking-normal text-ink-2">
          <span className="font-code">{episodes.length + 1}</span> 話
          {unwatched > 0 && (
            <>
              {' · '}未視聴 <span className="font-code">{unwatched}</span>
            </>
          )}
        </small>
      </h2>
      <ul className="-mx-[calc(7rem/16)] mt-2 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-[calc(7rem/16)] pb-2">
        {episodes.map((episode) => {
          const minutes = minutesOf(episode.lengthSec)
          const told = episodeOf(episode.title)

          return (
            <li key={episode.id}>
              <Link
                href={`/recordings/${episode.id}` as Route}
                className="group grid grid-cols-[calc(128rem/16)_minmax(0,1fr)] items-center gap-3.5 rounded-[calc(14rem/16)] p-[calc(7rem/16)] text-ink no-underline outline-none transition-[background-color] duration-(--dur) ease-(--ease) hover:bg-surface focus-visible:shadow-ring"
              >
                <Picture
                  recording={episode}
                  corner="rounded-sm"
                  lengthShown={false}
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-[calc(7rem/16)] text-[calc(14.5rem/16)] leading-[calc(19rem/16)] font-semibold">
                    {watchStateOf(episode) === 'unwatched' && (
                      <span
                        data-slot="unwatched-dot"
                        className="size-1.5 shrink-0 rounded-full bg-accent"
                      >
                        <span className="sr-only">未視聴</span>
                      </span>
                    )}
                    <span className="font-code">
                      {formatCalendarDate(calendarDayOf(episode.startedAt))}
                    </span>
                  </span>
                  {told && (
                    <span className="mt-0.5 line-clamp-2 block text-ui [overflow-wrap:anywhere]">
                      {told}
                    </span>
                  )}
                  <span className="mt-0.5 block text-sub text-ink-2">
                    {episode.channel} ·{' '}
                    <span className="font-code">
                      {formatClock(Date.parse(episode.startedAt))}
                    </span>
                    {minutes !== undefined && (
                      <>
                        {' · '}
                        <span className="font-code">{minutes}</span> 分
                      </>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
