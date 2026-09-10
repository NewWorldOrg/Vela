import type { components } from '@/repository/client/schema'
import { MAIN_SOUND, type SoundTrack } from '@/repository/sounds'

type LiveSessionResponder = components['schemas']['LiveSessionResponder']
type LiveViewerResponder = components['schemas']['LiveViewerResponder']
type LiveSessionsAnswer =
  components['schemas']['BaseResponderOfIReadOnlyListOfLiveSessionResponder']

export interface LiveSessionReading {
  networkId: number
  serviceId: number
  profile: string
  sound: SoundTrack
  viewers: number
  dropped: number
  queued: number
  droppedByThoseStillWatching?: number
  lostOnTheWayIn?: number
}

export interface LiveBacklog {
  dropped: number
  queued: number
  droppedByThoseStillWatching?: number
  lostOnTheWayIn?: number
}

export interface LiveSeat {
  networkId: number
  serviceId: number
  profile: string
  sound: SoundTrack
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

function isViewer(item: unknown): item is LiveViewerResponder {
  return isRecord(item) && item.droppedSinceTheyJoined !== undefined
}

function droppedByThoseStillWatching(
  session: LiveSessionResponder,
): number | undefined {
  const watching: unknown = session.watching

  if (!Array.isArray(watching) || !watching.every(isViewer)) {
    return undefined
  }

  return watching.reduce(
    (total, viewer) => total + count(viewer.droppedSinceTheyJoined),
    0,
  )
}

function lostOnTheWayIn(session: LiveSessionResponder): number | undefined {
  const lost = session.chunksDroppedSinceTheSupplyOpened

  return lost === null || lost === undefined ? undefined : count(lost)
}

function toReading(session: LiveSessionResponder): LiveSessionReading {
  return {
    networkId: count(session.networkId),
    serviceId: count(session.serviceId),
    profile: session.profile,
    sound: session.sound ?? MAIN_SOUND,
    viewers: count(session.viewers),
    dropped: count(session.dropped),
    queued: count(session.queued),
    droppedByThoseStillWatching: droppedByThoseStillWatching(session),
    lostOnTheWayIn: lostOnTheWayIn(session),
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
      session.profile === seat.profile &&
      session.sound === seat.sound,
  )

  return (
    own && {
      dropped: own.dropped,
      queued: own.queued,
      droppedByThoseStillWatching: own.droppedByThoseStillWatching,
      lostOnTheWayIn: own.lostOnTheWayIn,
    }
  )
}
