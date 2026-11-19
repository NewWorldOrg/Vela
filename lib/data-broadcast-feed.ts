import {
  readCatalog,
  staysListed,
  takesThePlace,
  type BmlCatalog,
} from '@/lib/bml/catalog'
import type { BroadcastEvent } from '@/lib/bml/event-message'
import {
  NPT_MODULUS,
  nptReadingAt,
  type NptReading,
  type NptReference,
} from '@/lib/bml/npt'
import { addressOf } from '@/lib/bml/paths'
import { readModule, type BmlModule } from '@/lib/bml/resources'
import { ptsSeconds } from '@/lib/live-wire'

export type { BroadcastEvent } from '@/lib/bml/event-message'
export type { NptReading, NptReference } from '@/lib/bml/npt'

export const DATA_BROADCAST_BYTE = {
  catalog: 0x01,
  module: 0x02,
  event: 0x03,
  none: 0x04,
  npt: 0x05,
} as const

export const MOST_MODULE_BYTES = 16 * 1024 * 1024

export const MOST_HELD_BYTES = 64 * 1024 * 1024

export const MOST_HELD_EVENTS = 256

export const MOST_WAITING_FRAMES = 4096

const EVENT_HEAD = 17

const NPT_LENGTH = 22

export type DataBroadcastSaid =
  | { said: 'catalog'; catalog: BmlCatalog }
  | { said: 'module'; module: BmlModule; bytes: number }
  | { said: 'event'; event: BroadcastEvent }
  | { said: 'none' }
  | { said: 'npt'; reference: NptReference }
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
  const end = EVENT_HEAD + view.getUint16(15)
  const tagged = payload.length === end + 1

  if (
    (timeKind !== TIME_KIND.immediate && timeKind !== TIME_KIND.npt) ||
    (payload.length !== end && !tagged)
  ) {
    return null
  }

  return {
    group: view.getUint16(1),
    id: view.getUint16(3),
    type: payload[5],
    immediate: timeKind === TIME_KIND.immediate,
    at: view.getUint32(7) * 2 ** 32 + view.getUint32(11),
    privateData: payload.slice(EVENT_HEAD, end),
    ...(tagged ? { componentTag: payload[end] } : {}),
  }
}

function readNpt(payload: Uint8Array): NptReference | null {
  if (payload.length !== NPT_LENGTH) {
    return null
  }

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  )
  const reference = {
    tag: payload[1],
    stc: view.getUint32(2) * 2 ** 32 + view.getUint32(6),
    npt: view.getUint32(10) * 2 ** 32 + view.getUint32(14),
    numerator: view.getUint16(18),
    denominator: view.getUint16(20),
  }

  return Number.isSafeInteger(reference.stc) &&
    reference.npt < NPT_MODULUS &&
    reference.numerator > 0 &&
    reference.denominator > 0
    ? reference
    : null
}

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
    case DATA_BROADCAST_BYTE.npt: {
      const reference = readNpt(payload)

      return reference ? { said: 'npt', reference } : { said: 'unknown' }
    }
    default:
      return { said: 'unknown' }
  }
}

export type DataBroadcastAvailability = 'none' | 'absent' | 'ready'

export type DataBroadcastChange =
  | { kind: 'catalog'; catalog: BmlCatalog }
  | { kind: 'module'; module: BmlModule }
  | { kind: 'event'; event: BroadcastEvent }
  | { kind: 'npt'; reading: NptReading }
  | { kind: 'clock'; seconds: number }
  | { kind: 'none' }
  | { kind: 'reset' }

export interface DataBroadcastHeld {
  readonly availability: DataBroadcastAvailability
  readonly catalog: BmlCatalog | null
  readonly forTheCatalog: BmlModule[]
  readonly nptReadings: NptReading[]
  readonly clock: number | null
  subscribe(listener: (change: DataBroadcastChange) => void): () => void
}

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
  return `${event.componentTag ?? ''}/${event.group}/${event.id}/${event.type}/${event.at}`
}

export type Warn = (warning: string) => void

const warnOnTheConsole: Warn = (warning) =>
  console.warn(`data broadcast: ${warning}`)

function dueAt(said: DataBroadcastSaid, pts: number): number {
  if (said.said === 'event' && !said.event.immediate) {
    return Math.max(pts, said.event.at)
  }

  return said.said === 'npt' ? Math.max(pts, said.reference.stc) : pts
}

function sameReference(
  held: NptReference | undefined,
  reference: NptReference,
): boolean {
  return (
    held !== undefined &&
    held.stc === reference.stc &&
    held.npt === reference.npt &&
    held.numerator === reference.numerator &&
    held.denominator === reference.denominator
  )
}

export class DataBroadcastFeed implements DataBroadcastHeld {
  private readonly waiting: Waiting[] = []

  private readonly modules = new Map<string, Held>()

  private readonly heard: BroadcastEvent[] = []

  private readonly seen = new Set<string>()

  private readonly references = new Map<number, NptReference>()

  private playhead = 0

  private readonly listeners = new Set<(change: DataBroadcastChange) => void>()

  private held = 0

  private waitingBytes = 0

  private carried: BmlCatalog | null = null

  private carriedAs: string | null = null

  private said: DataBroadcastAvailability = 'absent'

  private readonly warn: Warn

  constructor(warn: Warn = warnOnTheConsole) {
    this.warn = warn
  }

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

    const due = dueAt(said, pts)
    let at = this.waiting.length

    while (at > 0 && this.waiting[at - 1].pts > due) {
      at -= 1
    }

    this.waiting.splice(at, 0, { pts: due, bytes: payload.length, said })
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

  advance(seconds: number): void {
    this.playhead = seconds

    while (
      this.waiting.length > 0 &&
      ptsSeconds(this.waiting[0].pts) <= seconds
    ) {
      const due = this.waiting.shift() as Waiting

      this.waitingBytes -= due.bytes
      this.apply(due.said)
    }
  }

  reset(): void {
    this.waiting.length = 0
    this.waitingBytes = 0
    this.modules.clear()
    this.heard.length = 0
    this.seen.clear()
    this.references.clear()
    this.held = 0
    this.carried = null
    this.carriedAs = null
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

  get forTheCatalog(): BmlModule[] {
    const catalog = this.carried

    return this.heldModules.filter(
      (module) => !catalog || staysListed(catalog, module.tag, module.id),
    )
  }

  get nptReadings(): NptReading[] {
    return [...this.references.values()]
      .sort((one, other) => one.tag - other.tag)
      .map((reference) => nptReadingAt(reference, this.playhead))
  }

  get clock(): number | null {
    return null
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
      case 'npt':
        this.refer(said.reference)
        return
      case 'none':
        this.modules.clear()
        this.references.clear()
        this.held = 0
        this.carried = null
        this.carriedAs = null
        this.said = 'none'
        this.tell({ kind: 'none' })
        return
    }
  }

  private catalogue(catalog: BmlCatalog): void {
    const said = JSON.stringify(catalog)

    if (said === this.carriedAs) {
      return
    }

    this.carriedAs = said
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
    const standing = this.modules.get(key)?.module

    if (
      standing?.version === module.version ||
      !takesThePlace(this.carried, standing, module)
    ) {
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

    this.tell({ kind: 'event', event })
  }

  private refer(reference: NptReference): void {
    if (sameReference(this.references.get(reference.tag), reference)) {
      return
    }

    this.references.set(reference.tag, reference)
    this.tell({
      kind: 'npt',
      reading: nptReadingAt(reference, this.playhead),
    })
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
