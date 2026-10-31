'use client'

import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatCalendarDate, formatClock, formatPlayerTime } from '@/lib/format'
import {
  byDay,
  calendarDayOf,
  dayHeadingOf,
  minutesLeftOf,
  watchedShareOf,
  watchStateOf,
} from '@/lib/library-days'
import { episodeOf, type Series } from '@/lib/library-series'
import { playingOnHref } from '@/lib/playback-source'
import { RECORDING_IN_PROGRESS_TERM } from '@/lib/state-terms'
import type { Recording } from '@/repository/recordings'
import { CheckIcon, PlayIcon } from '@/components/vela/icons'
import { RecordingThumb } from '@/components/library/recording-thumb'

/** A picked recording's set, and the press that changes it, while the library is choosing. */
export interface Picking {
  picked: ReadonlySet<string>
  onPick: (id: string, taken: boolean) => void
}

function recordingHref(id: string): Route {
  return `/recordings/${id}` as Route
}

const GLASS =
  'pointer-events-none absolute z-[1] inline-flex h-5 items-center gap-1 rounded-full bg-[rgba(20,20,22,.6)] px-1.5 font-code text-micro leading-none font-semibold text-white backdrop-blur-md'

/** The line of how far a recording was watched, inside the foot of its picture. */
function WatchedBar({ share }: { share: number | undefined }) {
  if (share === undefined) {
    return null
  }

  return (
    <span
      aria-hidden="true"
      data-slot="watched-bar"
      className="pointer-events-none absolute right-[7px] bottom-1.5 left-[7px] z-[1] h-[3px] overflow-hidden rounded-full bg-white/40"
    >
      <span
        className="block h-full rounded-full bg-accent"
        style={{ width: `${share * 100}%` }}
      />
    </span>
  )
}

/** A recording's picture at 16:9, with its length at the foot, a recording still being made at the head, and how far it was watched. */
export function Picture({
  recording,
  corner = 'rounded-md',
  lengthShown = true,
  watchedShown = true,
  children,
}: {
  recording: Recording
  corner?: string
  lengthShown?: boolean
  watchedShown?: boolean
  children?: ReactNode
}) {
  const state = watchStateOf(recording)

  return (
    <span
      className={cn(
        'relative block aspect-video overflow-hidden bg-surface-2',
        corner,
      )}
    >
      <RecordingThumb
        recording={recording}
        className="absolute inset-0 size-full rounded-none"
        pictureClassName="group-hover:scale-[1.04]"
      />
      {recording.outcome === 'recording' && (
        <span className={cn(GLASS, 'top-1.5 left-1.5 font-sans')}>
          <span className="breathes size-1.5 rounded-full bg-accent" />
          {RECORDING_IN_PROGRESS_TERM.label}
        </span>
      )}
      {lengthShown &&
        recording.lengthSec !== undefined &&
        recording.outcome !== 'recording' && (
          <span className={cn(GLASS, 'right-1.5 bottom-1.5')}>
            {formatPlayerTime(recording.lengthSec)}
          </span>
        )}
      {state === 'partway' && <WatchedBar share={watchedShareOf(recording)} />}
      {children}
    </span>
  )
}

/** The accent's dot before the title of a recording nobody has watched. */
function UnwatchedDot() {
  return (
    <span
      data-slot="unwatched-dot"
      className="size-1.5 shrink-0 rounded-full bg-accent"
    >
      <span className="sr-only">未視聴</span>
    </span>
  )
}

/** The press a tile gives: open the recording, or while choosing, take it in or leave it out. */
function TilePress({
  recording,
  picking,
  className,
  children,
}: {
  recording: Recording
  picking?: Picking
  className?: string
  children: ReactNode
}) {
  const press = cn(
    'group block min-w-0 rounded-md text-ink no-underline outline-none focus-visible:shadow-ring',
    className,
  )

  if (picking) {
    const taken = picking.picked.has(recording.id)

    return (
      <button
        type="button"
        aria-pressed={taken}
        aria-label={`${recording.title} を選ぶ`}
        onClick={() => picking.onPick(recording.id, !taken)}
        className={cn(press, 'w-full cursor-pointer text-left')}
      >
        {children}
      </button>
    )
  }

  return (
    <Link href={recordingHref(recording.id)} className={press}>
      {children}
    </Link>
  )
}

/** The round mark over a picture while the library is choosing: empty, or filled with a tick once taken. */
function PickMark({ taken }: { taken: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-slot="pick-mark"
      className={cn(
        'absolute top-2 right-2 z-[2] grid size-6 place-items-center rounded-full shadow-[0_0_0_1.5px_#fff]',
        taken ? 'bg-btn text-on-ink' : 'bg-black/25',
      )}
    >
      {taken && <CheckIcon className="size-3.5" strokeWidth={2.4} />}
    </span>
  )
}

