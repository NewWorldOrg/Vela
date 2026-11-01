'use client'

import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { SPAN_DASH } from '@/lib/format'
import type { SearchHit } from '@/repository/search'
import type { ReservationWrite } from '@/repository/reservations'
import { GENRE_MARK_CLASS } from '@/components/guide/guide-metrics'
import { useOneTapReserve } from '@/components/guide/reserve-circle'
import { hitsByDay, marked } from '@/components/search/hit-parts'
import { pressable } from '@/components/vela/tactile'

interface Reserving {
  onReserve?: (programmeId: string) => Promise<ReservationWrite>
  onCancel?: (id: string) => Promise<ReservationWrite>
  onRestore?: (id: string) => Promise<ReservationWrite>
}

/** The pill at the right of a hit: `予約` reserves it in one press, and a reserved or recording hit says so and takes it back in one press, each with a toast that undoes it. */
function ReservePill({
  hit,
  onReserve,
  onCancel,
  onRestore,
}: Required<Pick<Reserving, 'onReserve' | 'onCancel'>> &
  Pick<Reserving, 'onRestore'> & { hit: SearchHit }) {
  const { mark, press } = useOneTapReserve({
    programmeId: hit.id,
    title: hit.title,
    booking: hit.booking,
    onReserve,
    onCancel,
    onRestore,
  })
  const held = mark !== 'none'

  return (
    <button
      type="button"
      data-slot="reserve-pill"
      data-mark={mark}
      aria-pressed={held}
      onClick={press}
      className={cn(
        'tap-target relative z-[1] inline-flex h-[calc(34rem/16)] shrink-0 cursor-pointer items-center gap-[calc(7rem/16)] rounded-full px-[calc(13rem/16)] text-sub font-semibold whitespace-nowrap outline-none focus-visible:shadow-ring',
        'transition-[background-color,color] duration-[140ms] ease-toy',
        pressable,
        held
          ? cn(
              'hover:bg-surface-2',
              mark === 'recording' ? 'text-rec-text' : 'text-warn-text',
            )
          : 'bg-surface-2 text-ink group-hover/hit:bg-accent-fill group-hover/hit:text-on-accent hover:bg-accent-fill-hover! hover:text-on-accent',
      )}
    >
      <i
        aria-hidden="true"
        className={cn(
          'size-3 rounded-full border-[1.75px]',
          held
            ? mark === 'recording'
              ? 'border-rec bg-rec shadow-[inset_0_0_0_2px_var(--bg)]'
              : 'border-warn bg-warn shadow-[inset_0_0_0_2px_var(--bg)]'
            : 'border-warn group-hover/hit:border-on-accent',
        )}
      />
      {mark === 'recording' ? '録画中' : held ? '予約済み' : '予約'}
    </button>
  )
}

const ROW =
  'group/hit relative grid min-h-[calc(66rem/16)] grid-cols-[calc(96rem/16)_calc(150rem/16)_minmax(0,1fr)_auto] items-center gap-x-5 rounded-md px-2.5 py-2 transition-[background-color] duration-[140ms] ease-toy hover:bg-surface max-[1000px]:grid-cols-[calc(76rem/16)_minmax(0,1fr)_auto]'

/** The hits on a screen wider than a phone: each a row of its time, channel, title over its description and the pill that reserves it, under the day it is on. A press on the row opens the programme. */
export function SearchHits({
  hits,
  words,
  onReserve,
  onCancel,
  onRestore,
}: Reserving & { hits: SearchHit[]; words: readonly string[] }) {
  return (
    <div data-slot="search-hits" className="max-w-[calc(1180rem/16)]">
      {hitsByDay(hits).map(({ day, near, hits: onTheDay }) => (
        <section
          key={day}
          aria-label={near ? `${near} ${day}` : day}
          className="mt-4 first:mt-0"
        >
          <h3 className="mx-2.5 mt-2 mb-1.5 flex gap-1.5 text-[calc(13rem/16)] font-semibold text-ink">
            {near}
            <span
              className={cn('tabular-nums', near && 'font-medium text-ink-2')}
            >
              {day}
            </span>
          </h3>
          <ol>
            {onTheDay.map((hit) => (
              <li
                key={hit.id}
                data-programme={hit.id}
                className={cn(
                  ROW,
                  'before:absolute before:top-0 before:right-2.5 before:left-[calc(116rem/16)] before:h-px before:bg-hair first:before:hidden hover:before:opacity-0 [&:hover+li]:before:opacity-0 max-[1000px]:before:left-[calc(96rem/16)]',
                )}
              >
                <span className="leading-[18px] tabular-nums">
                  <b className="block text-title font-semibold text-ink">
                    {hit.startLabel}
                  </b>
                  <span className="text-sub text-ink-2">
                    {SPAN_DASH.trim()}{' '}
                    {hit.endUndecided ? '終了未定' : hit.endLabel}
                  </span>
                </span>
                <span className="text-[calc(13rem/16)] leading-[18px] [overflow-wrap:anywhere] text-ink-2 max-[1000px]:hidden">
                  {hit.channelName}
                </span>
                <span className="min-w-0">
                  <Link
                    href={`/guide/programs/${hit.id}` as Route}
                    className="block text-[calc(14.5rem/16)] leading-5 font-semibold tracking-[-0.008em] text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-md focus-visible:after:shadow-ring"
                  >
                    <i
                      aria-hidden="true"
                      title={hit.genreLabel}
                      className={cn(
                        'guide-cell-genre-dot mr-2',
                        GENRE_MARK_CLASS[hit.genre],
                      )}
                    />
                    {marked(hit.title, words)}
                  </Link>
                  <span className="mt-0.5 line-clamp-1 text-sub text-ink-2">
                    <span className="hidden max-[1000px]:inline">
                      {hit.channelName}
                      {(hit.description ?? '') !== '' && '　'}
                    </span>
                    <span className="sr-only">{hit.genreLabel} </span>
                    {hit.description && marked(hit.description, words)}
                  </span>
                </span>
                <span className="flex justify-end">
                  {onReserve && onCancel && !(hit.booked && !hit.booking) ? (
                    <ReservePill
                      hit={hit}
                      onReserve={onReserve}
                      onCancel={onCancel}
                      onRestore={onRestore}
                    />
                  ) : (
                    hit.booked && (
                      <span className="px-[calc(13rem/16)] text-sub font-semibold text-warn-text">
                        予約済み
                      </span>
                    )
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
