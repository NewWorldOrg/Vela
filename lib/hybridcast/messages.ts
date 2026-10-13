import type { Rect } from '@/lib/caption-placement'
import {
  CONTROL_CODE,
  appStartOf,
  isAitUri,
  type AppStart,
} from '@/lib/bml/ait'
import { broadcastEventOf, type BroadcastEvent } from '@/lib/bml/event-message'
import { isBmlKey, type BmlKey } from '@/lib/bml/keys'
import { receiverIdOf, type ReceiverId } from '@/lib/bml/line'
import type { MemoryEntries } from '@/lib/bml/memory'
import {
  isMemoryName,
  isMemoryValue,
  memoryEntriesOfValue,
  sharedRegistersOf,
  type Delivered,
} from '@/lib/bml/messages'
import { nptReadingOf, type NptReading } from '@/lib/bml/npt'
import { MOST_URL } from '@/lib/bml/paths'
import { boundaryOf, type BoundaryPair } from '@/lib/hybridcast/boundary'
import {
  eventInformationOfValue,
  type EventInformation,
} from '@/lib/hybridcast/event-information'
import { keySetOf } from '@/lib/hybridcast/keys'

/** The fixed coordinates an application is laid out in. */
export const APP_SIZE = { width: 1920, height: 1080 } as const

/** How a sandboxed document without `allow-same-origin` names its origin. */
export const APP_ORIGIN = 'null'

/** The application the frame runs: the AIT it was started from, its identifiers, its control code, its entry and its boundary, none meaning no boundary at all. */
export interface OwnedApplication {
  ait: string
  orgId: number
  appId: number
  controlCode: number
  entryUrl: string
  boundary: BoundaryPair[]
}

/** What the application's documents read at once as they open, which the frame carries from one document to the next in its name: the application, the shared registers, the broadcaster's memory, the programme on air, and the name the application itself gave its window. The receiver's identifier is never in it, as a document outside the relay would read it too. */
export interface AppState {
  application: OwnedApplication
  greg: string[]
  memory: MemoryEntries
  programme: EventInformation | null
  name: string
}

/** What the application's frame says of itself to the player, over the port its document handed over. */
export type AppMessage =
  | { kind: 'videoRect'; rect: Rect | null; over: boolean }
  | { kind: 'keySet'; mask: number }
  | { kind: 'greg'; greg: string[] }
  | { kind: 'memory'; name: string; value: string | null }
  | { kind: 'destroy' }
  | { kind: 'launchBml'; componentTag: number | null }
  | { kind: 'replace'; start: AppStart }

/** What the player tells the application's document, over the port it handed over. */
export type ReceiverMessage =
  | { kind: 'welcome'; receiverId: ReceiverId | null; npt: NptReading[] }
  | { kind: 'key'; key: BmlKey }
  | { kind: 'event'; event: BroadcastEvent }
  | { kind: 'programme'; programme: EventInformation | null }
  | { kind: 'npt'; reading: NptReading }

/** A document of the application saying it opened on the relay: the broadcaster's URL it stands for, and the port the player talks to it on. */
export interface AppHello {
  document: string
  port: MessagePort
}

export const STATE_PREFIX = 'vela-hybridcast:'

const MOST_NAME = 64 * 1024

const MOST_STREAMS = 256

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** A rectangle of the application's 1920x1080 coordinates with a size, or null when it is not one. */
export function appRectOf(value: unknown): Rect | null {
  const rect = recordOf(value)

  if (
    !rect ||
    !isNumber(rect.left) ||
    !isNumber(rect.top) ||
    !isNumber(rect.width) ||
    !isNumber(rect.height)
  ) {
    return null
  }

  const { left, top, width, height } = rect as unknown as Rect

  return left >= 0 &&
    top >= 0 &&
    width > 0 &&
    height > 0 &&
    left + width <= APP_SIZE.width &&
    top + height <= APP_SIZE.height
    ? { left, top, width, height }
    : null
}

const CONTROL_CODES: ReadonlySet<number> = new Set(Object.values(CONTROL_CODE))

function applicationOf(value: unknown): OwnedApplication | null {
  const application = recordOf(value)
  const start = appStartOf(application)
  const boundary = boundaryOf(application?.boundary)

  return application &&
    start &&
    boundary &&
    CONTROL_CODES.has(application.controlCode as number) &&
    isAitUri(application.entryUrl)
    ? {
        ...start,
        controlCode: application.controlCode as number,
        entryUrl: application.entryUrl,
        boundary,
      }
    : null
}

