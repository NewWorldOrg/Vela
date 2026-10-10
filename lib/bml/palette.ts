export const PALETTE_SIZE = 256

const CHANNELS = 4

const COMMON_FIXED =
  '000000ffff0000ff00ff00ffffff00ff0000ffffff00ffff00ffffffffffffff' +
  '00000000aa0000ff00aa00ffaaaa00ff0000aaffaa00aaff00aaaaffaaaaaaff' +
  '000055ff005500ff005555ff0055aaff0055ffff00aa55ff00aaffff00ff55ff' +
  '00ffaaff550000ff550055ff5500aaff5500ffff555500ff555555ff5555aaff' +
  '5555ffff55aa00ff55aa55ff55aaaaff55aaffff55ff00ff55ff55ff55ffaaff' +
  '55ffffffaa0055ffaa00ffffaa5500ffaa5555ffaa55aaffaa55ffffaaaa55ff' +
  'aaaaffffaaff00ffaaff55ffaaffaaffaaffffffff0055ffff00ffffff5500ff' +
  'ff5555ffff55aaffff55ffffffaa00ffffaa55ffffaaaaffffaaffffffff55ff' +
  'ffffffff00000080ff00008000ff0080ffff00800000ff80ff00ff8000ffff80' +
  'ffffff80aa00008000aa0080aaaa00800000aa80aa00aa8000aaaa80aaaaaa80' +
  '0000558000550080005555800055aa800055ff8000aa558000aaff8000ff5580' +
  '00ffaa8055000080550055805500aa805500ff8055550080555555805555aa80' +
  '5555ff8055aa008055aa558055aaaa8055aaff8055ff008055ff558055ffaa80' +
  '55ffff80aa005580aa00ff80aa550080aa555580aa55aa80aa55ff80aaaa5580' +
  'aaaaff80aaff0080aaff5580aaffaa80aaffff80ff005580ff00ff80ff550080' +
  'ff555580ff55aa80ff55ff80ffaa0080ffaa5580ffaaaa80ffaaff80ffff5580'

/** The colours a document can name by index: 256 of red, green, blue and alpha. */
export interface Palette {
  colours: Uint8Array
}

export interface ClutEntries {
  from: number
  colours: Uint8Array
}

