import type { BmlCatalog } from '@/lib/bml/catalog'
import { addressOf } from '@/lib/bml/paths'
import { readModule, type BmlModule } from '@/lib/bml/resources'
import {
  MOST_HELD_BYTES,
  MOST_MODULE_BYTES,
  type DataBroadcastAvailability,
  type DataBroadcastChange,
  type DataBroadcastHeld,
  type NptReading,
  type Warn,
} from '@/lib/data-broadcast-feed'
import {
  broadcastEventOf,
  catalogAt,
  eventsBetween,
  isASeek,
  moduleKey,
  stillOfUse,
  versionKey,
  versionsAhead,
  versionsAt,
  type DataBroadcastTimeline,
  type PlacedVersion,
} from '@/lib/recording-data-broadcast'
import type { DataBroadcastRead } from '@/repository/video-data-broadcast'

export type ReadTimeline = (signal: AbortSignal) => Promise<DataBroadcastRead>

export type ReadVersion = (
  placed: PlacedVersion,
  signal: AbortSignal,
) => Promise<Uint8Array | null>

export const RESTS_AFTER_A_REFUSAL_MS = 10_000

export const RESTS_WHILE_COMING_MS = 30_000

/** How many module versions are read at once; the rest wait their turn, the ones in effect first. */
export const MOST_READS_AT_ONCE = 4

type Read =
  | { state: 'asking'; abort: AbortController }
  | { state: 'read'; module: BmlModule; bytes: number }
  | { state: 'missing' }

const warnOnTheConsole: Warn = (warning) =>
  console.warn(`data broadcast: ${warning}`)

/** A recording's data broadcast as the player holds it: the catalog of the whole recording is read once, and at each second of playback the version of each module in effect then is chosen, read from the module route and handed on, with the versions of the next two minutes read before they are needed. An event message is handed on once, when playback passes its second; a seek back lets the ones after it be heard again, and a seek forward passes over the ones between. */
export class RecordingDataBroadcast implements DataBroadcastHeld {
  private readonly readTimeline: ReadTimeline

  private readonly readVersion: ReadVersion

  private readonly service: number

  private readonly warn: Warn

  private readonly listeners = new Set<(change: DataBroadcastChange) => void>()

  private readonly reads = new Map<string, Read>()

  private readonly waiting: PlacedVersion[] = []

  private readonly chosen = new Map<string, PlacedVersion>()

  private readonly held = new Map<string, BmlModule>()

  private timeline: DataBroadcastTimeline | null = null

  private asking: AbortController | null = null

  private resting: ReturnType<typeof setTimeout> | null = null

  private seen: number | null = null

  private at: number | null = null

  private heardUpTo = 0

  private heldBytes = 0

  private carried: BmlCatalog | null = null

  private carriedAs: string | null = null

  private said: DataBroadcastAvailability = 'absent'

  private closed = false

  constructor(
    readTimeline: ReadTimeline,
    readVersion: ReadVersion,
    service: number,
    warn: Warn = warnOnTheConsole,
  ) {
    this.readTimeline = readTimeline
    this.readVersion = readVersion
    this.service = service
    this.warn = warn
  }

  /** Asks for the catalog, and again after a rest while it is still being made or could not be read. */
  start(): void {
    if (this.closed || this.timeline || this.asking) {
      return
    }

    const asked = new AbortController()

    this.asking = asked

    void this.readTimeline(asked.signal)
      .catch((error: unknown): DataBroadcastRead => {
        if (!asked.signal.aborted) {
          console.warn('[data broadcast] the catalog was not read', error)
        }

        return { state: 'failed' }
      })
      .then((answer) => this.heardTheCatalog(asked, answer))
  }

