import { crc32, deflateSync, inflateSync } from 'node:zlib'

/** Captions drawn here for the tests, never cut from a broadcast: blocks for letters, with a ring of lighter entries for their soft edge. */

export type Rgba = [number, number, number, number]

export interface Drawn {
  width: number
  height: number
  entries: Rgba[]
  pixels: Uint8Array
}

function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8)

  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'latin1')

  const tail = Buffer.alloc(4)

  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0)

  return Buffer.concat([head, data, tail])
}

/** An 8-bit indexed PNG of the drawing, compressed with zlib. `depth` and `withTransparency` make the shapes a caption is not. */
export function pngOf(
  drawn: Drawn,
  { depth = 8, withTransparency = true } = {},
): Uint8Array {
  const header = Buffer.alloc(13)

  header.writeUInt32BE(drawn.width, 0)
  header.writeUInt32BE(drawn.height, 4)
  header[8] = depth
  header[9] = 3

  const rows = Buffer.alloc((drawn.width + 1) * drawn.height)

  for (let y = 0; y < drawn.height; y += 1) {
    rows.set(
      drawn.pixels.subarray(y * drawn.width, (y + 1) * drawn.width),
      y * (drawn.width + 1) + 1,
    )
  }

  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk(
        'PLTE',
        Buffer.from(drawn.entries.flatMap((one) => one.slice(0, 3))),
      ),
      ...(withTransparency
        ? [chunk('tRNS', Buffer.from(drawn.entries.map((one) => one[3])))]
        : []),
      chunk('IDAT', deflateSync(rows)),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

/** The indices of an 8-bit indexed PNG written by `pngOf`, read back with zlib. */
export function indicesOf(png: Uint8Array, width: number): Uint8Array {
  const buffer = Buffer.from(png)
  let at = 8
  const data: Buffer[] = []

  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at)

    if (buffer.toString('latin1', at + 4, at + 8) === 'IDAT') {
      data.push(buffer.subarray(at + 8, at + 8 + length))
    }

    at += 12 + length
  }

  const rows = inflateSync(Buffer.concat(data))
  const height = rows.length / (width + 1)
  const pixels = new Uint8Array(width * height)

  for (let y = 0; y < height; y += 1) {
    pixels.set(
      rows.subarray(y * (width + 1) + 1, (y + 1) * (width + 1)),
      y * width,
    )
  }

  return pixels
}

/** A mask of the pixels whose entry `keeps` keeps. */
export function maskOf(
  drawn: Drawn,
  keeps: (entry: Rgba, index: number) => boolean,
): Uint8Array {
  return Uint8Array.from(drawn.pixels, (index) =>
    keeps(drawn.entries[index], index) ? 1 : 0,
  )
}

class Canvas {
  readonly width: number
  readonly height: number
  readonly entries: Rgba[] = [[0, 0, 0, 0]]
  readonly pixels: Uint8Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.pixels = new Uint8Array(width * height)
  }

  entry(rgba: Rgba): number {
    const found = this.entries.findIndex((one) =>
      one.every((v, i) => v === rgba[i]),
    )

    if (found !== -1) {
      return found
    }

    this.entries.push(rgba)

    return this.entries.length - 1
  }

  fill(left: number, top: number, width: number, height: number, rgba: Rgba) {
    const index = this.entry(rgba)

    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        this.pixels[y * this.width + x] = index
      }
    }
  }

  /** A letter: a block of its colour with a one-pixel ring of `soft`, laid where it stands. */
  letter(left: number, top: number, size: number, rgba: Rgba, soft: Rgba) {
    this.fill(left - 1, top - 1, size + 2, size + 2, soft)
    this.fill(left, top, size, size, rgba)
  }

  done(): Drawn {
    return {
      width: this.width,
      height: this.height,
      entries: this.entries,
      pixels: this.pixels,
    }
  }
}

export const HALF_BLACK: Rgba = [0, 0, 0, 128]

export const YELLOW: Rgba = [250, 250, 0, 255]

