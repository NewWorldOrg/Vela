'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import { calendarDayOf, dayHeadingOf } from '@/lib/library-days'
import { conflictLineOf, whatIsLost, type Span } from '@/lib/conflict-line'
import type { Reservation, ReservationWrite } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { ChannelMark } from '@/components/vela/channel-mark'
import { useToast } from '@/components/vela/toast'
import { pressable } from '@/components/vela/tactile'
import { ReservationStateChip } from '@/components/reservations/reservation-state-chip'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
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

/** A conflict, open at the head of the phone's list: the programmes on one line of half hours with their overlap struck through, then a row each, the ones that keep the tuner said so and the one that loses it with what it goes without and the press that gives it the tuner. */
export function PhoneConflict({
  reservation,
  onRaise,
}: {
  reservation: Reservation
  onRaise: ReservationActions['onRaise']
}) {
  const say = useToast()
  const [pending, start] = useTransition()
  const conflict = reservation.conflict
  const lost = reservation.span

  if (!conflict || !lost) {
    return null
  }

  const kept = conflict.entries.flatMap((entry) =>
    entry.span ? [entry.span] : [],
  )
  const line: ReturnType<typeof conflictLineOf> | undefined =
    kept.length > 0 ? conflictLineOf(kept, lost) : undefined
  const loses = kept.length > 0 ? whatIsLost(kept, lost) : undefined

  const takeIt = () =>
    start(async () => {
      const problem = said(await onRaise(reservation.id, conflict.raiseTo))

      if (problem) {
        say({ text: problem })
      }
    })

  return (
    <section
      data-slot="phone-conflict"
      aria-label={conflict.headline}
      className="rounded-xl border border-lemon-line bg-lemon-soft px-3.5 pt-3.5 pb-3"
    >
      <p className="flex items-center gap-2 text-title font-bold text-ink [&_svg]:size-5 [&_svg]:text-lemon">
        <WarningIcon />
        {conflict.headline}
      </p>
      {line && (
        <div
          aria-hidden="true"
          className="relative mx-0.5 mt-3 mb-2.5"
          style={{ height: `${(18 + (line.kept.length + 1) * 24) / 16}rem` }}
        >
          <div className="absolute inset-x-0 top-0 h-3 font-code text-micro leading-none text-ink-2">
            {line.ticks.map((tick, nth) => (
              <span
                key={tick.label}
                className={cn(
                  'absolute',
                  nth === 0 && 'translate-x-0',
                  nth > 0 && nth < line.ticks.length - 1 && '-translate-x-1/2',
                  nth === line.ticks.length - 1 && '-translate-x-full',
                )}
                style={{ left: percent(tick.at) }}
              >
                {tick.label}
              </span>
            ))}
          </div>
          {line.overlap && (
            <div
              data-slot="conflict-overlap"
              className="absolute top-3.5 bottom-0 border-x border-lemon-line bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--lemon)_22%,transparent)_0_4px,transparent_4px_8px)]"
              style={{
                left: percent(line.overlap.left),
                width: percent(line.overlap.width),
              }}
            />
          )}
          {line.kept.map((place, nth) => (
            <div
              key={nth}
              className="absolute h-5 truncate rounded-sm border border-brand-line bg-brand-soft px-[calc(7rem/16)] text-micro leading-5 font-bold text-brand"
              style={{
                top: `${(18 + nth * 24) / 16}rem`,
                left: percent(place.left),
                width: percent(place.width),
              }}
            >
              {conflict.entries[nth]?.title}
            </div>
          ))}
          <div
            className="absolute h-5 truncate rounded-sm border border-dashed border-line-strong bg-surface px-[calc(7rem/16)] text-micro leading-5 font-bold text-ink-2"
            style={{
              top: `${(18 + line.kept.length * 24) / 16}rem`,
              left: percent(line.lost.left),
              width: percent(line.lost.width),
            }}
          >
            {reservation.title}
          </div>
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {conflict.entries.map((entry, nth) => (
          <li
            key={nth}
            className="flex items-center gap-2.5 rounded-lg bg-surface py-2.5 pr-2 pl-3"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ui font-bold">
                {entry.title}
              </span>
              <span className="block truncate font-code text-note text-ink-2">
                {entry.meta}
              </span>
            </span>
            <Badge variant="ok" className="shrink-0 font-bold">
              <CheckIcon />
              録る方
            </Badge>
          </li>
        ))}
        <li className="flex items-center gap-2.5 rounded-lg bg-surface py-2.5 pr-2 pl-3">
          <ChannelMark
            logo={reservation.channelLogo}
            no={reservation.channelNo}
            className="shrink-0"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-ui font-bold">
              {reservation.title}
            </span>
            <span className="block font-code text-note text-ink-2">
              {clockOf(lost.startAt)}–{clockOf(lost.endAt)}
            </span>
            {loses && (
              <span className="block text-note font-bold text-lemon">
                {loses}
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
      <div className="mt-1 flex justify-end">
        <Link
          href="/settings/tuners"
          className="flex h-11 items-center gap-1 px-1 text-note font-bold text-brand no-underline outline-none focus-visible:shadow-ring [&_svg]:size-4"
        >
          チューナーへ
          <ChevronRightIcon />
        </Link>
      </div>
    </section>
  )
}

function spanOf(reservation: Reservation): Span | undefined {
  return reservation.span
}

/** The reservations on a phone held upright: under the day each starts on, a row each of its start and end, its title, channel and where it came from, a chip only for what needs attention, and the × that takes it back. Pressing the row opens its change under it. */
export function PhoneReservationRows({
  reservations,
  now,
  actions,
  chosenId,
  onChoose,
  className,
}: {
  reservations: Reservation[]
  now: Date
  actions: ReservationActions
  /** The reservation whose detail stands beside the list, on a phone held on its side: ringed. */
  chosenId?: string
  /** Pressing a row shows its detail and change beside the list rather than under the row. */
  onChoose?: (reservation: Reservation) => void
  className?: string
}) {
  const [open, setOpen] = useState<string>()
  const say = useToast()
  const [, start] = useTransition()
  const days: { day: string; items: Reservation[] }[] = []

  for (const reservation of reservations) {
    const span = spanOf(reservation)
    const day = span ? calendarDayOf(span.startAt) : ''
    const last = days.find((one) => one.day === day)

    if (last) {
      last.items.push(reservation)
    } else {
      days.push({ day, items: [reservation] })
    }
  }

  const takeBack = (reservation: Reservation) =>
    start(async () => {
      const problem = said(await actions.onCancel(reservation.id))

      if (problem) {
        say({ text: problem })

        return
      }

      say({
        text: `予約を取り消しました　${reservation.title}`,
        action: {
          label: '元に戻す',
          onPress: () => void actions.onRestore(reservation.id),
        },
      })
    })

  return (
    <div
      data-slot="phone-reservation-rows"
      className={cn('-mx-3.5', className)}
    >
      {days.map(({ day, items }) => {
        const heading = day ? dayHeadingOf(day, now) : undefined

        return (
          <section key={day} aria-label={heading?.near ?? heading?.date}>
            {heading && (
              <h2 className="flex items-center gap-2 px-4 pt-4 pb-1.5 text-note font-bold tracking-[0.06em] text-ink-2">
                {heading.near}
                <span className="font-code font-medium">{heading.date}</span>
              </h2>
            )}
            <ul className="border-y border-line bg-surface">
              {items.map((reservation) => {
                const span = spanOf(reservation)
                const opened = open === reservation.id
                const recording = reservation.standing === 'recording'
                const cancellable =
                  reservation.standing === 'scheduled' ||
                  reservation.standing === 'conflict'

                return (
                  <li
                    key={reservation.id}
                    data-reservation={reservation.id}
                    data-keep={reservation.id}
                    data-chosen={reservation.id === chosenId ? '' : undefined}
                    className={cn(
                      'border-b border-dashed border-line last:border-b-0',
                      reservation.id === chosenId &&
                        'relative z-[1] outline-2 -outline-offset-2 outline-brand-line',
                    )}
                  >
                    <div className="flex items-stretch pr-1">
                      <button
                        type="button"
                        aria-expanded={onChoose ? undefined : opened}
                        aria-pressed={
                          onChoose ? reservation.id === chosenId : undefined
                        }
                        onClick={() =>
                          onChoose
                            ? onChoose(reservation)
                            : setOpen(opened ? undefined : reservation.id)
                        }
                        className={cn(
                          'flex min-h-[calc(68rem/16)] min-w-0 flex-1 items-start gap-2.5 py-2.5 pr-1 pl-4 text-left outline-none focus-visible:shadow-ring',
                          pressable,
                        )}
                      >
                        <span className="flex w-11 shrink-0 flex-col pt-0.5 font-code leading-snug tabular-nums">
                          <span className="text-ui font-medium">
                            {span ? clockOf(span.startAt) : ''}
                          </span>
                          <span className="text-cap text-ink-2">
                            {span ? clockOf(span.endAt) : ''}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ui leading-normal font-bold">
                            {reservation.title}
                          </span>
                          <span className="flex min-w-0 items-center gap-1.5 text-sub text-ink-2">
                            <span className="shrink-0">
                              {reservation.channelName}
                            </span>
                            <i
                              aria-hidden="true"
                              className="size-[3px] shrink-0 rounded-full bg-ink-3 opacity-70"
                            />
                            <span className="min-w-0 truncate">
                              {reservation.ruleName
                                ? `${reservation.origin}「${reservation.ruleName}」`
                                : reservation.origin}
                            </span>
                          </span>
                          {reservation.standing !== 'scheduled' && (
                            <span className="mt-1 flex">
                              <ReservationStateChip reservation={reservation} />
                            </span>
                          )}
                        </span>
                      </button>
                      {cancellable && !recording ? (
                        <button
                          type="button"
                          aria-label="取り消す"
                          onClick={() => takeBack(reservation)}
                          className={cn(
                            'flex size-11 shrink-0 items-center justify-center self-center rounded-full text-ink-2 outline-none focus-visible:shadow-ring',
                            pressable,
                          )}
                        >
                          <span className="flex size-8 items-center justify-center rounded-full border-[1.5px] border-line-strong bg-surface [&_svg]:size-[calc(15rem/16)]">
                            <CloseIcon />
                          </span>
                        </button>
                      ) : (
                        <span aria-hidden="true" className="w-11 shrink-0" />
                      )}
                    </div>
                    {opened && !onChoose && (
                      <div className="border-t border-dashed border-line px-4 pt-4 pb-4">
                        <ReservationChange
                          reservation={reservation}
                          actions={actions}
                          onDone={() => setOpen(undefined)}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/** The change of one reservation, in the place it opens: its priority, margins and encoding, saved where it stands. */
function ReservationChange({
  reservation,
  actions,
  onDone,
}: {
  reservation: Reservation
  actions: ReservationActions
  onDone: () => void
}) {
  return (
    <EditReservationDialog
      key={reservation.id}
      inline
      open
      onOpenChange={(next) => !next && onDone()}
      onRevise={actions.onRevise}
      booking={{
        id: reservation.id,
        title: reservation.title,
        priority: reservation.priority,
        marginBeforeSeconds: reservation.marginBeforeSeconds,
        marginAfterSeconds: reservation.marginAfterSeconds,
        encodeWhenRecorded: reservation.encodeWhenRecorded,
      }}
    />
  )
}

/** One reservation beside the list on a phone held on its side: its title, channel, time and where it came from, a chip for what needs attention, and its change under them. */
export function ReservationBeside({
  reservation,
  actions,
  onDone,
}: {
  reservation: Reservation
  actions: ReservationActions
  onDone: () => void
}) {
  const span = spanOf(reservation)

  return (
    <div data-slot="reservation-beside">
      <h2 className="heading text-section leading-[1.45]">
        {reservation.title}
      </h2>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sub text-ink-2">
        {span && (
          <span className="font-code tabular-nums">
            {clockOf(span.startAt)}–{clockOf(span.endAt)}
          </span>
        )}
        <span>{reservation.channelName}</span>
        <span>
          {reservation.ruleName
            ? `${reservation.origin}「${reservation.ruleName}」`
            : reservation.origin}
        </span>
      </p>
      {reservation.standing !== 'scheduled' && (
        <p className="mt-2 flex">
          <ReservationStateChip reservation={reservation} />
        </p>
      )}
      <div className="mt-4 border-t border-dashed border-line pt-4">
        <ReservationChange
          reservation={reservation}
          actions={actions}
          onDone={onDone}
        />
      </div>
    </div>
  )
}
