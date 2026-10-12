import type { BmlCatalog, CatalogCarousel } from '@/lib/bml/catalog'
import type { BroadcastEvent } from '@/lib/bml/event-message'
import { MOST_PRIVATE_DATA_BYTES } from '@/lib/bml/event-message'
import { PTS_HERTZ } from '@/lib/live-wire'
import { READS_AHEAD_WITHIN_SEC } from '@/lib/recording-captions'

export { READS_AHEAD_WITHIN_SEC }

/** A playhead that moves further than this between two readings has been seeked, not played. */
export const MOST_STEP_SEC = 2.5

/** One version of a module as the recording's catalog places it: the seconds of the source it was first and last seen at, and the bytes its module answers with. */
export interface BroadcastVersion {
  id: number
  version: number
  fromSec: number
  toSec: number
  size: number
}

export interface BroadcastCarousel {
  tag: number
  downloadId: number
  versions: BroadcastVersion[]
}

/** An event message at the second of the source it fires at. */
export interface TimedEvent {
  group: number
  id: number
  type: number
  immediate: boolean
  atSec: number
  privateData: Uint8Array
}

/** The catalog of a recording's data broadcast over the whole of the source played. */
export interface DataBroadcastTimeline {
  entryTag: number
  autoStart: boolean
  startup: string
  incomplete: boolean
  carousels: BroadcastCarousel[]
  events: TimedEvent[]
}

/** One version with the carousel it belongs to, as the module route is asked for it. */
export interface PlacedVersion extends BroadcastVersion {
  tag: number
  downloadId: number
}

export function moduleKey(tag: number, id: number): string {
  return `${tag}/${id}`
}

export function versionKey(placed: PlacedVersion): string {
  return `${placed.tag}/${placed.downloadId}/${placed.id}/${placed.version}`
}

function isCount(value: unknown, most: number): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= most
  )
}

function isSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function versionOf(value: unknown): BroadcastVersion | null {
  const version = value as Partial<BroadcastVersion> | null

  if (
    typeof version !== 'object' ||
    version === null ||
    !isCount(version.id, 0xffff) ||
    !isCount(version.version, 0xff) ||
    !isSeconds(version.fromSec) ||
    !isSeconds(version.toSec) ||
    version.toSec < version.fromSec ||
    !isCount(version.size, Number.MAX_SAFE_INTEGER)
  ) {
    return null
  }

  return {
    id: version.id,
    version: version.version,
    fromSec: version.fromSec,
    toSec: version.toSec,
    size: version.size,
  }
}

function carouselOf(value: unknown): BroadcastCarousel | null {
  const carousel = value as Partial<BroadcastCarousel> | null

  if (
    typeof carousel !== 'object' ||
    carousel === null ||
    !isCount(carousel.tag, 0xff) ||
    !isCount(carousel.downloadId, 0xffffffff) ||
    !Array.isArray(carousel.versions)
  ) {
    return null
  }

  const versions = carousel.versions.map(versionOf)

  return versions.every((version) => version !== null)
    ? { tag: carousel.tag, downloadId: carousel.downloadId, versions }
    : null
}

function bytesOf(base64: unknown): Uint8Array | null {
  if (typeof base64 !== 'string') {
    return null
  }

  try {
    return Uint8Array.from(atob(base64), (letter) => letter.charCodeAt(0))
  } catch {
    return null
  }
}

function eventOf(value: unknown): TimedEvent | null {
  const event = value as Record<string, unknown> | null

  if (
    typeof event !== 'object' ||
    event === null ||
    !isCount(event.group, 0xffff) ||
    !isCount(event.id, 0xffff) ||
    !isCount(event.type, 0xff) ||
    typeof event.immediate !== 'boolean' ||
    !isSeconds(event.atSec)
  ) {
    return null
  }

  const privateData = bytesOf(event.privateData)

  return privateData && privateData.length <= MOST_PRIVATE_DATA_BYTES
    ? {
        group: event.group,
        id: event.id,
        type: event.type,
        immediate: event.immediate,
        atSec: event.atSec,
        privateData,
      }
    : null
}

/** The timeline a value carries, as the recording's catalog route answers it, or null when its shape is not one. */
export function timelineOf(value: unknown): DataBroadcastTimeline | null {
  const timeline = value as Record<string, unknown> | null

  if (
    typeof timeline !== 'object' ||
    timeline === null ||
    !isCount(timeline.entryTag, 0xff) ||
    typeof timeline.autoStart !== 'boolean' ||
    typeof timeline.startup !== 'string' ||
    typeof timeline.incomplete !== 'boolean' ||
    !Array.isArray(timeline.carousels) ||
    !Array.isArray(timeline.events)
  ) {
    return null
  }

  const carousels = timeline.carousels.map(carouselOf)
  const events = timeline.events.map(eventOf)

  if (
    !carousels.every((carousel) => carousel !== null) ||
    !events.every((event) => event !== null)
  ) {
    return null
  }

  return {
    entryTag: timeline.entryTag,
    autoStart: timeline.autoStart,
    startup: timeline.startup,
    incomplete: timeline.incomplete,
    carousels,
    events: [...events].sort((one, other) => one.atSec - other.atSec),
  }
}

