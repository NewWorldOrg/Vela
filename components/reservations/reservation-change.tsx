'use client'

import type { Reservation } from '@/repository/reservations'
import { EditReservationDialog } from '@/components/reservations/edit-reservation-dialog'
import type { ReservationActions } from '@/components/reservations/reservation-row'

/** The change of one reservation, in the place it opens: its priority, margins and encoding, saved where it stands. */
export function ReservationChange({
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
