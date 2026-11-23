export function box(
  type: string,
  ...payload: (Uint8Array | number[])[]
): Uint8Array {
  const parts = payload.map((part) =>
    part instanceof Uint8Array ? part : new Uint8Array(part),
  )
  const bytes = new Uint8Array(
    8 + parts.reduce((sum, part) => sum + part.length, 0),
  )

  new DataView(bytes.buffer).setUint32(0, bytes.length)
  bytes.set(
    [...type].map((char) => char.charCodeAt(0)),
    4,
  )

  let at = 8

  for (const part of parts) {
    bytes.set(part, at)
    at += part.length
  }

  return bytes
}

export function joined(...parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  )
  let at = 0

  for (const part of parts) {
    bytes.set(part, at)
    at += part.length
  }

  return bytes
}

export function u32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]
}

export function u64(value: number): number[] {
  return [...u32(Math.floor(value / 2 ** 32)), ...u32(value % 2 ** 32)]
}

function named(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0))
}

export interface TrackSaid {
  id: number
  handler: 'vide' | 'soun'
  timescale: number
  version?: 0 | 1
}

const AVC_ENTRY = box(
  'avc1',
  new Uint8Array(78),
  box('avcC', [1, 0x64, 0, 0x1f]),
)

const AAC_ENTRY = box('mp4a', new Uint8Array(28))

export function track({
  id,
  handler,
  timescale,
  version = 0,
}: TrackSaid): Uint8Array {
  const stamps = version === 1 ? new Uint8Array(16) : new Uint8Array(8)

  return box(
    'trak',
    box('tkhd', [version, 0, 0, 3], stamps, u32(id), new Uint8Array(60)),
    box(
      'mdia',
      box('mdhd', [version, 0, 0, 0], stamps, u32(timescale), u32(0), u32(0)),
      box('hdlr', u32(0), u32(0), named(handler), new Uint8Array(13)),
      box(
        'minf',
        box(
          'stbl',
          box(
            'stsd',
            u32(0),
            u32(1),
            handler === 'vide' ? AVC_ENTRY : AAC_ENTRY,
          ),
        ),
      ),
    ),
  )
}

export function header(...tracks: TrackSaid[]): Uint8Array {
  return joined(
    box('ftyp', named('isom'), u32(0x200), named('isomiso6')),
    box('moov', box('mvhd', new Uint8Array(100)), ...tracks.map(track)),
  )
}

export interface RunSaid {
  track: number
  at?: number
  samples?: number
  offset?: number
  version?: 0 | 1
  flags?: number
}

const DATA_OFFSET = 0x000001

const FIRST_SAMPLE_FLAGS = 0x000004

const SAMPLE_DURATION = 0x000100

const SAMPLE_SIZE = 0x000200

const SAMPLE_FLAGS = 0x000400

const SAMPLE_OFFSET = 0x000800

function sampleOf(flags: number, offset: number): number[] {
  return [
    ...(flags & SAMPLE_DURATION ? u32(3003) : []),
    ...(flags & SAMPLE_SIZE ? u32(1200) : []),
    ...(flags & SAMPLE_FLAGS ? u32(0x02000000) : []),
    ...(flags & SAMPLE_OFFSET ? u32(offset >>> 0) : []),
  ]
}

export function run({
  track: id,
  at,
  samples = 1,
  offset,
  version = 0,
  flags = DATA_OFFSET | SAMPLE_DURATION | SAMPLE_SIZE | SAMPLE_FLAGS,
}: RunSaid): Uint8Array {
  const said = offset === undefined ? flags : flags | SAMPLE_OFFSET

  return box(
    'traf',
    box('tfhd', [0, 0x02, 0, 0], u32(id)),
    ...(at === undefined
      ? []
      : [
          version === 1
            ? box('tfdt', [1, 0, 0, 0], u64(at))
            : box('tfdt', [0, 0, 0, 0], u32(at)),
        ]),
    box(
      'trun',
      [version, ...u32(said).slice(1)],
      u32(samples),
      said & DATA_OFFSET ? u32(0) : [],
      said & FIRST_SAMPLE_FLAGS ? u32(0x02000000) : [],
      ...Array.from({ length: samples }, () => sampleOf(said, offset ?? 0)),
    ),
  )
}

export function fragment(...runs: RunSaid[]): Uint8Array {
  return joined(
    box('moof', box('mfhd', u32(0), u32(1)), ...runs.map(run)),
    box('mdat', new Uint8Array(16)),
  )
}

export const RUN_FLAGS = {
  DATA_OFFSET,
  FIRST_SAMPLE_FLAGS,
  SAMPLE_DURATION,
  SAMPLE_SIZE,
  SAMPLE_FLAGS,
  SAMPLE_OFFSET,
}
