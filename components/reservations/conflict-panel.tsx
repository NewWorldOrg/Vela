'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import {
  conflictLineOf,
  whatIsLost,
  type Placed,
  type Span,
} from '@/lib/conflict-line'
import type {
  ConflictEntry,
  Reservation,
  ReservationWrite,
} from '@/repository/reservations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRightIcon } from '@/components/vela/icons'
import { GenreDot } from '@/components/reservations/genre-dot'
import { DisplacedNotice } from '@/components/reservations/displaced-notice'
import { useToast } from '@/components/vela/toast'
import type { ReservationActions } from '@/components/reservations/reservation-row'

function clockOf(at: string): string {
  return formatClock(new Date(at).getTime())
}

function said(written: ReservationWrite): string | undefined {
  if (written.state === 'ok') {
    return undefined
  }

  return written.state === 'rejected'
    ? written.message
    : 'サインインし直してください'
}

function percent(share: number): string {
  return `${share * 100}%`
}

const BAR_REM = { side: 26 / 16, phone: 22 / 16 }

const BAR_GAP_REM = { side: 6 / 16, phone: 4 / 16 }

const AXIS_REM = 22 / 16

/** Only the hours, when the line is long enough to carry more than two of them; the half hours crowd a narrow box. */
function hoursOf(ticks: { label: string; at: number }[]) {
  const hours = ticks.filter((tick) => tick.label.endsWith(':00'))

  return hours.length >= 2 ? hours : ticks
}

function labelShift(at: number): string {
  if (at < 0.06) {
    return 'translate-x-0'
  }

  return at > 0.94 ? '-translate-x-full' : '-translate-x-1/2'
}

function msOf(at: string): number {
  return new Date(at).getTime()
}

/** The rounded ends of the struck stretch: round where it meets an end of the programme that loses, square where it runs on. */
function hatchRadius(kept: Span[], lost: Span): string {
  const atStart =
    Math.min(...kept.map((one) => msOf(one.startAt))) <= msOf(lost.startAt)
  const atEnd =
    Math.max(...kept.map((one) => msOf(one.endAt))) >= msOf(lost.endAt)
  const r = 'var(--radius-sm)'

  return `${atStart ? r : 0} ${atEnd ? r : 0} ${atEnd ? r : 0} ${atStart ? r : 0}`
}

function Bar({
  place,
  row,
  title,
  genre,
  pitch,
}: {
  place: Placed
  row: number
  title: string
  genre?: ConflictEntry['genre']
  pitch: number
}) {
  return (
    <span
      className="absolute flex h-(--bar) items-center gap-1.5 overflow-hidden rounded-sm bg-raised px-(--bar-pad) text-(length:--bar-text) font-semibold whitespace-nowrap text-ink shadow-[0_0_0_1px_var(--hair)]"
      style={{
        top: `${row * pitch + 0.125}rem`,
        left: percent(place.left),
        width: percent(place.width),
      }}
    >
      <GenreDot genre={genre} />
      <span className="min-w-0 truncate">{title}</span>
    </span>
  )
}

/**
 * A conflict: the programmes that keep the tuner and the one that loses it on one line of hours with the lost stretch
 * struck through, then a row each — the ones that keep it said so, the one that loses it with what it goes without and
 * the press that gives it the tuner — and the way to the tuners. Beside the list on a wide screen, at the head of the
 * list on a phone.
 */