/** A recording in the grid: its picture, its title after the dot of one nobody has watched, and a line under it. */
export function RecordingTile({
  recording,
  title = recording.title,
  meta,
  picking,
}: {
  recording: Recording
  title?: string
  meta: string
  picking?: Picking
}) {
  const state = watchStateOf(recording)

  return (
    <TilePress recording={recording} picking={picking}>
      <Picture recording={recording}>
        {picking && <PickMark taken={picking.picked.has(recording.id)} />}
      </Picture>
      <span
        data-watch={state}
        className={cn(
          'mt-2 flex items-center gap-1.5 text-ui leading-[calc(18rem/16)] font-semibold tracking-[-0.008em]',
          state === 'watched' ? 'text-ink-2' : 'text-ink',
        )}
      >
        {state === 'unwatched' && <UnwatchedDot />}
        <span className="min-w-0 truncate">{title}</span>
      </span>
      <span className="mt-0.5 block truncate text-note text-ink-2">{meta}</span>
    </TilePress>
  )
}

function clockOf(recording: Recording): string {
  return formatClock(new Date(recording.startedAt).getTime())
}

const SHELF_HEADING =
  'text-heading leading-[calc(22rem/16)] font-bold tracking-[-0.015em] text-ink'

/** The recordings left part-way, in one row: as many as the width holds, each going on from where it was left. */
export function ContinueRow({ recordings }: { recordings: Recording[] }) {
  if (recordings.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="library-continue" data-slot="continue-row">
      <h2 id="library-continue" className={SHELF_HEADING}>
        続きから
      </h2>
      <ul className="mt-2.5 grid grid-cols-2 gap-4 max-[999px]:[&>li:nth-child(n+3)]:hidden min-[1000px]:grid-cols-3 max-[1299px]:[&>li:nth-child(n+4)]:hidden min-[1300px]:grid-cols-4 [&>li:nth-child(n+5)]:hidden">
        {recordings.map((recording) => {
          const left = minutesLeftOf(recording)

          return (
            <li key={recording.id} className="min-w-0">
              <Link
                href={playingOnHref(recording.id) as Route}
                className="group -m-1.5 grid grid-cols-[calc(148rem/16)_minmax(0,1fr)] items-center gap-3 rounded-lg p-1.5 text-ink no-underline outline-none transition-[background-color] duration-[140ms] ease-toy hover:bg-surface focus-visible:shadow-ring"
              >
                <Picture
                  recording={recording}
                  corner="rounded-sm"
                  lengthShown={false}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 z-[1] grid place-items-center bg-black/18 opacity-0 transition-opacity duration-[140ms] ease-toy group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <span className="grid size-[calc(34rem/16)] place-items-center rounded-full bg-white/95 text-[#111] [&_svg]:ml-0.5 [&_svg]:size-3.5 [&_svg]:fill-current">
                      <PlayIcon />
                    </span>
                  </span>
                </Picture>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-body leading-[calc(19rem/16)] font-semibold tracking-[-0.008em]">
                    {recording.title}
                  </span>
                  <span className="mt-[3px] block truncate text-sub text-ink-2">
                    {recording.channel}
                    {left !== undefined && (
                      <>
                        {' · '}残り <span className="font-code">{left}</span> 分
                      </>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const TILE_GRID =
  'grid grid-cols-[repeat(auto-fill,minmax(calc(200rem/16),1fr))] gap-x-4 gap-y-[calc(22rem/16)]'

/** Every recording in one grid, newest first, the day each started on written over the first of that day. */
export function DateGrid({
  recordings,
  now,
  picking,
}: {
  recordings: Recording[]
  now: Date
  picking?: Picking
}) {
  return (
    <ul data-slot="date-grid" className={TILE_GRID}>
      {byDay(recordings).flatMap(({ day, items }) => {
        const heading = dayHeadingOf(day, now)

        return items.map((recording, nth) => (
          <li
            key={recording.id}
            data-recording={recording.id}
            className="min-w-0"
          >
            <p
              aria-hidden={nth > 0 || undefined}
              className={cn(
                'mb-[calc(9rem/16)] flex h-4 gap-1.5 text-sub leading-4 font-semibold text-ink',
                nth > 0 && 'invisible',
              )}
            >
              {nth === 0 && (
                <>
                  {heading.near}
                  <span
                    className={cn(
                      'font-code',
                      heading.near && 'font-medium text-ink-2',
                    )}
                  >
                    {heading.date}
                  </span>
                </>
              )}
            </p>
            <RecordingTile
              recording={recording}
              meta={`${recording.channel} · ${clockOf(recording)}`}
              picking={picking}
            />
          </li>
        ))
      })}
    </ul>
  )
}

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
}: {
  series: Series<Recording>[]
  now: Date
  picking?: Picking
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
            <SeriesOpen series={open} now={now} picking={picking} />
          </li>,
        ]
      })}
    </ul>
  )
}

function SeriesCard({
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
            'before:absolute before:inset-x-[12%] before:-top-[11px] before:h-3 before:rounded-t-md before:bg-[color-mix(in_srgb,var(--ink)_10%,var(--bg))] after:absolute after:inset-x-[6%] after:-top-1.5 after:h-3 after:rounded-t-md after:bg-[color-mix(in_srgb,var(--ink)_20%,var(--bg))]',
        )}
      >
        <span
          className={cn(
            'relative z-[1] block rounded-md transition-shadow duration-[140ms] ease-toy group-focus-visible:shadow-ring',
            chosen && 'shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--ink)]',
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
          <span className="inline-flex items-center gap-[5px] font-semibold text-ink">
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

function SeriesOpen({
  series,
  now,
  picking,
}: {
  series: Series<Recording>
  now: Date
  picking?: Picking
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
              {' · '}未視聴 <span className="font-code">{unwatched}</span>
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
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
