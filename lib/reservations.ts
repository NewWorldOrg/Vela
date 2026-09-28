import type {
  Reservation,
  ReservationStanding,
} from '@/repository/reservations'

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
    default:
      return false
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

export type ReservationLine =
  | { kind: 'one'; reservation: Reservation }
  | { kind: 'relay'; key: string; segments: Reservation[] }

export function linesOf(items: readonly Reservation[]): ReservationLine[] {
  const segmentsOf = new Map<string, Reservation[]>()

  for (const one of items) {
    if (one.relay) {
      segmentsOf.set(one.relay.key, [
        ...(segmentsOf.get(one.relay.key) ?? []),
        one,
      ])
    }
  }

  const lines: ReservationLine[] = []
  const placed = new Set<string>()

  for (const one of items) {
    const segments = one.relay ? segmentsOf.get(one.relay.key) : undefined

    if (!one.relay || !segments || segments.length < 2) {
      lines.push({ kind: 'one', reservation: one })
      continue
    }

    if (placed.has(one.relay.key)) {
      continue
    }

    placed.add(one.relay.key)
    lines.push({
      kind: 'relay',
      key: one.relay.key,
      segments: [...segments].sort(
        (left, right) =>
          Date.parse(left.relay?.startAt ?? '') -
          Date.parse(right.relay?.startAt ?? ''),
      ),
    })
  }

  return lines
}

export function relaySpanOf(segments: readonly Reservation[]): {
  startAt: string
  endAt: string
} {
  const starts = segments.map((one) => one.relay?.startAt ?? '')
  const ends = segments.map((one) => one.relay?.endAt ?? '')
  const earliest = starts.reduce((a, b) =>
    Date.parse(b) < Date.parse(a) ? b : a,
  )
  const latest = ends.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a))

  return { startAt: earliest, endAt: latest }
}

const NEEDS_A_LOOK_FIRST: ReservationStanding[] = [
  'recording',
  'conflict',
  'missed',
  'failed',
  'truncated',
  'scheduled',
  'complete',
]

export function leadingSegmentOf(
  segments: readonly Reservation[],
): Reservation {
  for (const standing of NEEDS_A_LOOK_FIRST) {
    const found = segments.find((one) => one.standing === standing)

    if (found) {
      return found
    }
  }

  return (
    segments.find((one) => one.standing === 'cancelled' && one.sameBroadcast) ??
    segments[0]
  )
}