export function ConflictPanel({
  reservation,
  onRaise,
  on = 'side',
}: {
  reservation: Reservation
  onRaise: ReservationActions['onRaise']
  on?: 'side' | 'phone'
}) {
  const say = useToast()
  const [pending, start] = useTransition()
  const [displaced, setDisplaced] = useState<ConflictEntry[]>()
  const conflict = reservation.conflict
  const lost = reservation.span

  if (!conflict || !lost) {
    return null
  }

  const phone = on === 'phone'
  const kept = conflict.entries.flatMap((entry) =>
    entry.span ? [entry.span] : [],
  )
  const line = kept.length > 0 ? conflictLineOf(kept, lost) : undefined
  const loses = kept.length > 0 ? whatIsLost(kept, lost) : undefined
  const ticks = line ? hoursOf(line.ticks) : []
  const rows = line ? line.kept.length + 1 : 0
  const pitch = BAR_REM[on] + BAR_GAP_REM[on]

  const takeIt = () =>
    start(async () => {
      setDisplaced(undefined)

      const written = await onRaise(reservation.id, conflict.raiseTo)
      const problem = said(written)

      if (problem) {
        say({ text: problem })

        return
      }

      if (written.state === 'ok') {
        setDisplaced(written.displaced)
      }
    })

  const tuners = phone ? (
    <div className="flex justify-end border-t border-hair px-0.5 py-1">
      <Link
        href="/settings/tuners"
        className="flex h-11 items-center gap-1 px-1 text-ui font-semibold text-ink-2 no-underline outline-none hover:text-ink focus-visible:shadow-ring [&_svg]:size-4"
      >
        チューナーへ
        <ChevronRightIcon />
      </Link>
    </div>
  ) : (
    <Button variant="ghost" size="sm" asChild className="-mt-1 -mr-2 ml-auto">
      <Link href="/settings/tuners">チューナーへ</Link>
    </Button>
  )

  return (
    <section
      data-slot={phone ? 'phone-conflict' : 'conflict-panel'}
      aria-label={conflict.headline}
      className={cn(
        'bg-surface',
        phone
          ? 'rounded-xl px-3.5 pt-3.5'
          : 'rounded-xl px-[calc(18rem/16)] pt-[calc(18rem/16)] pb-2.5',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0">
          <h2
            className={cn(
              'font-bold tracking-[-0.01em] text-ink',
              phone ? 'text-title' : 'text-heading',
            )}
          >
            {conflict.headline}
          </h2>
          <p className="mt-0.5 text-sub text-ink-2">{conflict.body}</p>
        </div>
        {!phone && tuners}
      </div>
      {line && (
        <div
          aria-hidden="true"
          className={cn(
            'relative mx-1 mb-1.5',
            phone
              ? 'mt-3 [--bar-pad:calc(7rem/16)] [--bar-text:calc(11rem/16)] [--bar:calc(22rem/16)]'
              : 'mt-4 [--bar-pad:calc(9rem/16)] [--bar-text:calc(12rem/16)] [--bar:calc(26rem/16)]',
          )}
          style={{
            height: `${rows * pitch + AXIS_REM}rem`,
          }}
        >
          {ticks.map((tick) => (
            <span
              key={tick.label}
              className="absolute top-0 w-px bg-hair"
              style={{
                left: percent(tick.at),
                bottom: `${AXIS_REM - 0.25}rem`,
              }}
            />
          ))}
          {line.kept.map((place, nth) => (
            <Bar
              key={nth}
              place={place}
              row={nth}
              title={conflict.entries[nth]?.title ?? ''}
              genre={conflict.entries[nth]?.genre}
              pitch={pitch}
            />
          ))}
          <Bar
            place={line.lost}
            row={line.kept.length}
            title={reservation.title}
            genre={reservation.genre}
            pitch={pitch}
          />
          {line.overlap && (
            <span
              data-slot="conflict-overlap"
              className="absolute h-(--bar) bg-[repeating-linear-gradient(135deg,var(--warn-soft)_0_5px,transparent_5px_10px)] shadow-[inset_0_0_0_1.5px_var(--warn)]"
              style={{
                top: `${line.kept.length * pitch + 0.125}rem`,
                left: percent(line.overlap.left),
                width: percent(line.overlap.width),
                borderRadius: hatchRadius(kept, lost),
              }}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-3.5 font-code text-cap leading-none text-ink-2">
            {ticks.map((tick) => (
              <span
                key={tick.label}
                className={cn('absolute', labelShift(tick.at))}
                style={{ left: percent(tick.at) }}
              >
                {tick.label}
              </span>
            ))}
          </div>
        </div>
      )}
      <ul>
        {conflict.entries.map((entry, nth) => (
          <li
            key={nth}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-t border-hair px-0.5 py-[calc(11rem/16)]"
          >
            <span className="min-w-0">
              <span className="block truncate text-body font-semibold text-ink">
                {entry.title}
              </span>
              <span className="mt-0.5 block truncate font-code text-sub text-ink-2">
                {entry.meta}
              </span>
            </span>
            <Badge variant="ok">録る方</Badge>
          </li>
        ))}
        <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-t border-hair px-0.5 py-[calc(11rem/16)]">
          <span className="min-w-0">
            <span className="block truncate text-body font-semibold text-ink">
              {reservation.title}
            </span>
            {loses ? (
              <span className="mt-0.5 block text-sub font-semibold text-warn-text">
                {loses}
              </span>
            ) : (
              <span className="mt-0.5 block truncate font-code text-sub text-ink-2">
                {reservation.channelName} · {clockOf(lost.startAt)} –{' '}
                {clockOf(lost.endAt)}
              </span>
            )}
          </span>
          <Button
            variant="tone"
            size="sm"
            disabled={pending}
            onClick={takeIt}
            className="shrink-0"
          >
            こちらを録る
          </Button>
        </li>
      </ul>
      {displaced && (
        <DisplacedNotice entries={displaced} className="mb-2.5 bg-raised" />
      )}
      {phone && tuners}
    </section>
  )
}
