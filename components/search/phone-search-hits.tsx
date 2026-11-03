'use client'

import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { GENRE_MARK_CLASS } from '@/components/guide/guide-metrics'
import type { SearchHit } from '@/repository/search'
import type { ReservationWrite } from '@/repository/reservations'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ReserveCircle } from '@/components/guide/reserve-circle'
import { pressable } from '@/components/vela/tactile'
import { hitsByDay, marked } from '@/components/search/hit-parts'

/** The hits on a phone held upright: the count and the rule they would make, then the hits under the day they are on, each a row like the guide's with the circle that reserves it in one press. */
export function PhoneSearchHits({
  hits,
  total,
  words,
  ruleHref,
  onReserve,
  onCancel,
  onRestore,
  chosenId,
  onChoose,
  className,
}: {
  /** The hit whose detail stands beside the list, on a phone held on its side: ringed. */
  chosenId?: string
  /** Pressing a row shows its detail beside the list rather than going to it. */
  onChoose?: (hit: SearchHit) => void
  className?: string
  hits: SearchHit[]
  total: number
  words: readonly string[]
  ruleHref?: Route
  onReserve?: (programmeId: string) => Promise<ReservationWrite>
  onCancel?: (id: string) => Promise<ReservationWrite>
  onRestore?: (id: string) => Promise<ReservationWrite>
}) {
  const days = hitsByDay(hits)

  return (
    <div data-slot="phone-search-hits" className={cn('-mx-3.5', className)}>
      <div className="flex items-center gap-2 px-4 pt-1 pb-2">
        <span className="text-ui text-ink-2 tabular-nums">{total} 件</span>
        {ruleHref && (
          <Button variant="tone" size="sm" asChild className="ml-auto">
            <Link href={ruleHref}>この条件でルールを作成</Link>
          </Button>
        )}
      </div>
      {days.map(({ day, near, hits: onTheDay }) => (
        <section key={day} aria-label={near ? `${near} ${day}` : day}>
          <h3 className="flex gap-1.5 px-4 pt-3.5 pb-1.5 text-[calc(13rem/16)] font-semibold text-ink">
            {near}
            <span
              className={cn('tabular-nums', near && 'font-medium text-ink-2')}
            >
              {day}
            </span>
          </h3>
          <ol className="mx-3.5 overflow-hidden rounded-lg bg-surface">
            {onTheDay.map((hit) => (
              <li
                key={hit.id}
                data-programme={hit.id}
                data-keep={hit.id}
                data-chosen={hit.id === chosenId ? '' : undefined}
                className={cn(
                  'relative flex items-stretch pr-1 before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-hair first:before:hidden',
                  hit.id === chosenId &&
                    'z-[1] rounded-lg outline-2 -outline-offset-2 outline-accent',
                )}
              >
                <RowPress hit={hit} onChoose={onChoose}>
                  <span className="flex w-[calc(46rem/16)] shrink-0 flex-col leading-snug tabular-nums">
                    <span className="text-ui font-semibold">
                      {hit.startLabel}
                    </span>
                    <span className="text-cap text-ink-2">
                      {hit.endUndecided ? '未定' : hit.endLabel}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body leading-snug font-semibold">
                      {marked(hit.title, words)}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-note text-ink-2">
                      <ChannelMark
                        logo={hit.channelLogo}
                        no={hit.channelNo}
                        className="shrink-0"
                      />
                      <span className="truncate">{hit.channelName}</span>
                    </span>
                    {hit.description && (
                      <span className="mt-0.5 line-clamp-2 text-note text-ink-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'guide-cell-genre-dot mr-1.5',
                            GENRE_MARK_CLASS[hit.genre],
                          )}
                        />
                        {marked(hit.description, words)}
                      </span>
                    )}
                  </span>
                </RowPress>
                {onReserve && onCancel && (
                  <ReserveCircle
                    programmeId={hit.id}
                    title={hit.title}
                    booking={hit.booking}
                    onReserve={onReserve}
                    onCancel={onCancel}
                    onRestore={onRestore}
                  />
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

const ROW_PRESS =
  'flex min-h-16 min-w-0 flex-1 items-start gap-3 py-3 pr-1.5 pl-4 text-left text-ink no-underline outline-none focus-visible:shadow-ring'

/** What pressing a row does: shows its detail beside the list, or goes to the programme's screen. */
function RowPress({
  hit,
  onChoose,
  children,
}: {
  hit: SearchHit
  onChoose?: (hit: SearchHit) => void
  children: ReactNode
}) {
  if (onChoose) {
    return (
      <button
        type="button"
        onClick={() => onChoose(hit)}
        className={cn(ROW_PRESS, pressable)}
      >
        {children}
      </button>
    )
  }

  return (
    <Link href={`/guide/programs/${hit.id}` as Route} className={ROW_PRESS}>
      {children}
    </Link>
  )
}
