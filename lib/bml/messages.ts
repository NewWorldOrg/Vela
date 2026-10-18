import type { Rect } from '@/lib/caption-placement'
import {
  aitApplicationsOf,
  appStartOf,
  isAitUri,
  type AitApplication,
  type AppStart,
} from '@/lib/bml/ait'
import { catalogOf, type BmlCatalog } from '@/lib/bml/catalog'
import { broadcastEventOf, type BroadcastEvent } from '@/lib/bml/event-message'
import { isBmlKey, type BmlKey } from '@/lib/bml/keys'
import {
  LINE_STATES,
  MOST_CHARSET,
  MOST_TRANSMIT_BODY,
  MOST_TRANSMIT_TEXT,
  receiverIdOf,
  type LineState,
  type ReceiverId,
  type TransmitAnswer,
} from '@/lib/bml/line'
import {
  MOST_MEMORY_BYTES,
  MOST_MEMORY_ENTRIES,
  MOST_MEMORY_NAME,
  type MemoryEntries,
} from '@/lib/bml/memory'
import { nptReadingOf, type NptReading } from '@/lib/bml/npt'
import { MOST_URL, addressOf, lineAddressOf } from '@/lib/bml/paths'
import { moduleOf, type BmlModule } from '@/lib/bml/resources'
import { isRomSound } from '@/lib/bml/rom-sound'
import { FONT_FAMILIES, GRID } from '@/lib/bml/style'

export type FontFamily = (typeof FONT_FAMILIES)[number]

export interface FontBytes {
  family: FontFamily
  bytes: ArrayBuffer
}

/** The programme on air as a document asks after it: its ids, which a recording may lack, and when it began. */
export interface Programme {
  service: number
  event: number | null
  network: number | null
  stream: number | null
  startsAt: number | null
}

/** What the player knows of the programme the broadcast belongs to: its network and when it began, in seconds. */
export interface OnAir {
  network: number | null
  startsAt: number | null
}

/** The programme the runtime is handed for a service, its start in whole seconds as a receiver has it from the broadcast: a recording begins part way into a second, and the runtime drops a programme whose start has a fraction, ids and all. A start that is not a time is left out. */
export function programmeOnAir(service: number, onAir: OnAir): Programme {
  const { startsAt } = onAir

  return {
    service,
    event: null,
    network: onAir.network,
    stream: null,
    startsAt:
      startsAt !== null && Number.isFinite(startsAt)
        ? Math.floor(startsAt)
        : null,
  }
}

export type PlayerMessage =
  | { kind: 'catalog'; catalog: BmlCatalog }
  | { kind: 'module'; module: BmlModule }
  | { kind: 'font'; fonts: FontBytes[] }
  | { kind: 'key'; key: BmlKey }
  | { kind: 'clock'; seconds: number }
  | { kind: 'programme'; programme: Programme }
  | { kind: 'memory'; entries: MemoryEntries }
  | { kind: 'event'; event: BroadcastEvent }
  | { kind: 'npt'; reading: NptReading }
  | { kind: 'line'; line: LineState; receiverId: ReceiverId | null }
  | { kind: 'transmitted'; id: number; answer: TransmitAnswer }
  | { kind: 'fetched'; id: number; module: BmlModule | null }
  | { kind: 'aitRead'; id: number; applications: AitApplication[] | null }
  | { kind: 'hybridcast'; allowed: boolean; failed: AppStart[] }
  | { kind: 'greg'; greg: string[] }
  | { kind: 'open'; startup?: string }
  | { kind: 'close' }

export const RUNTIME_ERRORS = ['malformed', 'missing', 'undecoded'] as const

export type RuntimeError = (typeof RUNTIME_ERRORS)[number]

/** Where a script run stands: `running` when one starts, `done` when it ends in time, `overran` when it ended past the time a run may take. */
export const SCRIPT_STATES = ['running', 'done', 'overran'] as const

export type ScriptState = (typeof SCRIPT_STATES)[number]

