import { pictureFromOf, type LiveRun } from '@/lib/live-latency'
import { boxesIn, type Box } from '@/lib/live-wire'

export interface PictureTrack {
  id: number
  timescale: number
}

const PICTURE_HANDLER = 'vide'

const LONG_TIMES = 1

const SAMPLE_OFFSET_SIGNED = 1

const DATA_OFFSET = 0x000001

const FIRST_SAMPLE_FLAGS = 0x000004

const SAMPLE_DURATION = 0x000100

const SAMPLE_SIZE = 0x000200

const SAMPLE_FLAGS = 0x000400

const SAMPLE_OFFSET = 0x000800

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function childrenOf(bytes: Uint8Array, parent: Box, type: string): Box[] {
  return [...boxesIn(bytes, parent.start, parent.end)].filter(
    (box) => box.type === type,
  )
}

function childOf(
  bytes: Uint8Array,
  parent: Box | undefined,
  type: string,
): Box | undefined {
  return parent && childrenOf(bytes, parent, type)[0]
}

function topOf(bytes: Uint8Array, type: string): Box[] {
  return childrenOf(bytes, { type: '', start: 0, end: bytes.length }, type)
}

function wordAt(
  bytes: Uint8Array,
  box: Box,
  offset: number,
): number | undefined {
  const at = box.start + offset

  return at + 4 <= box.end ? viewOf(bytes).getUint32(at) : undefined
}

function afterTheTimes(
  bytes: Uint8Array,
  box: Box | undefined,
): number | undefined {
  if (!box || box.start >= box.end) {
    return undefined
  }

  return wordAt(bytes, box, bytes[box.start] === LONG_TIMES ? 20 : 12)
}

function handlerOf(bytes: Uint8Array, box: Box | undefined): string {
  return box && box.start + 12 <= box.end
    ? String.fromCharCode(...bytes.subarray(box.start + 8, box.start + 12))
    : ''
}

function trackOf(bytes: Uint8Array, trak: Box): PictureTrack | null {
  const mdia = childOf(bytes, trak, 'mdia')
  const id = afterTheTimes(bytes, childOf(bytes, trak, 'tkhd'))
  const timescale = afterTheTimes(bytes, childOf(bytes, mdia, 'mdhd'))

  if (
    handlerOf(bytes, childOf(bytes, mdia, 'hdlr')) !== PICTURE_HANDLER ||
    id === undefined ||
    !timescale
  ) {
    return null
  }

  return { id, timescale }
}

export function pictureTrackOf(init: Uint8Array): PictureTrack | null {
  for (const moov of topOf(init, 'moov')) {
    for (const trak of childrenOf(init, moov, 'trak')) {
      const track = trackOf(init, trak)

      if (track) {
        return track
      }
    }
  }

  return null
}

function decodedFrom(
  bytes: Uint8Array,
  box: Box | undefined,
): number | undefined {
  if (!box || box.start >= box.end) {
    return undefined
  }

  const high = wordAt(bytes, box, 4)

  if (bytes[box.start] !== LONG_TIMES) {
    return high
  }

  const low = wordAt(bytes, box, 8)

  return high === undefined || low === undefined
    ? undefined
    : high * 2 ** 32 + low
}

function firstOffsetIn(bytes: Uint8Array, trun: Box): number | undefined {
  const head = wordAt(bytes, trun, 0)
  const samples = wordAt(bytes, trun, 4)

  if (head === undefined || !samples) {
    return undefined
  }

  if ((head & SAMPLE_OFFSET) === 0) {
    return 0
  }

  const skipped = [
    DATA_OFFSET,
    FIRST_SAMPLE_FLAGS,
    SAMPLE_DURATION,
    SAMPLE_SIZE,
    SAMPLE_FLAGS,
  ].filter((flag) => head & flag).length
  const offset = wordAt(bytes, trun, 8 + skipped * 4)

  return offset !== undefined && head >>> 24 === SAMPLE_OFFSET_SIGNED
    ? offset | 0
    : offset
}

function pictureIn(
  bytes: Uint8Array,
  traf: Box,
  track: PictureTrack,
): number | undefined {
  const tfhd = childOf(bytes, traf, 'tfhd')

  if (!tfhd || wordAt(bytes, tfhd, 4) !== track.id) {
    return undefined
  }

  const decoded = decodedFrom(bytes, childOf(bytes, traf, 'tfdt'))
  const offset = childrenOf(bytes, traf, 'trun')
    .map((trun) => firstOffsetIn(bytes, trun))
    .find((found) => found !== undefined)

  return decoded === undefined || offset === undefined
    ? undefined
    : (decoded + offset) / track.timescale
}

export function firstPictureAt(
  fragment: Uint8Array,
  track: PictureTrack,
): number | undefined {
  for (const moof of topOf(fragment, 'moof')) {
    for (const traf of childrenOf(fragment, moof, 'traf')) {
      const at = pictureIn(fragment, traf, track)

      if (at !== undefined) {
        return at
      }
    }
  }

  return undefined
}

export class LivePictures {
  private track: PictureTrack | null = null

  private readonly starts: number[] = []

  get kept(): number {
    return this.starts.length
  }

  header(init: Uint8Array): void {
    try {
      this.track ??= pictureTrackOf(init)
    } catch {}
  }

  fragment(bytes: Uint8Array, oldestHeld: number | undefined): void {
    const at = this.readIn(bytes)

    if (at === undefined || !Number.isFinite(at)) {
      return
    }

    this.starts.push(at)

    while (
      oldestHeld !== undefined &&
      this.starts.length > 1 &&
      this.starts[1] <= oldestHeld
    ) {
      this.starts.shift()
    }
  }

  fromOf(runs: readonly LiveRun[]): number | undefined {
    return pictureFromOf(runs, this.starts)
  }

  private readIn(bytes: Uint8Array): number | undefined {
    try {
      return this.track ? firstPictureAt(bytes, this.track) : undefined
    } catch {
      return undefined
    }
  }
}
