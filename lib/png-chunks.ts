import { crc32 } from '@/lib/bml/crc32'

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** The PNG colour type of a picture whose pixels are indices into its palette. */
export const INDEXED = 3

export interface PngChunk {
  type: string
  at: number
  length: number
}

/** The chunks of a PNG in order, or null when it is not one: it has to start with the signature, and the lengths the chunks declare have to run exactly to its end. */
export function chunksOf(png: Uint8Array): PngChunk[] | null {
  if (
    png.length < PNG_SIGNATURE.length ||
    PNG_SIGNATURE.some((byte, index) => png[index] !== byte)
  ) {
    return null
  }

  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const chunks: PngChunk[] = []
  let at = PNG_SIGNATURE.length

  while (at + 12 <= png.length) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))

    chunks.push({ type, at, length })
    at += 12 + length
  }

  return at === png.length ? chunks : null
}

/** The data a chunk carries, without its length, type and CRC. */
export function dataOf(png: Uint8Array, chunk: PngChunk): Uint8Array {
  return png.subarray(chunk.at + 8, chunk.at + 8 + chunk.length)
}

/** One chunk as it is written into a PNG: its length, type, data and the CRC over type and data. */
export function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(12 + data.length)
  const view = new DataView(bytes.buffer)

  view.setUint32(0, data.length)
  bytes.set(
    Array.from(type, (letter) => letter.charCodeAt(0)),
    4,
  )
  bytes.set(data, 8)
  view.setUint32(8 + data.length, crc32(bytes.subarray(4, 8 + data.length)))

  return bytes
}

/** A PNG put back together from its own bytes, with the chunks `replaced` names given new bytes; a chunk replaced by an empty array is left out. */
export function rewritten(
  png: Uint8Array,
  chunks: readonly PngChunk[],
  replaced: ReadonlyMap<PngChunk, Uint8Array>,
): Uint8Array {
  const parts: Uint8Array[] = [png.subarray(0, PNG_SIGNATURE.length)]

  for (const each of chunks) {
    parts.push(
      replaced.get(each) ?? png.subarray(each.at, each.at + 12 + each.length),
    )
  }

  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let at = 0

  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }

  return out
}
