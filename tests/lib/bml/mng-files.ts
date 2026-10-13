import { crc32, deflateSync } from 'node:zlib'

/** Synthetic MNG files for the tests, built chunk by chunk from the MNG 1.0 layout. */
const SIGNATURE = Buffer.from([0x8a, 0x4d, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

export function u32(value: number): Buffer {
  const bytes = Buffer.alloc(4)

  bytes.writeUInt32BE(value >>> 0)

  return bytes
}

export function i32(value: number): Buffer {
  const bytes = Buffer.alloc(4)

  bytes.writeInt32BE(value)

  return bytes
}

export function chunk(type: string, data: Buffer = Buffer.alloc(0)): Buffer {
  const head = Buffer.concat([u32(data.length), Buffer.from(type, 'latin1')])

  return Buffer.concat([
    head,
    data,
    u32(crc32(Buffer.concat([head.subarray(4), data]))),
  ])
}

/** The chunks of a PNG of one colour, IHDR to IEND, without the signature, as an MNG embeds it. */
export function picture(
  width: number,
  height: number,
  rgba: [number, number, number, number] = [255, 0, 0, 255],
): Buffer[] {
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.concat(Array.from({ length: width }, () => Buffer.from(rgba))),
  ])
  const header = Buffer.concat([
    u32(width),
    u32(height),
    Buffer.from([8, 6, 0, 0, 0]),
  ])

  return [
    chunk('IHDR', header),
    chunk(
      'IDAT',
      deflateSync(Buffer.concat(Array.from({ length: height }, () => row))),
    ),
    chunk('IEND'),
  ]
}

export function indexedPicture(): Buffer[] {
  return [
    chunk(
      'IHDR',
      Buffer.concat([u32(1), u32(1), Buffer.from([8, 3, 0, 0, 0])]),
    ),
    chunk('IDAT', deflateSync(Buffer.from([0, 4]))),
    chunk('IEND'),
  ]
}

export function mhdr(width: number, height: number, ticks = 100): Buffer {
  return chunk(
    'MHDR',
    Buffer.concat([u32(width), u32(height), u32(ticks), Buffer.alloc(16)]),
  )
}

export interface Fram {
  mode?: number
  delay?: number
  lasting?: boolean
  clip?: {
    delta?: boolean
    left: number
    right: number
    top: number
    bottom: number
    lasting?: boolean
  }
  name?: string
}

export function fram(fields: Fram = {}): Buffer {
  const { mode = 0, delay, lasting = false, clip, name = '' } = fields

  if (delay === undefined && clip === undefined) {
    return chunk(
      'FRAM',
      Buffer.concat([Buffer.from([mode]), Buffer.from(name, 'latin1')]),
    )
  }

  const delayChange = delay === undefined ? 0 : lasting ? 2 : 1
  const clipChange = clip === undefined ? 0 : clip.lasting ? 2 : 1

  return chunk(
    'FRAM',
    Buffer.concat([
      Buffer.from([mode]),
      Buffer.from(name, 'latin1'),
      Buffer.from([0, delayChange, 0, clipChange, 0]),
      delay === undefined ? Buffer.alloc(0) : u32(delay),
      clip === undefined
        ? Buffer.alloc(0)
        : Buffer.concat([
            Buffer.from([clip.delta ? 1 : 0]),
            i32(clip.left),
            i32(clip.right),
            i32(clip.top),
            i32(clip.bottom),
          ]),
    ]),
  )
}

export function defi(
  x: number,
  y: number,
  options: { hidden?: boolean; clip?: [number, number, number, number] } = {},
): Buffer {
  return chunk(
    'DEFI',
    Buffer.concat([
      Buffer.from([0, 0, options.hidden ? 1 : 0, 0]),
      i32(x),
      i32(y),
      ...(options.clip ?? []).map(i32),
    ]),
  )
}

export function term(
  action: number,
  after = 0,
  delay = 0,
  iterations = 1,
): Buffer {
  return chunk(
    'TERM',
    action === 3
      ? Buffer.concat([Buffer.from([3, after]), u32(delay), u32(iterations)])
      : Buffer.from([action]),
  )
}

export function loop(nest: number, count: number): Buffer {
  return chunk('LOOP', Buffer.concat([Buffer.from([nest]), u32(count)]))
}

export function endl(nest: number): Buffer {
  return chunk('ENDL', Buffer.from([nest]))
}

export const MEND = chunk('MEND')

export function mng(...chunks: (Buffer | Buffer[])[]): Uint8Array {
  return new Uint8Array(Buffer.concat([SIGNATURE, ...chunks.flat()]))
}
