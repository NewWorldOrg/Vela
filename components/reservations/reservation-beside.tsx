'use client'

import type { Reservation } from '@/repository/reservations'
import { ReservationStateChip } from '@/components/reservations/reservation-state-chip'
import type { ReservationActions } from '@/components/reservations/reservation-row'
import { whereFrom } from '@/components/reservations/reservation-row'
import {
  spanOf,
  clockOf,
} from '@/components/reservations/phone-reservation-rows'
import { ReservationChange } from '@/components/reservations/reservation-change'

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