/** Every version of the timeline with its carousel, in the order of their first seconds. */
export function placedVersions(
  timeline: DataBroadcastTimeline,
): PlacedVersion[] {
  return timeline.carousels
    .flatMap((carousel) =>
      carousel.versions.map((version) => ({
        ...version,
        tag: carousel.tag,
        downloadId: carousel.downloadId,
      })),
    )
    .sort((one, other) => one.fromSec - other.fromSec)
}

/** Whether one version is the later of two of the same module: first seen later, or of a later download or version when first seen at the same second. */
function later(one: PlacedVersion, other: PlacedVersion): boolean {
  return (
    one.fromSec > other.fromSec ||
    (one.fromSec === other.fromSec &&
      (one.downloadId > other.downloadId ||
        (one.downloadId === other.downloadId && one.version > other.version)))
  )
}

/** The version of each module in effect at a second of the source: of those first seen by then, the latest. It stands until its last second, or on until a later version of the same module takes over, so that a module does not drop out between one version being last seen and the next being first seen. */
export function versionsAt(
  timeline: DataBroadcastTimeline,
  second: number,
): PlacedVersion[] {
  const standing = new Map<string, PlacedVersion>()
  const comingLater = new Set<string>()

  placedVersions(timeline).forEach((placed) => {
    const key = moduleKey(placed.tag, placed.id)

    if (placed.fromSec > second) {
      comingLater.add(key)

      return
    }

    const held = standing.get(key)

    if (!held || later(placed, held)) {
      standing.set(key, placed)
    }
  })

  return [...standing.entries()]
    .filter(([key, placed]) => second <= placed.toSec || comingLater.has(key))
    .map(([, placed]) => placed)
}

/** The versions first seen within a stretch after a second, in the order they are first seen, so that they can be read before they are needed. */
export function versionsAhead(
  timeline: DataBroadcastTimeline,
  second: number,
  withinSec: number = READS_AHEAD_WITHIN_SEC,
): PlacedVersion[] {
  return placedVersions(timeline).filter(
    (placed) => placed.fromSec > second && placed.fromSec <= second + withinSec,
  )
}

/** Whether a version is still of use around a second: in effect or coming within the stretch read ahead. */
export function stillOfUse(placed: PlacedVersion, second: number): boolean {
  return (
    placed.toSec >= second && placed.fromSec <= second + READS_AHEAD_WITHIN_SEC
  )
}

/** The catalog a runtime is handed for a second of the source: each carousel of the recording with the versions in effect then, and no resources listed, as what a module holds is known once it is read. */
export function catalogAt(
  timeline: DataBroadcastTimeline,
  second: number,
  service: number,
): BmlCatalog {
  const inEffect = versionsAt(timeline, second)
  const tags = [...new Set(timeline.carousels.map((carousel) => carousel.tag))]
  const carousels: CatalogCarousel[] = tags
    .sort((one, other) => one - other)
    .map((tag) => {
      const chosen = inEffect
        .filter((placed) => placed.tag === tag)
        .sort((one, other) => one.id - other.id)
      const downloads = chosen.map((placed) => placed.downloadId)
      const listed = timeline.carousels.find((carousel) => carousel.tag === tag)

      return {
        tag,
        downloadId:
          downloads.length > 0
            ? Math.max(...downloads)
            : (listed?.downloadId ?? 0),
        modules: chosen.map((placed) => ({
          id: placed.id,
          version: placed.version,
          size: placed.size,
          resources: [],
        })),
      }
    })

  return {
    service,
    entryTag: timeline.entryTag,
    autoStart: timeline.autoStart,
    startup: timeline.startup,
    carousels,
  }
}

/** The event messages that fire after one second and by another, in the order they fire. */
export function eventsBetween(
  timeline: DataBroadcastTimeline,
  afterSec: number,
  uptoSec: number,
): TimedEvent[] {
  return timeline.events.filter(
    (event) => event.atSec > afterSec && event.atSec <= uptoSec,
  )
}

/** The event as the runtime takes it: fired at its second on the 90 kHz clock. */
export function broadcastEventOf(event: TimedEvent): BroadcastEvent {
  return {
    group: event.group,
    id: event.id,
    type: event.type,
    immediate: event.immediate,
    at: Math.round(event.atSec * PTS_HERTZ),
    privateData: event.privateData,
  }
}

/** Whether the playhead was moved rather than played from one reading to the next: a first reading, a move back, or a move forward further than playing carries it. */
export function isASeek(from: number | null, to: number): boolean {
  return from === null || to < from || to - from > MOST_STEP_SEC
}