export type RuntimeMessage =
  | { kind: 'videoRect'; rect: Rect | null }
  | { kind: 'usedKeys'; keys: BmlKey[] }
  | { kind: 'waiting'; waiting: boolean }
  | { kind: 'unsupported'; what: string }
  | { kind: 'memory'; name: string; value: string | null }
  | { kind: 'script'; state: ScriptState }
  | { kind: 'exit' }
  | { kind: 'error'; reason: RuntimeError }
  | { kind: 'transmit'; id: number; uri: string; text: string; charset: string }
  | { kind: 'fetch'; id: number; uri: string }
  | { kind: 'line'; said: LineSaid }
  | { kind: 'ait'; id: number; uri: string }
  | { kind: 'startApp'; start: AppStart; greg: string[] }
  | { kind: 'unopened' }
  | { kind: 'romsound'; sound: number }

/** What the viewer is told of the line: the setting refuses it, or the broadcaster's server could not be reached. */
export const LINE_SAYINGS = ['off', 'unreached'] as const

export type LineSaid = (typeof LINE_SAYINGS)[number]

/** How a sandboxed document without `allow-same-origin` names its origin. */
export const RUNTIME_ORIGIN = 'null'

export interface Delivered {
  origin: string
  source: unknown
  data: unknown
}

const MOST_FONT_BYTES = 4 * 1024 * 1024

/** The registers shared by the documents and the applications they start: 64 strings. */
export const SHARED_REGISTERS = 64

/** The longest string a shared register is handed over with. */
export const MOST_REGISTER = 1024

/** The most starts the player tells the runtime have failed while the broadcast is open. */
export const MOST_FAILED_STARTS = 16

const MOST_WHAT = 64

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** A rectangle on the 960x540 grid with a size, or null when it is not one. */
export function gridRectOf(value: unknown): Rect | null {
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
  const inside =
    left >= 0 &&
    top >= 0 &&
    width > 0 &&
    height > 0 &&
    left + width <= GRID.width &&
    top + height <= GRID.height

  return inside ? { left, top, width, height } : null
}

export function isMemoryName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MOST_MEMORY_NAME
  )
}

export function isMemoryValue(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MOST_MEMORY_BYTES
}

/** A broadcaster's memory as it is handed over, or null when the value has another shape. */
export function memoryEntriesOfValue(value: unknown): MemoryEntries | null {
  if (!Array.isArray(value) || value.length > MOST_MEMORY_ENTRIES) {
    return null
  }

  const fits = value.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      isMemoryName(entry[0]) &&
      isMemoryValue(entry[1]),
  )

  return fits ? value.map((entry) => [entry[0], entry[1]]) : null
}

function isRequestId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0
}

/** A URL a runtime may ask over the line, written as the runtime writes it: `http:` or `https:`, without a fragment. */
function isLineUri(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MOST_URL &&
    lineAddressOf(value)?.url === value
  )
}

function transmitOf(message: Record<string, unknown>): RuntimeMessage | null {
  const { id, uri, text, charset } = message

  return isRequestId(id) &&
    isLineUri(uri) &&
    typeof text === 'string' &&
    text.length <= MOST_TRANSMIT_TEXT &&
    typeof charset === 'string' &&
    charset.length <= MOST_CHARSET
    ? { kind: 'transmit', id, uri, text, charset }
    : null
}

/** The 64 shared registers, each a string no longer than the most one is handed over with, or null. */
export function sharedRegistersOf(value: unknown): string[] | null {
  return Array.isArray(value) &&
    value.length === SHARED_REGISTERS &&
    value.every(
      (register) =>
        typeof register === 'string' && register.length <= MOST_REGISTER,
    )
    ? [...(value as string[])]
    : null
}

function startAppOf(message: Record<string, unknown>): RuntimeMessage | null {
  const start = appStartOf(message.start)
  const greg = sharedRegistersOf(message.greg)

  return start && greg ? { kind: 'startApp', start, greg } : null
}