/** The frame's name for a state: the prefix and the state written out. */
export function frameNameOf(state: AppState): string {
  return `${STATE_PREFIX}${JSON.stringify(state)}`
}

/** The state a frame's name carries, or null when the name is not one the player gave. */
export function appStateOf(name: string): AppState | null {
  if (!name.startsWith(STATE_PREFIX)) {
    return null
  }

  let written: Record<string, unknown> | null

  try {
    written = recordOf(JSON.parse(name.slice(STATE_PREFIX.length)))
  } catch {
    return null
  }

  const application = applicationOf(written?.application)
  const greg = sharedRegistersOf(written?.greg)
  const memory = memoryEntriesOfValue(written?.memory)
  const programme =
    written?.programme === null
      ? null
      : eventInformationOfValue(written?.programme)
  const own = written?.name

  return application &&
    greg &&
    memory &&
    (programme !== null || written?.programme === null) &&
    typeof own === 'string' &&
    own.length <= MOST_NAME
    ? { application, greg, memory, programme, name: own }
    : null
}

function isComponentTagOrNone(value: unknown): value is number | null {
  return (
    value === null ||
    (Number.isInteger(value) &&
      (value as number) >= 0 &&
      (value as number) <= 0xff)
  )
}

/** What the application's document said, when it has a shape the player takes. Anything else is null. */
export function appMessageOf(data: unknown): AppMessage | null {
  const message = recordOf(data)

  switch (message?.kind) {
    case 'videoRect':
      return typeof message.over === 'boolean' &&
        (message.rect === null || appRectOf(message.rect))
        ? {
            kind: 'videoRect',
            rect: appRectOf(message.rect),
            over: message.over,
          }
        : null
    case 'keySet': {
      const mask = keySetOf(message.mask)

      return mask === null ? null : { kind: 'keySet', mask }
    }
    case 'greg': {
      const greg = sharedRegistersOf(message.greg)

      return greg ? { kind: 'greg', greg } : null
    }
    case 'memory':
      return isMemoryName(message.name) &&
        (message.value === null || isMemoryValue(message.value))
        ? { kind: 'memory', name: message.name, value: message.value }
        : null
    case 'destroy':
      return { kind: 'destroy' }
    case 'launchBml':
      return isComponentTagOrNone(message.componentTag)
        ? { kind: 'launchBml', componentTag: message.componentTag }
        : null
    case 'replace': {
      const start = appStartOf(message.start)

      return start ? { kind: 'replace', start } : null
    }
    default:
      return null
  }
}

/** A document of the application saying it opened: from the player's own frame, in an opaque origin, on the relay the player opened it through, with one port. Anything else is null. */
export function appHelloFrom(
  delivered: Delivered & { ports: readonly MessagePort[] },
  frame: unknown,
  relay: string,
): AppHello | null {
  const hello = recordOf(delivered.data)

  if (
    !frame ||
    delivered.source !== frame ||
    delivered.origin !== APP_ORIGIN ||
    delivered.ports.length !== 1 ||
    hello?.kind !== 'hello' ||
    hello.relay !== relay ||
    !isAitUri(hello.document) ||
    (hello.document as string).length > MOST_URL
  ) {
    return null
  }

  return { document: hello.document as string, port: delivered.ports[0] }
}

function readingsOf(value: unknown): NptReading[] | null {
  if (!Array.isArray(value) || value.length > MOST_STREAMS) {
    return null
  }

  const readings = value.map(nptReadingOf)

  return readings.every((reading) => reading !== null)
    ? (readings as NptReading[])
    : null
}

/** What the player told the application's document, when it has a shape the document takes. Anything else is null. */
export function receiverMessageOf(data: unknown): ReceiverMessage | null {
  const message = recordOf(data)

  switch (message?.kind) {
    case 'welcome': {
      const receiverId =
        message.receiverId === null ? null : receiverIdOf(message.receiverId)
      const npt = readingsOf(message.npt)

      return npt && (receiverId !== null || message.receiverId === null)
        ? { kind: 'welcome', receiverId, npt }
        : null
    }
    case 'key':
      return isBmlKey(message.key) ? { kind: 'key', key: message.key } : null
    case 'event': {
      const event = broadcastEventOf(message.event)

      return event ? { kind: 'event', event } : null
    }
    case 'programme': {
      const programme =
        message.programme === null
          ? null
          : eventInformationOfValue(message.programme)

      return programme !== null || message.programme === null
        ? { kind: 'programme', programme }
        : null
    }
    case 'npt': {
      const reading = nptReadingOf(message.reading)

      return reading ? { kind: 'npt', reading } : null
    }
    default:
      return null
  }
}
