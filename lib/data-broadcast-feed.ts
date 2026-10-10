import {
  readCatalog,
  staysListed,
  takesThePlace,
  type BmlCatalog,
} from '@/lib/bml/catalog'
import { addressOf } from '@/lib/bml/paths'
import { readModule, type BmlModule } from '@/lib/bml/resources'
import { ptsSeconds } from '@/lib/live-wire'

export const DATA_BROADCAST_BYTE = {
  catalog: 0x01,
  module: 0x02,
  event: 0x03,
  none: 0x04,
} as const

export const MOST_MODULE_BYTES = 16 * 1024 * 1024

export const MOST_HELD_BYTES = 64 * 1024 * 1024

export const MOST_HELD_EVENTS = 256

export const MOST_WAITING_FRAMES = 4096

const EVENT_HEAD = 19

/** An event message as the side channel carries it: when it fires is on the same 90 kHz clock as the frames. */
export interface BroadcastEvent {
  group: number
  id: number
  type: number
  immediate: boolean
  at: number
  privateData: Uint8Array
}

export type DataBroadcastSaid =
  | { said: 'catalog'; catalog: BmlCatalog }
  | { said: 'module'; module: BmlModule; bytes: number }
  | { said: 'event'; event: BroadcastEvent }
  | { said: 'none' }
  | { said: 'unknown' }

const TIME_KIND = { immediate: 1, npt: 2 } as const

function readEvent(payload: Uint8Array): BroadcastEvent | null {
  if (payload.length < EVENT_HEAD) {
    return null
  }

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  )
  const timeKind = payload[6]
  const length = view.getUint16(17)

  if (
    (timeKind !== TIME_KIND.immediate && timeKind !== TIME_KIND.npt) ||
    EVENT_HEAD + length !== payload.length
  ) {
    return null
  }

  return {
    group: view.getUint16(1),
    id: view.getUint16(3),
    type: payload[5],
    immediate: timeKind === TIME_KIND.immediate,
    at: view.getUint32(7) * 2 ** 32 + view.getUint32(11),
    privateData: payload.subarray(EVENT_HEAD),
  }
}

/** Reads one payload of the side channel's data broadcast frames by its kind byte. */
export function readDataBroadcast(payload: Uint8Array): DataBroadcastSaid {
  switch (payload[0]) {
    case DATA_BROADCAST_BYTE.catalog: {
      const catalog = readCatalog(payload)

      return catalog ? { said: 'catalog', catalog } : { said: 'unknown' }
    }
    case DATA_BROADCAST_BYTE.module: {
      const carried = readModule(payload)

      return carried
        ? { said: 'module', module: carried, bytes: payload.length }
        : { said: 'unknown' }
    }
    case DATA_BROADCAST_BYTE.event: {
      const event = readEvent(payload)

      return event ? { said: 'event', event } : { said: 'unknown' }
    }
    case DATA_BROADCAST_BYTE.none:
      return payload.length === 1 ? { said: 'none' } : { said: 'unknown' }
    default:
      return { said: 'unknown' }
  }
}

/** Whether a broadcast can be opened: `none` when the service carries none, `absent` until the catalog and its start document's module are both in, `ready` after. */
export type DataBroadcastAvailability = 'none' | 'absent' | 'ready'

export type DataBroadcastChange =
  | { kind: 'catalog'; catalog: BmlCatalog }
  | { kind: 'module'; module: BmlModule }
  | { kind: 'none' }
  | { kind: 'reset' }

interface Waiting {
  pts: number
  bytes: number
  said: Exclude<DataBroadcastSaid, { said: 'unknown' }>
}

interface Held {
  module: BmlModule
  bytes: number
}

function moduleKey(tag: number, id: number): string {
  return `${tag}/${id}`
}

function eventKey(event: BroadcastEvent): string {
  return `${event.group}/${event.id}/${event.type}/${event.at}`
}

export type Warn = (warning: string) => void

const warnOnTheConsole: Warn = (warning) =>
  console.warn(`data broadcast: ${warning}`)

/** The live data broadcast as the player holds it: frames wait until the playhead reaches their time, then change what is held and are passed on to whoever listens. A module whose version the catalog moved on is held until the new version comes. */
export class DataBroadcastFeed {
  private readonly waiting: Waiting[] = []

  private readonly modules = new Map<string, Held>()

  private readonly heard: BroadcastEvent[] = []

  private readonly seen = new Set<string>()

  private readonly listeners = new Set<(change: DataBroadcastChange) => void>()

  private held = 0

  private waitingBytes = 0

  private carried: BmlCatalog | null = null

  private said: DataBroadcastAvailability = 'absent'

  private readonly warn: Warn

  constructor(warn: Warn = warnOnTheConsole) {
    this.warn = warn
  }

