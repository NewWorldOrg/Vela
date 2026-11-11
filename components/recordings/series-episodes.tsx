'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useId, useRef } from 'react'

import { cn } from '@/lib/utils'
import { foldBand, foldBandDelay, foldColumn } from '@/lib/live-fold'
import { formatCalendarDate, formatClock } from '@/lib/format'
import { calendarDayOf, watchStateOf } from '@/lib/library-days'
import { episodeOf } from '@/lib/library-series'
import type { Recording } from '@/repository/recordings'
import { useSeriesFolded } from '@/hooks/useSeriesFolded'
import { Picture } from '@/components/library/picture'
import { FoldButton } from '@/components/live/fold-button'
import { useFoldingChannels, useSettled } from '@/components/live/channel-fold'

/** The fold's name: what it folds away. */
const SERIES_FOLD = '同じシリーズの回'

function minutesOf(sec: number | undefined): number | undefined {
  return sec !== undefined && sec > 0 ? Math.round(sec / 60) : undefined
}

/** The other recordings of the series the one on the page belongs to, newest first, beside the player: each picture with how far it was watched, the day it was on after the dot of one nobody has watched, its episode, and the channel, the hour and the length. It folds to the thin rail the live page's channels fold to, with the same motion, so the player takes the room, and the page remembers the fold in its own cookie. */
export function SeriesEpisodes({
  name,
  current,
  episodes,
  folded: stored = false,
  className,
}: {
  name: string
  current: Recording
  episodes: readonly Recording[]
  folded?: boolean
  className?: string
}) {
  const [folded, remember] = useSeriesFolded(stored)
  const { motion, fold } = useFoldingChannels(folded, remember)
  const column = useRef<HTMLElement>(null)
  const body = useId()
  const unwatched = [current, ...episodes].filter(
    (one) => watchStateOf(one) === 'unwatched',
  ).length

  useSettled(column, motion.phase, motion.onSettle)

  return (
    <aside
      ref={column}
      aria-label={name}
      data-slot="series-episodes"
      className={cn(
        'flex shrink-0 flex-col items-end overflow-clip [overflow-clip-margin:14px]',
        foldColumn(folded, motion),
        'max-[1180px]:w-full',
        'min-[1181px]:sticky min-[1181px]:top-[calc(var(--top-bar)+10rem/16)] min-[1181px]:max-h-[calc(100svh-var(--top-bar)-30rem/16)]',
        className,
      )}
    >
      <div
        data-fold={motion.phase}
        className={cn(
          'flex min-h-0 w-full flex-col data-[fold=closing]:pointer-events-none',
          motion.shown && 'min-[1181px]:w-[calc(372rem/16)]',
        )}
      >
        <div className="flex items-start justify-end gap-1.5">
          {motion.shown && (
            <div className="min-w-0 flex-1 overflow-clip [overflow-clip-margin:6px]">
              <div
                style={{ transitionDelay: foldBandDelay(0, motion) }}
                className={foldBand(motion)}
              >
                <h2 className="flex min-h-10 flex-wrap items-baseline gap-x-2 pt-2.5 text-heading font-bold">
                  <span className="[overflow-wrap:anywhere]">{name}</span>
                  <small className="text-sub font-medium tracking-normal text-ink-2">
                    <span className="font-code">{episodes.length + 1}</span> 話
                    {unwatched > 0 && (
                      <>
                        {' · '}
                        <span className="text-acc-text">
                          未視聴 <span className="font-code">{unwatched}</span>
                        </span>
                      </>
                    )}
                  </small>
                </h2>
              </div>
            </div>
          )}
          <FoldButton
            folded={folded}
            onFold={fold}
            controls={body}
            label={SERIES_FOLD}
          />
        </div>
        {motion.shown && (
          <ul
            id={body}
            inert={folded}
            className="-mx-[calc(7rem/16)] mt-2 flex min-h-0 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-[calc(7rem/16)] pb-2"
          >
            {episodes.map((episode, nth) => {
              const minutes = minutesOf(episode.lengthSec)
              const told = episodeOf(episode.title)

              return (
                <li
                  key={episode.id}
                  style={{ transitionDelay: foldBandDelay(nth + 2, motion) }}
                  className={foldBand(motion)}
                >
                  <Link
                    href={`/recordings/${episode.id}` as Route}
                    className="group grid grid-cols-[calc(128rem/16)_minmax(0,1fr)] items-center gap-3.5 rounded-md p-[calc(7rem/16)] text-ink no-underline outline-none transition-[background-color] duration-(--dur) ease-(--ease) hover:bg-surface focus-visible:shadow-ring"
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
        )}
      </div>
    </aside>
  )
}