function runtimeMessageOf(data: unknown): RuntimeMessage | null {
  const message = recordOf(data)

  switch (message?.kind) {
    case 'ait':
      return isRequestId(message.id) && isAitUri(message.uri)
        ? { kind: 'ait', id: message.id, uri: message.uri }
        : null
    case 'startApp':
      return startAppOf(message)
    case 'unopened':
      return { kind: 'unopened' }
    case 'romsound':
      return isRomSound(message.sound)
        ? { kind: 'romsound', sound: message.sound }
        : null
    case 'transmit':
      return transmitOf(message)
    case 'fetch':
      return isRequestId(message.id) && isLineUri(message.uri)
        ? { kind: 'fetch', id: message.id, uri: message.uri }
        : null
    case 'line':
      return LINE_SAYINGS.includes(message.said as LineSaid)
        ? { kind: 'line', said: message.said as LineSaid }
        : null
    case 'memory':
      return isMemoryName(message.name) &&
        (message.value === null || isMemoryValue(message.value))
        ? { kind: 'memory', name: message.name, value: message.value }
        : null
    case 'script':
      return SCRIPT_STATES.includes(message.state as ScriptState)
        ? { kind: 'script', state: message.state as ScriptState }
        : null
    case 'videoRect': {
      const rect = message.rect === null ? null : gridRectOf(message.rect)

      return message.rect === null || rect ? { kind: 'videoRect', rect } : null
    }
    case 'usedKeys':
      return Array.isArray(message.keys) && message.keys.every(isBmlKey)
        ? { kind: 'usedKeys', keys: [...new Set(message.keys)] }
        : null
    case 'waiting':
      return typeof message.waiting === 'boolean'
        ? { kind: 'waiting', waiting: message.waiting }
        : null
    case 'unsupported':
      return typeof message.what === 'string' &&
        message.what.length <= MOST_WHAT
        ? { kind: 'unsupported', what: message.what }
        : null
    case 'exit':
      return { kind: 'exit' }
    case 'error':
      return RUNTIME_ERRORS.includes(message.reason as RuntimeError)
        ? { kind: 'error', reason: message.reason as RuntimeError }
        : null
    default:
      return null
  }
}

/** What the runtime said, when it came from the player's own frame in its opaque origin and has a shape the player takes. Anything else is null. */
export function runtimeMessageFrom(
  delivered: Delivered,
  frame: unknown,
): RuntimeMessage | null {
  if (
    frame === null ||
    frame === undefined ||
    delivered.source !== frame ||
    delivered.origin !== RUNTIME_ORIGIN
  ) {
    return null
  }

  return runtimeMessageOf(delivered.data)
}

function fontsOf(value: unknown): FontBytes[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const fonts = value.map((item) => {
    const font = recordOf(item)

    return font &&
      FONT_FAMILIES.includes(font.family as FontFamily) &&
      font.bytes instanceof ArrayBuffer &&
      font.bytes.byteLength <= MOST_FONT_BYTES
      ? { family: font.family as FontFamily, bytes: font.bytes }
      : null
  })

  return fonts.every((font) => font !== null) ? (fonts as FontBytes[]) : null
}

function programmeOf(value: unknown): Programme | null {
  const programme = recordOf(value)
  const either = (item: unknown) => item === null || Number.isSafeInteger(item)

  return programme &&
    Number.isSafeInteger(programme.service) &&
    either(programme.event) &&
    either(programme.network) &&
    either(programme.stream) &&
    either(programme.startsAt)
    ? {
        service: programme.service as number,
        event: programme.event as number | null,
        network: programme.network as number | null,
        stream: programme.stream as number | null,
        startsAt: programme.startsAt as number | null,
      }
    : null
}

/** A number of an answer, which may be NaN where there is none, but nothing else that is not finite. */
function isAnswerNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isFinite(value)
    ? Number.isNaN(value)
    : Number.isSafeInteger(value)
}

function answerOf(value: unknown): TransmitAnswer | null {
  const answer = recordOf(value)

  return answer &&
    isAnswerNumber(answer.result) &&
    isAnswerNumber(answer.status) &&
    typeof answer.body === 'string' &&
    answer.body.length <= MOST_TRANSMIT_BODY
    ? { result: answer.result, status: answer.status, body: answer.body }
    : null
}