/** Yellow letters on the half see-through black band, their soft edge opaque where the letter covers most of the pixel and half see-through where the band shows. */
export function yellowOnAHalfBand(): Drawn {
  const canvas = new Canvas(120, 30)

  canvas.fill(0, 0, 120, 30, HALF_BLACK)

  for (let x = 6; x < 110; x += 20) {
    canvas.letter(x, 7, 16, YELLOW, [157, 157, 0, 255])
    canvas.fill(x - 2, 5, 1, 20, [27, 27, 0, 128])
  }

  return canvas.done()
}

/** White letters with no band: their soft edge is white, half see-through. */
export function whiteWithNoBand(): Drawn {
  const canvas = new Canvas(100, 40)

  canvas.letter(1, 1, 16, [255, 255, 255, 255], [255, 255, 255, 128])
  canvas.letter(21, 1, 16, [255, 255, 255, 255], [255, 255, 255, 128])
  canvas.letter(1, 22, 16, [255, 255, 255, 255], [255, 255, 255, 128])
  canvas.letter(83, 22, 16, [255, 255, 255, 255], [255, 255, 255, 128])

  return canvas.done()
}

/** White letters with black edges and no band. */
export function edgedWithNoBand(): Drawn {
  const canvas = new Canvas(64, 24)

  for (let x = 0; x < 64; x += 22) {
    canvas.fill(x, 0, 20, 24, [0, 0, 0, 255])
    canvas.fill(x + 3, 3, 14, 18, [255, 255, 255, 255])
  }

  canvas.fill(0, 0, 20, 24, [0, 0, 0, 255])
  canvas.fill(3, 3, 14, 18, [255, 255, 255, 255])
  canvas.fill(5, 5, 10, 14, [0, 0, 0, 0])

  return canvas.done()
}

/** White and grey letters on a solid black band, with one half see-through black entry where the band meets the picture's border. */
export function whiteOnASolidBand(): Drawn {
  const canvas = new Canvas(140, 36)

  canvas.fill(0, 0, 140, 36, [0, 0, 0, 255])
  canvas.fill(0, 0, 140, 1, HALF_BLACK)

  for (let x = 8; x < 130; x += 22) {
    canvas.letter(x, 11, 12, [255, 255, 255, 255], [110, 110, 110, 255])
  }

  return canvas.done()
}

/** Speakers in their colours on a half band: white, yellow, cyan and green. */
export function speakersOnAHalfBand(): Drawn {
  const canvas = new Canvas(100, 24)

  canvas.fill(0, 0, 100, 24, HALF_BLACK)
  canvas.letter(4, 4, 16, [255, 255, 255, 255], [128, 128, 128, 255])
  canvas.letter(28, 4, 16, [255, 255, 0, 255], [128, 128, 0, 255])
  canvas.letter(52, 4, 16, [0, 255, 255, 255], [0, 128, 128, 255])
  canvas.letter(76, 4, 16, [0, 255, 0, 255], [0, 128, 0, 255])

  return canvas.done()
}

/** Grey letters with no white beside them, on a half band. */
export function greyOnAHalfBand(): Drawn {
  const canvas = new Canvas(48, 24)

  canvas.fill(0, 0, 48, 24, HALF_BLACK)
  canvas.letter(4, 4, 16, [150, 150, 150, 255], [75, 75, 75, 255])
  canvas.letter(28, 4, 16, [150, 150, 150, 255], [75, 75, 75, 255])

  return canvas.done()
}

/** White letters in a picture packed into 256 colours, whose low bits are gone: the white is 0xF0. */
export function packedInto256(): Drawn {
  const canvas = new Canvas(256, 20)

  canvas.fill(0, 0, 256, 20, HALF_BLACK)

  for (let step = 0; step < 250; step += 1) {
    canvas.fill(step, 18, 1, 2, [(step >> 4) << 4, (step & 15) << 4, 64, 255])
  }

  canvas.letter(20, 2, 12, [240, 240, 240, 255], [112, 112, 112, 255])

  return canvas.done()
}
