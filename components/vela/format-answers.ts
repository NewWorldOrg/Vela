import {
  askFormats,
  asksTheBrowser,
  type FormatAnswers,
  type FormatProbe,
  type PictureSize,
  type PlaybackFormat,
} from '@/lib/playback-format'
import { MediaFeed, type SourceOrder } from '@/components/recordings/media-feed'

export interface OfferedPicture extends PictureSize {
  formats?: readonly PlaybackFormat[]
}

const answered = new WeakMap<FormatProbe, Map<string, FormatAnswers>>()

const asking = new WeakMap<FormatProbe, Set<string>>()

const listeners = new Set<() => void>()

const browsers = new Map<SourceOrder, FormatProbe>()

let version = 0

const SIZE = /^(\d+)x(\d+)@([\d.]+)$/

/** A picture's size and rate in one word, which is what its answer is kept under. */
export function sizeOf(picture: PictureSize): string {
  return `${picture.width}x${picture.height}@${picture.framerate}`
}

export function pictureOfSize(size: string): PictureSize | undefined {
  const read = SIZE.exec(size)

  return read
    ? {
        width: Number(read[1]),
        height: Number(read[2]),
        framerate: Number(read[3]),
      }
    : undefined
}

function heldFor<T>(
  table: WeakMap<FormatProbe, T>,
  probe: FormatProbe,
  make: () => T,
): T {
  const held = table.get(probe) ?? make()

  table.set(probe, held)

  return held
}

/** The pictures the browser has to be asked about: those Carina transcodes in more than H.264. */
export function picturesToAsk(
  pictures: readonly OfferedPicture[],
): OfferedPicture[] {
  return pictures.filter((one) => asksTheBrowser(one.formats))
}

/** This browser, asked through the media source a feed in this order is fed through; none on the server. */
export function browserProbe(order: SourceOrder): FormatProbe | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const known = browsers.get(order)

  if (known) {
    return known
  }

  const capabilities = navigator.mediaCapabilities
  const probe: FormatProbe = {
    decodingInfo: capabilities
      ? (configuration) => capabilities.decodingInfo(configuration)
      : undefined,
    isTypeSupported: (type) => MediaFeed.takes(order, type),
  }

  browsers.set(order, probe)

  return probe
}

export function answersFor(
  probe: FormatProbe,
  picture: PictureSize,
): FormatAnswers | undefined {
  return answered.get(probe)?.get(sizeOf(picture))
}

/** Asks about each picture not yet answered or being asked about, once for each probe, and tells the followers as each answer comes. */
export function askAbout(
  probe: FormatProbe,
  pictures: readonly PictureSize[],
): void {
  const known = heldFor(answered, probe, () => new Map())
  const pending = heldFor(asking, probe, () => new Set())

  for (const picture of pictures) {
    const size = sizeOf(picture)

    if (known.has(size) || pending.has(size)) {
      continue
    }

    pending.add(size)
    void askFormats(probe, picture).then((answers) => {
      pending.delete(size)
      known.set(size, answers)
      version += 1

      for (const listener of listeners) {
        listener()
      }
    })
  }
}

export function followAnswers(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function answersVersion(): number {
  return version
}