function lineOf(message: Record<string, unknown>): PlayerMessage | null {
  const receiverId =
    message.receiverId === null ? null : receiverIdOf(message.receiverId)

  return LINE_STATES.includes(message.line as LineState) &&
    (message.receiverId === null || receiverId !== null)
    ? { kind: 'line', line: message.line as LineState, receiverId }
    : null
}

function fetchedOf(message: Record<string, unknown>): PlayerMessage | null {
  const carried = message.module === null ? null : moduleOf(message.module)

  return isRequestId(message.id) && (message.module === null || carried)
    ? { kind: 'fetched', id: message.id, module: carried }
    : null
}

/** Opening, at the start document of a component when one is named. */
function openOf(message: Record<string, unknown>): PlayerMessage | null {
  if (message.startup === undefined) {
    return { kind: 'open' }
  }

  return typeof message.startup === 'string' && addressOf(message.startup)
    ? { kind: 'open', startup: message.startup }
    : null
}

function aitReadOf(message: Record<string, unknown>): PlayerMessage | null {
  const applications =
    message.applications === null ? null : aitApplicationsOf(message)

  return isRequestId(message.id) &&
    (message.applications === null || applications !== null)
    ? { kind: 'aitRead', id: message.id, applications }
    : null
}

function hybridcastOf(message: Record<string, unknown>): PlayerMessage | null {
  const failed = Array.isArray(message.failed)
    ? message.failed.map(appStartOf)
    : null

  return typeof message.allowed === 'boolean' &&
    failed !== null &&
    failed.length <= MOST_FAILED_STARTS &&
    failed.every((start) => start !== null)
    ? { kind: 'hybridcast', allowed: message.allowed, failed }
    : null
}

function playerMessageOf(data: unknown): PlayerMessage | null {
  const message = recordOf(data)

  switch (message?.kind) {
    case 'aitRead':
      return aitReadOf(message)
    case 'hybridcast':
      return hybridcastOf(message)
    case 'greg': {
      const greg = sharedRegistersOf(message.greg)

      return greg ? { kind: 'greg', greg } : null
    }
    case 'line':
      return lineOf(message)
    case 'transmitted': {
      const answer = answerOf(message.answer)

      return isRequestId(message.id) && answer
        ? { kind: 'transmitted', id: message.id, answer }
        : null
    }
    case 'fetched':
      return fetchedOf(message)
    case 'catalog': {
      const catalog = catalogOf(message.catalog)

      return catalog ? { kind: 'catalog', catalog } : null
    }
    case 'module': {
      const carried = moduleOf(message.module)

      return carried ? { kind: 'module', module: carried } : null
    }
    case 'font': {
      const fonts = fontsOf(message.fonts)

      return fonts ? { kind: 'font', fonts } : null
    }
    case 'key':
      return isBmlKey(message.key) ? { kind: 'key', key: message.key } : null
    case 'clock':
      return isNumber(message.seconds)
        ? { kind: 'clock', seconds: message.seconds }
        : null
    case 'programme': {
      const programme = programmeOf(message.programme)

      return programme ? { kind: 'programme', programme } : null
    }
    case 'memory': {
      const entries = memoryEntriesOfValue(message.entries)

      return entries ? { kind: 'memory', entries } : null
    }
    case 'event': {
      const event = broadcastEventOf(message.event)

      return event ? { kind: 'event', event } : null
    }
    case 'npt': {
      const reading = nptReadingOf(message.reading)

      return reading ? { kind: 'npt', reading } : null
    }
    case 'open':
      return openOf(message)
    case 'close':
      return { kind: 'close' }
    default:
      return null
  }
}

/** What the player said, when it came from the parent window in Vela's own origin and has a shape the runtime takes. Anything else is null. */
export function playerMessageFrom(
  delivered: Delivered,
  player: { origin: string; window: unknown },
): PlayerMessage | null {
  if (
    player.origin.length === 0 ||
    delivered.origin !== player.origin ||
    delivered.source !== player.window
  ) {
    return null
  }

  return playerMessageOf(delivered.data)
}
