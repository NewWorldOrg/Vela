import { codecsOf, mimeOf } from '@/lib/live-wire'

export const LONGEST_HEADER = 1 << 20

export const READS_AHEAD_SECONDS = 60

export const ALWAYS_READS_WITHIN_SECONDS = 8

export const QUEUED_AT_MOST = 32

export type HeaderReading =
  | { state: 'short' }
  | { state: 'read'; length: number; mime: string }
  | { state: 'unfit' }

interface TopBox {
  type: string
  start: number
  end: number
}

function topBoxAt(bytes: Uint8Array, at: number): TopBox | null {
  if (at + 8 > bytes.length) {
    return null
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
  const size = view.getUint32(at)

  if (size !== 1) {
    return { type, start: at + 8, end: size === 0 ? Infinity : at + size }
  }

  if (at + 16 > bytes.length) {
    return null
  }

  return {
    type,
    start: at + 16,
    end: at + view.getUint32(at + 8) * 2 ** 32 + view.getUint32(at + 12),
  }
}

function holdsAFragmentedMovie(bytes: Uint8Array, moov: TopBox): boolean {
  for (let at = moov.start; at < moov.end;) {
    const inner = topBoxAt(bytes.subarray(0, moov.end), at)

    if (!inner || inner.end <= at || inner.end > moov.end) {
      return false
    }

    if (inner.type === 'mvex') {
      return true
    }

    at = inner.end
  }

  return false
}

function readTheMovie(bytes: Uint8Array, moov: TopBox): HeaderReading {
  const header = bytes.subarray(0, moov.end)
  const codecs = codecsOf(header)

  if (!codecs || !holdsAFragmentedMovie(bytes, moov)) {
    return { state: 'unfit' }
  }

  return { state: 'read', length: moov.end, mime: mimeOf(codecs) }
}

export function readHeader(bytes: Uint8Array): HeaderReading {
  for (let at = 0; ;) {
    const box = topBoxAt(bytes, at)

    if (!box) {
      return bytes.length >= LONGEST_HEADER
        ? { state: 'unfit' }
        : { state: 'short' }
    }

    if (box.type === 'moof' || box.type === 'mdat' || box.end < box.start) {
      return { state: 'unfit' }
    }

    if (box.end > bytes.length) {
      return box.end > LONGEST_HEADER ? { state: 'unfit' } : { state: 'short' }
    }

    if (box.type === 'moov') {
      return readTheMovie(bytes, box)
    }

    at = box.end
  }
}

export interface ReadingRoom {
  ahead: number
  queued: number
  managed: boolean
  streaming: boolean
}

export function readsOn(room: ReadingRoom): boolean {
  if (room.queued >= QUEUED_AT_MOST) {
    return false
  }

  if (room.ahead < ALWAYS_READS_WITHIN_SECONDS) {
    return true
  }

  return room.ahead < READS_AHEAD_SECONDS && (!room.managed || room.streaming)
}