function commonFixed(): Uint8Array {
  const colours = new Uint8Array(PALETTE_SIZE * CHANNELS)

  for (let at = 0; at < COMMON_FIXED.length / 2; at += 1) {
    colours[at] = parseInt(COMMON_FIXED.slice(at * 2, at * 2 + 2), 16)
  }

  return colours
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function rgbOfYcbcr(y: number, cb: number, cr: number): number[] {
  const luma = 1.164 * (y - 16)

  return [
    clamp(luma + 1.793 * (cr - 128)),
    clamp(luma - 0.213 * (cb - 128) - 0.533 * (cr - 128)),
    clamp(luma + 2.112 * (cb - 128)),
  ]
}

function rangeOf(
  bytes: Uint8Array,
  at: number,
  depth: number,
  stated: boolean,
): { from: number; to: number; next: number } | null {
  const bits = [2, 4, 8][depth]

  if (bits === undefined) {
    return null
  }

  if (!stated) {
    return { from: 0, to: (1 << bits) - 1, next: at }
  }

  if (bits === 8) {
    return at + 2 <= bytes.length
      ? { from: bytes[at], to: bytes[at + 1], next: at + 2 }
      : null
  }

  return at + 1 <= bytes.length
    ? { from: bytes[at] >> 4, to: bytes[at] & 0x0f, next: at + 1 }
    : null
}

/** Reads a colour lookup table resource: its entries from the index they start at, or null when it is not one. */
export function readClut(bytes: Uint8Array): ClutEntries | null {
  if (bytes.length < 1) {
    return null
  }

  const flags = bytes[0]
  const inRgb = (flags & 0x80) !== 0
  const depth = (flags >> 5) & 0x03
  const regioned = (flags & 0x10) !== 0
  const range = rangeOf(bytes, regioned ? 9 : 1, depth, (flags & 0x08) !== 0)

  if (!range || range.to < range.from) {
    return null
  }

  const count = range.to - range.from + 1

  if (range.next + count * CHANNELS > bytes.length) {
    return null
  }

  const colours = new Uint8Array(count * CHANNELS)

  for (let index = 0; index < count; index += 1) {
    const at = range.next + index * CHANNELS
    const [a, b, c] = [bytes[at], bytes[at + 1], bytes[at + 2]]
    const rgb = inRgb ? [a, b, c] : rgbOfYcbcr(a, b, c)

    colours.set([...rgb, bytes[at + 3]], index * CHANNELS)
  }

  return { from: range.from, colours }
}

/** The common fixed colours, with a document's lookup table laid over the indices it names. */
export function paletteOf(clut: ClutEntries | null): Palette {
  const colours = commonFixed()

  if (clut) {
    const room = Math.max(0, (PALETTE_SIZE - clut.from) * CHANNELS)

    colours.set(clut.colours.subarray(0, room), clut.from * CHANNELS)
  }

  return { colours }
}

/** The CSS colour of an index, or null when the index is not one. */
export function colourOf(palette: Palette, index: number): string | null {
  if (!Number.isInteger(index) || index < 0 || index >= PALETTE_SIZE) {
    return null
  }

  const at = index * CHANNELS
  const [r, g, b, a] = palette.colours.subarray(at, at + CHANNELS)

  return a === 255
    ? `rgb(${r} ${g} ${b})`
    : `rgb(${r} ${g} ${b} / ${Number((a / 255).toFixed(3))})`
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const INDEXED = 3

let crcTable: Uint32Array | null = null

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)

    for (let n = 0; n < 256; n += 1) {
      let c = n

      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }

      crcTable[n] = c >>> 0
    }
  }

  let crc = 0xffffffff

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
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

interface PngChunk {
  type: string
  at: number
}

function chunksOf(png: Uint8Array): PngChunk[] | null {
  if (
    png.length < 8 ||
    PNG_SIGNATURE.some((byte, index) => png[index] !== byte)
  ) {
    return null
  }

  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const chunks: PngChunk[] = []
  let at = 8

  while (at + 12 <= png.length) {
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))

    chunks.push({ type, at })
    at += 12 + view.getUint32(at)
  }

  return at === png.length ? chunks : null
}

/** A PNG the way a browser can draw it: an indexed PNG that leaves its palette to the document is given the document's. */
export function withPalette(png: Uint8Array, palette: Palette): Uint8Array {
  const chunks = chunksOf(png)
  const header = chunks?.[0]

  if (
    !chunks ||
    header?.type !== 'IHDR' ||
    png[header.at + 8 + 9] !== INDEXED ||
    chunks.some((each) => each.type === 'PLTE')
  ) {
    return png
  }

  const before = chunks.find(
    (each) => each.type === 'tRNS' || each.type === 'IDAT',
  )

  if (!before) {
    return png
  }

  const entries = Math.min(PALETTE_SIZE, 1 << png[header.at + 8 + 8])
  const rgb = new Uint8Array(entries * 3)
  const alpha = new Uint8Array(entries)

  for (let index = 0; index < entries; index += 1) {
    rgb.set(
      palette.colours.subarray(index * CHANNELS, index * CHANNELS + 3),
      index * 3,
    )
    alpha[index] = palette.colours[index * CHANNELS + 3]
  }

  const inserted = [
    chunk('PLTE', rgb),
    ...(before.type === 'tRNS' ? [] : [chunk('tRNS', alpha)]),
  ]
  const added = inserted.reduce((sum, each) => sum + each.length, 0)
  const drawn = new Uint8Array(png.length + added)
  let at = before.at

  drawn.set(png.subarray(0, before.at))
  inserted.forEach((each) => {
    drawn.set(each, at)
    at += each.length
  })
  drawn.set(png.subarray(before.at), at)

  return drawn
}
