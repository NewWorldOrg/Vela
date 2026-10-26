import { PNG_SIGNATURE, pngChunk } from '@/lib/png-chunks'
import type { CaptionPicture } from '@/lib/live-wire'

/** Captions drawn here for the stories, never cut from a broadcast: blocks stand for letters, each with a ring of lighter entries for its soft edge, on a 1440x1080 canvas. */

type Rgba = [number, number, number, number]

const STORED_BLOCK = 65535

function adler32(bytes: Uint8Array): number {
  let a = 1
  let b = 0

  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }

  return ((b << 16) | a) >>> 0
}

/** The bytes as a zlib stream of stored blocks: what a PNG's picture data needs, without compressing anything. */
function zlibStored(bytes: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(bytes.length / STORED_BLOCK))
  const out = new Uint8Array(2 + blocks * 5 + bytes.length + 4)
  const view = new DataView(out.buffer)
  let at = 2

  out.set([0x78, 0x01])

  for (let block = 0; block < blocks; block += 1) {
    const from = block * STORED_BLOCK
    const length = Math.min(STORED_BLOCK, bytes.length - from)

    out[at] = block === blocks - 1 ? 1 : 0
    view.setUint16(at + 1, length, true)
    view.setUint16(at + 3, ~length & 0xffff, true)
    out.set(bytes.subarray(from, from + length), at + 5)
    at += 5 + length
  }

  view.setUint32(at, adler32(bytes))

  return out
}

class Drawing {
  readonly width: number
  readonly height: number
  readonly entries: Rgba[] = [[0, 0, 0, 0]]
  readonly pixels: Uint8Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.pixels = new Uint8Array(width * height)
  }

  fill(left: number, top: number, width: number, height: number, rgba: Rgba) {
    let index = this.entries.findIndex((one) =>
      one.every((value, at) => value === rgba[at]),
    )

    if (index === -1) {
      this.entries.push(rgba)
      index = this.entries.length - 1
    }

    for (
      let y = Math.max(0, top);
      y < Math.min(this.height, top + height);
      y += 1
    ) {
      this.pixels.fill(
        index,
        y * this.width + Math.max(0, left),
        y * this.width + Math.min(this.width, left + width),
      )
    }
  }

  /** A made-up letter: two strokes, a tall one and a wide one, each with its soft ring. */
  letter(left: number, top: number, size: number, ink: Rgba, soft: Rgba) {
    const stroke = Math.round(size / 6)
    const middle = top + Math.round((size - stroke) / 2)

    this.fill(left - 1, top - 1, stroke + 2, size + 2, soft)
    this.fill(left - 1, middle - 1, size + 2, stroke + 2, soft)
    this.fill(left, top, stroke, size, ink)
    this.fill(left, middle, size, stroke, ink)
  }

  png(): Uint8Array {
    const header = new Uint8Array(13)
    const view = new DataView(header.buffer)

    view.setUint32(0, this.width)
    view.setUint32(4, this.height)
    header[8] = 8
    header[9] = 3

    const rows = new Uint8Array((this.width + 1) * this.height)

    for (let y = 0; y < this.height; y += 1) {
      rows.set(
        this.pixels.subarray(y * this.width, (y + 1) * this.width),
        y * (this.width + 1) + 1,
      )
    }

    const parts = [
      Uint8Array.from(PNG_SIGNATURE),
      pngChunk('IHDR', header),
      pngChunk(
        'PLTE',
        Uint8Array.from(this.entries.flatMap((one) => one.slice(0, 3))),
      ),
      pngChunk('tRNS', Uint8Array.from(this.entries.map((one) => one[3]))),
      pngChunk('IDAT', zlibStored(rows)),
      pngChunk('IEND', new Uint8Array(0)),
    ]
    const out = new Uint8Array(
      parts.reduce((sum, part) => sum + part.length, 0),
    )
    let at = 0

    for (const part of parts) {
      out.set(part, at)
      at += part.length
    }

    return out
  }
}

const HALF_BLACK: Rgba = [0, 0, 0, 128]

const WHITE: Rgba = [255, 255, 255, 255]

const YELLOW: Rgba = [250, 250, 0, 255]

function placed(left: number, top: number, drawing: Drawing): CaptionPicture {
  return {
    left,
    top,
    width: drawing.width,
    height: drawing.height,
    png: drawing.png(),
  }
}

/** Yellow letters on the half see-through band, one line low in the picture. */
export function yellowOnAHalfBand(): CaptionPicture {
  const drawing = new Drawing(640, 88)

  drawing.fill(0, 0, 640, 88, HALF_BLACK)

  for (let x = 28; x < 600; x += 64) {
    drawing.letter(x, 18, 52, YELLOW, [157, 157, 0, 255])
  }

  return placed(400, 920, drawing)
}

/** White letters with no band, and a second speaker in cyan far off to the right on the second line. */
export function whiteWithNoBand(): CaptionPicture {
  const drawing = new Drawing(960, 150)

  for (let x = 8; x < 520; x += 64) {
    drawing.letter(x, 8, 52, WHITE, [255, 255, 255, 128])
  }

  for (let x = 8; x < 200; x += 64) {
    drawing.letter(x, 88, 52, WHITE, [255, 255, 255, 128])
  }

  for (let x = 776; x < 950; x += 64) {
    drawing.letter(x, 88, 52, [0, 255, 255, 255], [0, 255, 255, 128])
  }

  return placed(240, 880, drawing)
}

/** White letters on a solid black band, high in the picture. */
export function whiteOnASolidBand(): CaptionPicture {
  const drawing = new Drawing(700, 96)

  drawing.fill(0, 0, 700, 96, [0, 0, 0, 255])

  for (let x = 30; x < 660; x += 66) {
    drawing.letter(x, 20, 54, WHITE, [110, 110, 110, 255])
  }

  return placed(370, 60, drawing)
}
