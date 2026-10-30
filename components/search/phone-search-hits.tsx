'use client'

import { Fragment, type ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { GENRE_MARK_CLASS } from '@/components/guide/guide-metrics'
import type { SearchHit } from '@/repository/search'
import type { ReservationWrite } from '@/repository/reservations'
import { ChannelMark } from '@/components/vela/channel-mark'
import { ListIcon } from '@/components/vela/icons'
import { ReserveCircle } from '@/components/guide/reserve-circle'
import { pressable } from '@/components/vela/tactile'

/** The words a hit is drawn with, the asked-for ones in butter so the eye finds why it was found. */
export function marked(text: string, words: readonly string[]): ReactNode {
  const asked = words.filter((word) => word.length > 0)

  if (asked.length === 0) {
    return text
  }

  const pattern = new RegExp(
    `(${asked.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  )

  return text.split(pattern).map((part, nth) =>
    nth % 2 === 1 ? (
      <mark key={nth} className="bg-tint-butter text-inherit">
        {part}
      </mark>
    ) : (
      <Fragment key={nth}>{part}</Fragment>
    ),
  )
}

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
  const days = hits.reduce<{ day: string; hits: SearchHit[] }[]>(
    (sorted, hit) => {
      const last = sorted[sorted.length - 1]

      if (last && last.day === hit.dayLabel) {
        last.hits.push(hit)
      } else {
        sorted.push({ day: hit.dayLabel, hits: [hit] })
      }

      return sorted
    },
    [],
  )

  return (
    <div data-slot="phone-search-hits" className={cn('-mx-3.5', className)}>
      <div className="flex items-center gap-2 px-4 pt-1 pb-2">
        <span className="text-sub text-ink-3">
          <b className="font-code font-bold text-ink">{total}</b> 件
        </span>
        {ruleHref && (
          <Link
            href={ruleHref}
            className="ml-auto flex h-11 items-center gap-1.5 rounded-full px-1 text-sub font-bold text-brand no-underline outline-none focus-visible:shadow-ring [&_svg]:size-4"
          >
            <ListIcon />
            この条件でルールを作成
          </Link>
        )}
      </div>
      {days.map(({ day, hits: onTheDay }) => (
        <section key={day} aria-label={day}>
          <h3 className="px-4 pt-3 pb-1.5 font-code text-note font-bold tracking-[0.06em] text-ink-3">
            {day}
          </h3>
          <ol className="border-y border-line bg-surface">
            {onTheDay.map((hit) => (
              <li
                key={hit.id}
                data-programme={hit.id}
                data-keep={hit.id}
                data-chosen={hit.id === chosenId ? '' : undefined}
                className={cn(
                  'flex items-stretch border-b border-dashed border-line pr-1 last:border-b-0',
                  hit.id === chosenId &&
                    'relative z-[1] outline-2 -outline-offset-2 outline-brand-line',
                )}
              >
                <RowPress hit={hit} onChoose={onChoose}>
                  <span className="flex w-[calc(46rem/16)] shrink-0 flex-col font-code leading-snug tabular-nums">
                    <span className="text-ui font-medium">
                      {hit.startLabel}
                    </span>
                    <span className="text-cap text-ink-3">
                      {hit.endUndecided ? '未定' : hit.endLabel}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body leading-snug font-medium">
                      {marked(hit.title, words)}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-note text-ink-3">
                      <ChannelMark
                        logo={hit.channelLogo}
                        no={hit.channelNo}
                        className="shrink-0"
                      />
                      <span className="truncate">{hit.channelName}</span>
                    </span>
                    {hit.description && (
                      <span className="mt-0.5 line-clamp-2 text-note text-ink-3">
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
