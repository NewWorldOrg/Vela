import type { components } from '@/repository/client/schema'

type LiveSessionResponder = components['schemas']['LiveSessionResponder']
type LiveSessionsAnswer =
  components['schemas']['BaseResponderOfIReadOnlyListOfLiveSessionResponder']

export interface LiveSessionReading {
  networkId: number
  serviceId: number
  profile: string
  viewers: number
  dropped: number
  queued: number
}

export interface LiveBacklog {
  dropped: number
  queued: number
}

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
