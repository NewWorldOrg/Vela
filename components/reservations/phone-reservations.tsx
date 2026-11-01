'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatClock } from '@/lib/format'
import { calendarDayOf, dayHeadingOf } from '@/lib/library-days'
import type { Span } from '@/lib/conflict-line'
import type { Reservation, ReservationWrite } from '@/repository/reservations'
import { CloseIcon } from '@/components/vela/icons'
import { useToast } from '@/components/vela/toast'
import { pressable } from '@/components/vela/tactile'
import { ReservationStateChip } from '@/components/reservations/reservation-state-chip'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import { GenreDot } from '@/components/reservations/genre-dot'
import type { ReservationActions } from '@/components/reservations/reservation-row'
import { whereFrom } from '@/components/reservations/reservation-row'

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
              <h2 className="flex items-baseline gap-1.5 px-[calc(18rem/16)] pt-3.5 pb-2 text-title font-bold tracking-[-0.01em] text-ink">
                {heading.near ?? (
                  <span className="font-code">{heading.date}</span>
                )}
                {heading.near && (
                  <span className="font-code text-sub font-medium text-ink-2">
                    {heading.date}
                  </span>
                )}
              </h2>
            )}
            <ul>
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
                      "relative before:absolute before:top-0 before:right-3 before:left-[calc(78rem/16)] before:h-px before:bg-hair before:content-[''] first:before:hidden",
                      reservation.id === chosenId &&
                        'z-[1] rounded-md bg-surface before:hidden [&+li]:before:hidden',
                      opened &&
                        'rounded-md bg-surface before:hidden [&+li]:before:hidden',
                    )}
                  >
                    <div className="flex items-stretch pr-1.5">
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
                          'flex min-h-[calc(62rem/16)] min-w-0 flex-1 items-center gap-2.5 py-2.5 pr-1 pl-[calc(18rem/16)] text-left outline-none focus-visible:shadow-ring',
                          pressable,
                        )}
                      >
                        <span className="flex w-[calc(50rem/16)] shrink-0 flex-col font-code leading-[calc(19rem/16)] tabular-nums">
                          <span className="text-title font-semibold text-ink">
                            {span ? clockOf(span.startAt) : ''}
                          </span>
                          <span className="text-sub text-ink-2">
                            {span ? clockOf(span.endAt) : ''}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-[calc(7rem/16)] text-title leading-[calc(19rem/16)] font-semibold text-ink">
                            <GenreDot genre={reservation.genre} />
                            <span className="min-w-0 truncate">
                              {reservation.title}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-sub text-ink-2">
                            {reservation.channelName} · {whereFrom(reservation)}
                          </span>
                          {reservation.standing !== 'scheduled' &&
                            !recording && (
                              <span className="mt-1 flex">
                                <ReservationStateChip
                                  reservation={reservation}
                                />
                              </span>
                            )}
                        </span>
                        {recording && (
                          <span className="mr-1 flex shrink-0">
                            <ReservationStateChip reservation={reservation} />
                          </span>
                        )}
                      </button>
                      {cancellable && !recording ? (
                        <button
                          type="button"
                          aria-label="取り消す"
                          onClick={() => takeBack(reservation)}
                          className={cn(
                            'flex size-11 shrink-0 items-center justify-center self-center rounded-full text-ink-2 outline-none hover:bg-surface-2 focus-visible:shadow-ring [&_svg]:size-[calc(17rem/16)]',
                            pressable,
                          )}
                        >
                          <CloseIcon />
                        </button>
                      ) : (
                        !recording && (
                          <span aria-hidden="true" className="w-11 shrink-0" />
                        )
                      )}
                    </div>
                    {opened && !onChoose && (
                      <div className="px-[calc(18rem/16)] pt-1 pb-4">
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
      layout="stack"
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
      <h2 className="text-section font-bold text-ink">{reservation.title}</h2>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sub text-ink-2">
        {span && (
          <span className="font-code tabular-nums">
            {clockOf(span.startAt)} – {clockOf(span.endAt)}
          </span>
        )}
        <span>{reservation.channelName}</span>
        <span>{whereFrom(reservation)}</span>
      </p>
      {reservation.standing !== 'scheduled' && (
        <p className="mt-2 flex">
          <ReservationStateChip reservation={reservation} />
        </p>
      )}
      <div className="mt-4 border-t border-hair pt-4">
        <ReservationChange
          reservation={reservation}
          actions={actions}
          onDone={onDone}
        />
      </div>
    </div>
  )
}
