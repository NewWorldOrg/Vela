import type { Rect } from '@/lib/caption-placement'
import { catalogOf, type BmlCatalog } from '@/lib/bml/catalog'
import { isBmlKey, type BmlKey } from '@/lib/bml/keys'
import { moduleOf, type BmlModule } from '@/lib/bml/resources'
import { FONT_FAMILIES, GRID } from '@/lib/bml/style'

export type FontFamily = (typeof FONT_FAMILIES)[number]

export interface FontBytes {
  family: FontFamily
  bytes: ArrayBuffer
}

export interface Programme {
  service: number
  event: number | null
  startsAt: number | null
}

export type PlayerMessage =
  | { kind: 'catalog'; catalog: BmlCatalog }
  | { kind: 'module'; module: BmlModule }
  | { kind: 'font'; fonts: FontBytes[] }
  | { kind: 'key'; key: BmlKey }
  | { kind: 'clock'; seconds: number }
  | { kind: 'programme'; programme: Programme }
  | { kind: 'open' }
  | { kind: 'close' }

export const RUNTIME_ERRORS = ['malformed', 'missing', 'undecoded'] as const

export type RuntimeError = (typeof RUNTIME_ERRORS)[number]

export type RuntimeMessage =
  | { kind: 'videoRect'; rect: Rect | null }
  | { kind: 'usedKeys'; keys: BmlKey[] }
  | { kind: 'waiting'; waiting: boolean }
  | { kind: 'unsupported'; what: string }
  | { kind: 'exit' }
  | { kind: 'error'; reason: RuntimeError }

/** How a sandboxed document without `allow-same-origin` names its origin. */
export const RUNTIME_ORIGIN = 'null'

export interface Delivered {
  origin: string
  source: unknown
  data: unknown
}

const MOST_FONT_BYTES = 4 * 1024 * 1024

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

function runtimeMessageOf(data: unknown): RuntimeMessage | null {
  const message = recordOf(data)

  switch (message?.kind) {
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
    either(programme.startsAt)
    ? {
        service: programme.service as number,
        event: programme.event as number | null,
        startsAt: programme.startsAt as number | null,
      }
    : null
}

function playerMessageOf(data: unknown): PlayerMessage | null {
  const message = recordOf(data)

  switch (message?.kind) {
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
    case 'open':
      return { kind: 'open' }
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
