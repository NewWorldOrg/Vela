import type { ReservationStanding } from '@/repository/reservations'

/**
 * Where a reservation sits on its list, and the way in from elsewhere. Both
 * are spelled here so a link and the row it names cannot drift apart and
 * leave the reader at the top of a list to find the row themselves.
 */
export function reservationAnchor(id: string): string {
  return `reservation-${id}`
}

export function reservationHref(id: string): string {
  return `/reservations#${reservationAnchor(id)}`
}

/**
 * The bounds the API holds a revision to. They live outside `repository/` so
 * the form that has to say them can read them without reaching the API.
 */
export const PRIORITY_RANGE = { least: 1, most: 99 }

export const MARGIN_RANGE = { least: 0, most: 3600 }

export function withinPriority(value: number): boolean {
  return value >= PRIORITY_RANGE.least && value <= PRIORITY_RANGE.most
}

export function withinMargin(value: number): boolean {
  return value >= MARGIN_RANGE.least && value <= MARGIN_RANGE.most
}

/** A whole number of seconds, or nothing at all when it is not one. */
export function wholeNumber(value: string): number | undefined {
  const trimmed = value.trim()

  return trimmed !== '' && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined
}

/**
 * What a reservation has to be for it to be thrown away, read the same way the
 * API reads it. A reservation still to be recorded is cancelled rather than
 * thrown away, so the record of it stays; one being taken up as a recording is
 * neither, because the recording it is turning into is not written down yet;
 * and one a recording came of goes after that recording rather than before it.
 */
export interface Discardable {
  standing: ReservationStanding
  /** Whether a recording is written down against this reservation. */
  recorded: boolean
  /** Whether the broadcast window, the margin it runs on included, has passed. */
  windowClosed: boolean
}

/**
 * What a reservation has to be for it to be brought back, read the same way the
 * API reads it. Being cancelled is not enough on its own: a window that has
 * closed leaves a row nothing will ever record, so the API refuses it and the
 * screen does not offer it.
 */
export function isRestorable(reservation: Discardable): boolean {
  return reservation.standing === 'cancelled' && !reservation.windowClosed
}

export function isDiscardable(reservation: Discardable): boolean {
  if (reservation.recorded) {
    return false
  }

  switch (reservation.standing) {
    case 'recording':
      return false
    case 'scheduled':
    case 'conflict':
      return reservation.windowClosed
    case 'cancelled':
    case 'missed':
    case 'complete':
    case 'truncated':
    case 'failed':
      return true
  }
}

/**
 * The standings the recording ledger put there, rather than the reservation
 * itself: reaching one of them means a recording was written down against this
 * reservation and ran to an outcome.
 */
const CAME_OF_A_RECORDING: ReservationStanding[] = [
  'complete',
  'truncated',
  'failed',
]

/**
 * Whether the recording this reservation came to has since been thrown away.
 *
 * The projection on the reservation outlives the recording row on purpose: the
 * recording having happened and the file having been removed afterwards are two
 * different facts, and the ledger keeps the first one after the second. So a
 * settled reservation with nothing to open is not a fault — it is the state the
 * decision asks for, and the only thing missing was the screen saying so.
 *
 * It is read off the standing rather than off the recording, because the
 * standings above can only have come from a recording that existed: the outcome
 * is written onto the reservation by the ledger and cannot be reached any other
 * way.
 */
export function recordingWasRemoved(reservation: {
  standing: ReservationStanding
  recorded: boolean
}): boolean {
  return (
    !reservation.recorded && CAME_OF_A_RECORDING.includes(reservation.standing)
  )
}
