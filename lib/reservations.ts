import type { ReservationStanding } from '@/repository/reservations'

export function reservationAnchor(id: string): string {
  return `reservation-${id}`
}

export function reservationHref(id: string): string {
  return `/reservations?show=all#${reservationAnchor(id)}`
}

export const PRIORITY_RANGE = { least: 1, most: 99 }

export const MARGIN_RANGE = { least: 0, most: 3600 }

export function withinPriority(value: number): boolean {
  return value >= PRIORITY_RANGE.least && value <= PRIORITY_RANGE.most
}

export function withinMargin(value: number): boolean {
  return value >= MARGIN_RANGE.least && value <= MARGIN_RANGE.most
}

export function wholeNumber(value: string): number | undefined {
  const trimmed = value.trim()

  return trimmed !== '' && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined
}

export interface Discardable {
  standing: ReservationStanding
  recorded: boolean
  windowClosed: boolean
}

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

const CAME_OF_A_RECORDING: ReservationStanding[] = [
  'complete',
  'truncated',
  'failed',
]

export function recordingWasRemoved(reservation: {
  standing: ReservationStanding
  recorded: boolean
}): boolean {
  return (
    !reservation.recorded && CAME_OF_A_RECORDING.includes(reservation.standing)
  )
}