  /** Takes one payload of the side channel at its time. A module larger than a module may be is dropped here, and what waits is held to the same 64 MiB and to a count, the oldest let go first but never the newest catalog. */
  offer(payload: Uint8Array, pts: number): void {
    if (
      payload[0] === DATA_BROADCAST_BYTE.module &&
      payload.length > MOST_MODULE_BYTES
    ) {
      this.warn(`a module of ${payload.length} bytes was dropped`)

      return
    }

    const said = readDataBroadcast(payload)

    if (said.said === 'unknown') {
      this.warn('a frame that could not be read was dropped')

      return
    }

    let at = this.waiting.length

    while (at > 0 && this.waiting[at - 1].pts > pts) {
      at -= 1
    }

    this.waiting.splice(at, 0, { pts, bytes: payload.length, said })
    this.waitingBytes += payload.length
    this.trim()
  }

  private trim(): void {
    let dropped = 0

    while (
      this.waitingBytes > MOST_HELD_BYTES ||
      this.waiting.length > MOST_WAITING_FRAMES
    ) {
      const newestCatalog = this.waiting.findLastIndex(
        (waiting) => waiting.said.said === 'catalog',
      )
      const oldest = newestCatalog === 0 ? 1 : 0

      if (oldest >= this.waiting.length) {
        break
      }

      const [gone] = this.waiting.splice(oldest, 1)

      this.waitingBytes -= gone.bytes
      dropped += 1
    }

    if (dropped > 0) {
      this.warn(`${dropped} waiting frame(s) were dropped, the oldest first`)
    }
  }

  /** Lets every frame whose time the playhead has reached take effect, in the order of their times. */
  advance(seconds: number): void {
    while (
      this.waiting.length > 0 &&
      ptsSeconds(this.waiting[0].pts) <= seconds
    ) {
      const due = this.waiting.shift() as Waiting

      this.waitingBytes -= due.bytes
      this.apply(due.said)
    }
  }

  /** Forgets everything, as when the wire is opened again. */
  reset(): void {
    this.waiting.length = 0
    this.waitingBytes = 0
    this.modules.clear()
    this.heard.length = 0
    this.seen.clear()
    this.held = 0
    this.carried = null
    this.said = 'absent'
    this.tell({ kind: 'reset' })
  }

  subscribe(listener: (change: DataBroadcastChange) => void): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  get availability(): DataBroadcastAvailability {
    return this.said
  }

  get catalog(): BmlCatalog | null {
    return this.carried
  }

  get heldModules(): BmlModule[] {
    return [...this.modules.values()].map((held) => held.module)
  }

  /** The modules to hand a runtime that opens now, after the catalog: each the catalog lists, at its version or the one before while that has not come. */
  get forTheCatalog(): BmlModule[] {
    const catalog = this.carried

    return this.heldModules.filter(
      (module) => !catalog || staysListed(catalog, module.tag, module.id),
    )
  }

  get heldBytes(): number {
    return this.held
  }

  get events(): readonly BroadcastEvent[] {
    return this.heard
  }

  get pending(): number {
    return this.waiting.length
  }

  get pendingBytes(): number {
    return this.waitingBytes
  }

  private apply(said: Waiting['said']): void {
    switch (said.said) {
      case 'catalog':
        this.catalogue(said.catalog)
        return
      case 'module':
        this.keep(said.module, said.bytes)
        return
      case 'event':
        this.hear(said.event)
        return
      case 'none':
        this.modules.clear()
        this.held = 0
        this.carried = null
        this.said = 'none'
        this.tell({ kind: 'none' })
        return
    }
  }

  private catalogue(catalog: BmlCatalog): void {
    this.modules.forEach((held, key) => {
      if (!staysListed(catalog, held.module.tag, held.module.id)) {
        this.modules.delete(key)
        this.held -= held.bytes
      }
    })
    this.carried = catalog
    this.tell({ kind: 'catalog', catalog })
  }

  private keep(module: BmlModule, bytes: number): void {
    const key = moduleKey(module.tag, module.id)

    if (!takesThePlace(this.carried, this.modules.get(key)?.module, module)) {
      return
    }

    const before = this.modules.get(key)?.bytes ?? 0

    if (this.held - before + bytes > MOST_HELD_BYTES) {
      this.warn(
        `a module of ${bytes} bytes was dropped, as ${this.held} are already held`,
      )

      return
    }

    this.modules.set(key, { module, bytes })
    this.held += bytes - before
    this.tell({ kind: 'module', module })
  }

  private hear(event: BroadcastEvent): void {
    const key = eventKey(event)

    if (this.seen.has(key)) {
      return
    }

    this.seen.add(key)
    this.heard.push(event)

    if (this.heard.length > MOST_HELD_EVENTS) {
      const gone = this.heard.shift() as BroadcastEvent

      this.seen.delete(eventKey(gone))
    }
  }

  private settle(): void {
    const catalog = this.carried
    const startup = catalog ? addressOf(catalog.startup) : null

    if (this.said === 'none' && !catalog) {
      return
    }

    this.said =
      startup && this.modules.has(moduleKey(startup.tag, startup.module))
        ? 'ready'
        : 'absent'
  }

  private tell(change: DataBroadcastChange): void {
    if (change.kind === 'catalog' || change.kind === 'module') {
      this.settle()
    }

    this.listeners.forEach((listener) => listener(change))
  }
}
