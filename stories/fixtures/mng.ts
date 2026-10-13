import { crc32 } from '@/lib/bml/crc32'

type Rgba = readonly [number, number, number, number]

const MNG_SIGNATURE = [0x8a, 0x4d, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const MOST_STORED = 0xffff

function u32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]
}

function joined(parts: (Uint8Array | number[])[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const bytes = new Uint8Array(length)
  let at = 0

  parts.forEach((part) => {
    bytes.set(part, at)
    at += part.length
  })

  return bytes
}

function chunk(type: string, data: Uint8Array | number[] = []): Uint8Array {
  const body = joined([
    Array.from(type, (letter) => letter.charCodeAt(0)),
    data,
  ])

  return joined([u32(data.length), body, u32(crc32(body))])
}

function adler32(bytes: Uint8Array): number {
  let a = 1
  let b = 0

  for (const byte of bytes) {
    a = (a + byte) % 65521
    b = (b + a) % 65521
  }

  return ((b << 16) | a) >>> 0
}

/** A zlib stream of stored blocks: what IDAT holds, left uncompressed. */
function stored(raw: Uint8Array): Uint8Array {
  const blocks: number[][] = []

  for (let at = 0; at < raw.length || blocks.length === 0; at += MOST_STORED) {
    const length = Math.min(MOST_STORED, raw.length - at)
    const last = at + MOST_STORED >= raw.length ? 1 : 0

    blocks.push([
      last,
      length & 0xff,
      length >>> 8,
      ~length & 0xff,
      (~length >>> 8) & 0xff,
      ...raw.subarray(at, at + length),
    ])
  }

  return joined([[0x78, 0x01], ...blocks, u32(adler32(raw))])
}

/** The chunks of a truecolour PNG with alpha, IHDR to IEND, as an MNG embeds it, drawn pixel by pixel. */
function picture(
  width: number,
  height: number,
  pixel: (x: number, y: number) => Rgba,
): Uint8Array {
  const raw = new Uint8Array(height * (1 + width * 4))

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      raw.set(pixel(x, y), y * (1 + width * 4) + 1 + x * 4)
    }
  }

  return joined([
    chunk('IHDR', [...u32(width), ...u32(height), 8, 6, 0, 0, 0]),
    chunk('IDAT', stored(raw)),
    chunk('IEND'),
  ])
}

function inCircle(x: number, y: number, middle: number, radius: number) {
  return (x + 0.5 - middle) ** 2 + (y + 0.5 - middle) ** 2 <= radius ** 2
}

const LAMP = 60

const CLEAR: Rgba = [0, 0, 0, 0]

/** The colours of the sample: the case, a lamp left off, and the three lamps lit in turn. */
export const SIGNAL_COLOURS = {
  case: [40, 44, 50, 255],
  off: [78, 84, 92, 255],
  lit: [
    [224, 80, 60, 255],
    [232, 176, 48, 255],
    [60, 180, 110, 255],
  ],
} as const satisfies Record<string, Rgba | readonly Rgba[]>

/** Where to read each lamp: the middle of it, on the frame of the MNG. */
export const SIGNAL_LAMPS = [0, 1, 2].map((at) => ({
  x: at * LAMP + LAMP / 2,
  y: LAMP / 2,
}))

function signalCase(): Uint8Array {
  return picture(LAMP * 3, LAMP, (x, y) =>
    inCircle(x % LAMP, y, LAMP / 2, 22)
      ? SIGNAL_COLOURS.off
      : SIGNAL_COLOURS.case,
  )
}

function lamp(colour: Rgba): Uint8Array {
  return picture(LAMP, LAMP, (x, y) =>
    inCircle(x, y, LAMP / 2, 22) ? colour : CLEAR,
  )
}

/** A subframe of framing mode 4: the case, then one lamp lit over it at its place, for the ticks given. */
function subframe(first: boolean, at: number, ticks: number): Uint8Array {
  return joined([
    chunk('FRAM', [first ? 4 : 0, 0, 1, 0, 0, 0, ...u32(ticks)]),
    signalCase(),
    chunk('DEFI', [0, 0, 0, 0, ...u32(at * LAMP), ...u32(0)]),
    lamp(SIGNAL_COLOURS.lit[at]),
  ])
}

/** A synthetic MNG made here, not taken from any broadcast: a signal of three lamps that light in turn, the first for half a second and the others for a quarter, a hundred rounds over. */
export function signalMng(): Uint8Array {
  return joined([
    MNG_SIGNATURE,
    chunk('MHDR', [
      ...u32(LAMP * 3),
      ...u32(LAMP),
      ...u32(100),
      ...new Array<number>(16).fill(0),
    ]),
    chunk('TERM', [3, 0, ...u32(0), ...u32(100)]),
    subframe(true, 0, 50),
    subframe(false, 1, 25),
    subframe(false, 2, 25),
    chunk('MEND'),
  ])
}