  close(): void {
    this.closed = true
    this.asking?.abort()
    this.asking = null

    if (this.resting) {
      clearTimeout(this.resting)
      this.resting = null
    }

    this.reads.forEach((read) => {
      if (read.state === 'asking') {
        read.abort.abort()
      }
    })
    this.reads.clear()
    this.waiting.length = 0
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

  get forTheCatalog(): BmlModule[] {
    return [...this.held.values()]
  }

  /** A recording keeps no NPT reference: its event messages already carry the moments they fire at. */
  get nptReadings(): NptReading[] {
    return []
  }

  get incomplete(): boolean {
    return this.timeline?.incomplete ?? false
  }

  get heldModules(): BmlModule[] {
    return this.forTheCatalog
  }

  /** The versions being read now, for whoever watches the reading ahead. */
  get asked(): PlacedVersion[] {
    return [...this.reads.entries()]
      .filter(([, read]) => read.state === 'asking')
      .flatMap(([key]) => this.placedBy(key) ?? [])
  }

  /** Moves to a second of the source: the versions in effect there are chosen and handed on where they differ from before, the event messages played past are fired, and the versions coming within two minutes are read. */
  advance(second: number): void {
    const timeline = this.timeline

    this.seen = second

    if (!timeline || this.closed) {
      return
    }

    const seeked = isASeek(this.at, second)

    this.at = second
    this.choose(timeline, second)

    if (seeked) {
      this.heardUpTo = second
    } else {
      eventsBetween(timeline, this.heardUpTo, second).forEach((event) =>
        this.tell({ kind: 'event', event: broadcastEventOf(event) }),
      )
      this.heardUpTo = second
    }

    versionsAhead(timeline, second).forEach((placed) => this.ask(placed, false))
    this.forget(second)
  }

  private choose(timeline: DataBroadcastTimeline, second: number): void {
    const now = versionsAt(timeline, second)
    const keys = new Set(now.map((placed) => moduleKey(placed.tag, placed.id)))

    this.chosen.forEach((placed, key) => {
      if (!keys.has(key)) {
        this.chosen.delete(key)
        this.held.delete(key)
      }
    })
    this.catalogue(catalogAt(timeline, second, this.service))
    now.forEach((placed) => {
      const key = moduleKey(placed.tag, placed.id)
      const was = this.chosen.get(key)

      if (was && versionKey(was) === versionKey(placed)) {
        return
      }

      this.chosen.set(key, placed)

      const read = this.reads.get(versionKey(placed))

      if (read?.state === 'read') {
        this.hand(key, read.module)
      } else {
        this.ask(placed, true)
      }
    })
  }

  private catalogue(catalog: BmlCatalog): void {
    const said = JSON.stringify(catalog)

    if (said === this.carriedAs) {
      return
    }

    this.carriedAs = said
    this.carried = catalog
    this.tell({ kind: 'catalog', catalog })
  }

  private hand(key: string, module: BmlModule): void {
    if (this.held.get(key) === module) {
      return
    }

    this.held.set(key, module)
    this.tell({ kind: 'module', module })
  }

  private ask(placed: PlacedVersion, inEffect: boolean): void {
    const key = versionKey(placed)

    if (this.reads.has(key) || this.closed) {
      return
    }

    if (this.reading() >= MOST_READS_AT_ONCE) {
      if (inEffect) {
        this.waiting.unshift(placed)
      } else {
        this.waiting.push(placed)
      }

      return
    }

    const abort = new AbortController()

    this.reads.set(key, { state: 'asking', abort })

    void this.readVersion(placed, abort.signal)
      .then((bytes) => this.heardTheVersion(placed, bytes))
      .catch((error: unknown) => {
        if (!abort.signal.aborted) {
          console.warn('[data broadcast] a module was not read', error)
          this.reads.delete(key)
        }
      })
      .finally(() => this.next())
  }

  private reading(): number {
    return [...this.reads.values()].filter((read) => read.state === 'asking')
      .length
  }

  private next(): void {
    while (this.reading() < MOST_READS_AT_ONCE && this.waiting.length > 0) {
      const placed = this.waiting.shift() as PlacedVersion
      const key = moduleKey(placed.tag, placed.id)
      const chosen = this.chosen.get(key)

      if (
        !this.reads.has(versionKey(placed)) &&
        this.at !== null &&
        (stillOfUse(placed, this.at) ||
          (chosen !== undefined && versionKey(chosen) === versionKey(placed)))
      ) {
        this.ask(placed, false)
      }
    }
  }

  private heardTheVersion(
    placed: PlacedVersion,
    bytes: Uint8Array | null,
  ): void {
    const key = versionKey(placed)

    if (this.reads.get(key)?.state !== 'asking' || this.closed) {
      return
    }

    const carried =
      bytes && bytes.length <= MOST_MODULE_BYTES ? readModule(bytes) : null

    if (!bytes || !carried) {
      this.warn(`the module ${key} could not be read and is left out`)
      this.reads.set(key, { state: 'missing' })

      return
    }

    this.reads.set(key, { state: 'read', module: carried, bytes: bytes.length })
    this.heldBytes += bytes.length

    const chosen = this.chosen.get(moduleKey(placed.tag, placed.id))

    if (chosen && versionKey(chosen) === key) {
      this.hand(moduleKey(placed.tag, placed.id), carried)
    }
  }

  /** Lets go of the versions read that are no longer in effect and are not coming within the stretch read ahead, and of the oldest beyond what may be held. */
  private forget(second: number): void {
    const inEffect = new Set(
      [...this.chosen.values()].map((placed) => versionKey(placed)),
    )

    this.reads.forEach((read, key) => {
      const placed = this.placedBy(key)

      if (
        inEffect.has(key) ||
        read.state !== 'read' ||
        (placed && stillOfUse(placed, second))
      ) {
        return
      }

      this.reads.delete(key)
      this.heldBytes -= read.bytes
    })

    if (this.heldBytes > MOST_HELD_BYTES) {
      this.warn(`${this.heldBytes} bytes of modules are held, beyond the limit`)
    }
  }

  private placedBy(key: string): PlacedVersion | null {
    const [tag, downloadId, id, version] = key.split('/').map(Number)
    const carousel = this.timeline?.carousels.find(
      (one) => one.tag === tag && one.downloadId === downloadId,
    )
    const found = carousel?.versions.find(
      (one) => one.id === id && one.version === version,
    )

    return carousel && found ? { ...found, tag, downloadId } : null
  }

  private heardTheCatalog(
    asked: AbortController,
    answer: DataBroadcastRead,
  ): void {
    if (this.asking !== asked || this.closed) {
      return
    }

    this.asking = null

    switch (answer.state) {
      case 'read':
        this.timeline = answer.timeline
        this.at = null

        if (this.seen !== null) {
          this.advance(this.seen)
        }

        return
      case 'none':
        this.said = 'none'
        this.tell({ kind: 'none' })
        return
      case 'coming':
        this.rest(RESTS_WHILE_COMING_MS)
        return
      case 'failed':
        this.rest(RESTS_AFTER_A_REFUSAL_MS)
        return
    }
  }

  private rest(ms: number): void {
    this.resting = setTimeout(() => {
      this.resting = null
      this.start()
    }, ms)
  }

  private settle(): void {
    const startup = this.carried ? addressOf(this.carried.startup) : null

    if (this.said === 'none') {
      return
    }

    this.said =
      startup && this.held.has(moduleKey(startup.tag, startup.module))
        ? 'ready'
        : 'absent'
  }

  private tell(change: DataBroadcastChange): void {
    this.settle()
    this.listeners.forEach((listener) => listener(change))
  }
}
