'use client'

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

import { formatCalendarDate } from '@/lib/format'
import { calendarDayOf, watchStateOf } from '@/lib/library-days'
import { episodeOf, type Series } from '@/lib/library-series'
import type { Recording } from '@/repository/recordings'
import {
  type Picking,
  type PickStarting,
  clockOf,
} from '@/components/library/library-cards'
import { SeriesCard } from '@/components/library/series-card'
import { RecordingTile } from '@/components/library/recording-tile'

/** How many columns a grid is laid in now, read from the grid itself as its width changes. */
function useColumnsOf(grid: RefObject<HTMLElement | null>, first: number) {
  const [columns, setColumns] = useState(first)

  useLayoutEffect(() => {
    const element = grid.current

    if (!element) {
      return
    }

    const read = () =>
      setColumns(
        getComputedStyle(element).gridTemplateColumns.split(' ').length,
      )
    const watcher = new ResizeObserver(read)

    read()
    watcher.observe(element)

    return () => watcher.disconnect()
  }, [grid])

  return columns
}

/** The series, a card each with the sheets of its other episodes behind it; the chosen series opens its episodes under its row. */
export function SeriesGrid({
  series,
  now,
  picking,
  onPickStart,
}: {
  series: Series<Recording>[]
  now: Date
  picking?: Picking
  onPickStart?: PickStarting
}) {
  const grid = useRef<HTMLUListElement>(null)
  const columns = useColumnsOf(grid, 4)
  const [chosen, choose] = useState<string | undefined>(series[0]?.key)
  const open = series.find((one) => one.key === chosen)
  const openAt = open ? series.indexOf(open) : -1
  const after =
    openAt < 0
      ? -1
      : Math.min(
          Math.floor(openAt / columns) * columns + columns - 1,
          series.length - 1,
        )

  return (
    <ul
      ref={grid}
      data-slot="series-grid"
      className="grid grid-cols-3 gap-x-5 gap-y-6 min-[1300px]:grid-cols-4"
    >
      {series.flatMap((one, nth) => {
        const card = (
          <li key={one.key} className="min-w-0">
            <SeriesCard
              series={one}
              chosen={one.key === chosen}
              onChoose={() => choose(one.key === chosen ? undefined : one.key)}
            />
          </li>
        )

        if (!open || nth !== after) {
          return [card]
        }

        return [
          card,
          <li key="open" className="col-span-full min-w-0 py-2">
            <SeriesOpen
              series={open}
              now={now}
              picking={picking}
              onPickStart={onPickStart}
            />
          </li>,
        ]
      })}
    </ul>
  )
}

function SeriesOpen({
  series,
  now,
  picking,
  onPickStart,
}: {
  series: Series<Recording>
  now: Date
  picking?: Picking
  onPickStart?: PickStarting
}) {
  const unwatched = series.items.filter(
    (one) => watchStateOf(one) === 'unwatched',
  ).length

  return (
    <section aria-label={series.name} data-slot="series-open">
      <h2 className="flex items-baseline gap-2 text-[calc(20rem/16)] leading-[calc(26rem/16)] font-bold tracking-[-0.015em]">
        {series.name}
        <small className="text-sub font-medium tracking-normal text-ink-2">
          <span className="font-code">{series.items.length}</span> 話
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
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(calc(168rem/16),1fr))] gap-4">
        {series.items.map((recording) => (
          <li
            key={recording.id}
            data-recording={recording.id}
            className="min-w-0"
          >
            <RecordingTile
              recording={recording}
              title={
                episodeOf(recording.title) ??
                formatCalendarDate(calendarDayOf(recording.startedAt), now)
              }
              meta={`${recording.channel} · ${clockOf(recording)}`}
              picking={picking}
              onPickStart={onPickStart}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
