import type { components } from '@/repository/client/schema'

type LiveSessionResponder = components['schemas']['LiveSessionResponder']
type LiveSessionsAnswer =
  components['schemas']['BaseResponderOfIReadOnlyListOfLiveSessionResponder']

/**
 * One channel in one profile, as the API is encoding it right now.
 *
 * The API counts a session, not a viewer. `dropped` is every picture thrown
 * away for a viewer who had fallen too far behind, over the life of the
 * session and whoever it was thrown away for — viewers who have since left
 * included. `queued` is how many pictures the slowest viewer still on it is
 * behind by. Neither is on the wire a viewer holds: the wire says how far a
 * channel has come and why it was refused or ended, and nothing about what
 * it has had to skip.
 */
export interface LiveSessionReading {
  networkId: number
  serviceId: number
  profile: string
  viewers: number
  dropped: number
  queued: number
}

/** The two counts of a session's backlog, read for the one being watched. */
export interface LiveBacklog {
  dropped: number
  queued: number
}

/** What names a session: the channel and the profile it is encoded in. */
export interface LiveSeat {
  networkId: number
  serviceId: number
  profile: string
}

function count(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Whether the body is the answer the API gives at this path. It is checked in
 * shape and not trusted by address, because the browser reads it with a bare
 * `fetch` and a proxy in the way can answer with anything at all.
 */
function isAnswer(body: unknown): body is LiveSessionsAnswer {
  return (
    isRecord(body) &&
    (body.data === null || body.data === undefined || Array.isArray(body.data))
  )
}

function isSession(item: unknown): item is LiveSessionResponder {
  return (
    isRecord(item) &&
    typeof item.profile === 'string' &&
    item.networkId !== undefined &&
    item.serviceId !== undefined &&
    item.dropped !== undefined &&
    item.queued !== undefined
  )
}

function toReading(session: LiveSessionResponder): LiveSessionReading {
  return {
    networkId: count(session.networkId),
    serviceId: count(session.serviceId),
    profile: session.profile,
    viewers: count(session.viewers),
    dropped: count(session.dropped),
    queued: count(session.queued),
  }
}

/**
 * The sessions in the body, or nothing where the body is not the answer.
 *
 * Nothing and none are told apart: an empty list is the API saying no channel
 * is being encoded, and `null` is a body that could not be read as its answer
 * at all. A screen keeping a count it has already read acts differently on
 * the two — a list without the session in it is the session having ended,
 * and a body it cannot read is a reading it did not get.
 */
export function readLiveSessions(body: unknown): LiveSessionReading[] | null {
  if (!isAnswer(body)) {
    return null
  }

  const items = body.data ?? []

  if (!items.every(isSession)) {
    return null
  }

  return items.map(toReading)
}

/** The backlog of the seat's own session, where it is among those running. */
export function backlogOf(
  sessions: readonly LiveSessionReading[],
  seat: LiveSeat,
): LiveBacklog | undefined {
  const own = sessions.find(
    (session) =>
      session.networkId === seat.networkId &&
      session.serviceId === seat.serviceId &&
      session.profile === seat.profile,
  )

  return own && { dropped: own.dropped, queued: own.queued }
}
