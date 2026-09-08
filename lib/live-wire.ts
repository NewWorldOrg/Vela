export const HEADER_LENGTH = 9

export const PTS_HERTZ = 90_000

export const LIVE_CHANNEL = {
  pictureHeader: 0x00,
  picture: 0x01,
  soundHeader: 0x10,
  sound: 0x11,
  captionHeader: 0x20,
  caption: 0x21,
  serviceInformation: 0x30,
  control: 0x40,
} as const

export type LiveChannelName = keyof typeof LIVE_CHANNEL

const CHANNEL_NAMES = Object.entries(LIVE_CHANNEL) as [
  LiveChannelName,
  number,
][]

export interface LiveFrame {
  channel: LiveChannelName
  pts: number
  payload: Uint8Array
}

export function readFrame(bytes: Uint8Array): LiveFrame | null {
  if (bytes.length < HEADER_LENGTH) {
    return null
  }

  const named = CHANNEL_NAMES.find(([, code]) => code === bytes[0])

  if (!named) {
    return null
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const pts = view.getUint32(1) * 2 ** 32 + view.getUint32(5)

  return {
    channel: named[0],
    pts,
    payload: bytes.subarray(HEADER_LENGTH),
  }
}

export function frameOf(
  channel: LiveChannelName,
  pts: number,
  payload: Uint8Array,
): Uint8Array {
  const bytes = new Uint8Array(HEADER_LENGTH + payload.length)
  const view = new DataView(bytes.buffer)

  bytes[0] = LIVE_CHANNEL[channel]
  view.setUint32(1, Math.floor(pts / 2 ** 32))
  view.setUint32(5, pts % 2 ** 32)
  bytes.set(payload, HEADER_LENGTH)

  return bytes
}

export function ptsSeconds(pts: number): number {
  return pts / PTS_HERTZ
}

export interface CaptionCanvas {
  width: number
  height: number
}

export const CAPTION_CANVAS_LENGTH = 4

export interface CaptionPicture {
  left: number
  top: number
  width: number
  height: number
  png: Uint8Array
}

export const CAPTION_PLACEMENT_LENGTH = 8

export type CaptionSaid =
  | { said: 'shown'; picture: CaptionPicture }
  | { said: 'cleared' }
  | { said: 'unknown' }

export function readCaptionCanvas(payload: Uint8Array): CaptionCanvas | null {
  if (payload.length !== CAPTION_CANVAS_LENGTH) {
    return null
  }

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  )
  const width = view.getUint16(0)
  const height = view.getUint16(2)

  return width > 0 && height > 0 ? { width, height } : null
}

export function captionCanvasPayload(canvas: CaptionCanvas): Uint8Array {
  const payload = new Uint8Array(CAPTION_CANVAS_LENGTH)
  const view = new DataView(payload.buffer)

  view.setUint16(0, canvas.width)
  view.setUint16(2, canvas.height)

  return payload
}

export function readCaption(payload: Uint8Array): CaptionSaid {
  if (payload.length === 0) {
    return { said: 'cleared' }
  }

  if (payload.length <= CAPTION_PLACEMENT_LENGTH) {
    return { said: 'unknown' }
  }

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  )
  const width = view.getUint16(4)
  const height = view.getUint16(6)

  if (width === 0 || height === 0) {
    return { said: 'unknown' }
  }

  return {
    said: 'shown',
    picture: {
      left: view.getUint16(0),
      top: view.getUint16(2),
      width,
      height,
      png: payload.subarray(CAPTION_PLACEMENT_LENGTH),
    },
  }
}

export function captionPayload(picture: CaptionPicture): Uint8Array {
  const payload = new Uint8Array(CAPTION_PLACEMENT_LENGTH + picture.png.length)
  const view = new DataView(payload.buffer)

  view.setUint16(0, picture.left)
  view.setUint16(2, picture.top)
  view.setUint16(4, picture.width)
  view.setUint16(6, picture.height)
  payload.set(picture.png, CAPTION_PLACEMENT_LENGTH)

  return payload
}

const CONTROL_BYTE = { ping: 0x01, pong: 0x02, leaving: 0x03 } as const

export type LiveControl = keyof typeof CONTROL_BYTE

export function controlFrame(said: 'pong' | 'leaving'): Uint8Array {
  return frameOf('control', 0, new Uint8Array([CONTROL_BYTE[said]]))
}

export const STARTUP_SEGMENTS = [
  'tunerSecured',
  'channelLocked',
  'transcoderStarted',
  'initReached',
  'firstPicture',
] as const

export type LiveStartupSegment = (typeof STARTUP_SEGMENTS)[number]

export type LiveStartup = Partial<Record<LiveStartupSegment, number>>

const MARK_LENGTH = 5

const PROGRESS_LENGTH = MARK_LENGTH * STARTUP_SEGMENTS.length

const REFUSAL_BYTE = {
  noSuchChannel: 1,
  noTunerFree: 2,
  wouldNotTune: 3,
  driverUnavailable: 4,
  tooManyAlready: 5,
  transcoderWouldNotStart: 6,
} as const

export type LiveRefusal = keyof typeof REFUSAL_BYTE

export const LIVE_REFUSALS = Object.keys(REFUSAL_BYTE) as LiveRefusal[]

const REFUSAL_LENGTH = 5

export interface TranscodeCeiling {
  running: number
  atOnce: number
}

const TUNE_FAILURE_BYTE = {
  noLock: 1,
  noData: 2,
  incompletePsi: 3,
  streamMismatch: 4,
} as const

export type TuneFailure = keyof typeof TUNE_FAILURE_BYTE

const TUNER_HOLDER_BYTE = {
  aRecording: 1,
  anotherViewer: 2,
} as const

export type LiveTunerHolder = keyof typeof TUNER_HOLDER_BYTE

export type LiveRefusalDetail =
  | { of: 'tuneFailure'; failure: TuneFailure }
  | { of: 'heldBy'; holder: LiveTunerHolder }

const ENDING_BYTE = {
  letGo: 1,
  takenForARecording: 2,
  driverDraining: 3,
  windowClosed: 4,
  tunerFailed: 5,
  stoppedByAnother: 6,
  driverLost: 7,
  wentQuiet: 8,
} as const

export type LiveSupplyEnd = keyof typeof ENDING_BYTE

export const LIVE_SUPPLY_ENDS = Object.keys(ENDING_BYTE) as LiveSupplyEnd[]

const ENDING_LENGTH = 2

const ENDING_MARK = 0xe0

export type LiveControlSaid =
  | { said: LiveControl }
  | { said: 'progress'; startup: LiveStartup }
  | {
      said: 'refusal'
      refusal: LiveRefusal
      ceiling?: TranscodeCeiling
      detail?: LiveRefusalDetail
    }
  | { said: 'ending'; why: LiveSupplyEnd }
  | { said: 'unknown' }

function nameOf<T extends string>(
  table: Record<T, number>,
  code: number,
): T | undefined {
  return (Object.keys(table) as T[]).find((name) => table[name] === code)
}

export function readControl(payload: Uint8Array): LiveControlSaid {
  switch (payload.length) {
    case 1: {
      const said = nameOf(CONTROL_BYTE, payload[0])

      return said ? { said } : { said: 'unknown' }
    }
    case ENDING_LENGTH: {
      const why = nameOf(ENDING_BYTE, payload[1])

      return payload[0] === ENDING_MARK && why
        ? { said: 'ending', why }
        : { said: 'unknown' }
    }
    case REFUSAL_LENGTH:
      return readRefusal(payload)
    case PROGRESS_LENGTH:
      return readProgress(payload)
    default:
      return { said: 'unknown' }
  }
}

function readRefusal(payload: Uint8Array): LiveControlSaid {
  const refusal = nameOf(REFUSAL_BYTE, payload[0])

  if (!refusal) {
    return { said: 'unknown' }
  }

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  )
  const running = view.getUint16(1)
  const atOnce = view.getUint16(3)

  if (refusal !== 'tooManyAlready') {
    const detail = detailOf(refusal, payload[1])

    return detail
      ? { said: 'refusal', refusal, detail }
      : { said: 'refusal', refusal }
  }

  return { said: 'refusal', refusal, ceiling: { running, atOnce } }
}

function detailOf(
  refusal: LiveRefusal,
  said: number,
): LiveRefusalDetail | undefined {
  if (refusal === 'wouldNotTune') {
    const failure = nameOf(TUNE_FAILURE_BYTE, said)

    return failure ? { of: 'tuneFailure', failure } : undefined
  }

  if (refusal === 'noTunerFree') {
    const holder = nameOf(TUNER_HOLDER_BYTE, said)

    return holder ? { of: 'heldBy', holder } : undefined
  }

  return undefined
}

function readProgress(payload: Uint8Array): LiveControlSaid {
  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  )
  const startup: LiveStartup = {}

  STARTUP_SEGMENTS.forEach((segment, index) => {
    const at = index * MARK_LENGTH

    if (payload[at] === 1) {
      startup[segment] = view.getUint32(at + 1)
    }
  })

  return { said: 'progress', startup }
}

export function progressPayload(startup: LiveStartup): Uint8Array {
  const payload = new Uint8Array(PROGRESS_LENGTH)
  const view = new DataView(payload.buffer)

  STARTUP_SEGMENTS.forEach((segment, index) => {
    const reached = startup[segment]

    if (reached !== undefined) {
      payload[index * MARK_LENGTH] = 1
      view.setUint32(index * MARK_LENGTH + 1, reached)
    }
  })

  return payload
}

export function refusalPayload(
  refusal: LiveRefusal,
  over: { ceiling?: TranscodeCeiling; detail?: LiveRefusalDetail } = {},
): Uint8Array {
  const payload = new Uint8Array(REFUSAL_LENGTH)
  const view = new DataView(payload.buffer)

  payload[0] = REFUSAL_BYTE[refusal]

  if (over.ceiling) {
    view.setUint16(1, over.ceiling.running)
    view.setUint16(3, over.ceiling.atOnce)

    return payload
  }

  if (over.detail) {
    payload[1] =
      over.detail.of === 'tuneFailure'
        ? TUNE_FAILURE_BYTE[over.detail.failure]
        : TUNER_HOLDER_BYTE[over.detail.holder]
  }

  return payload
}

export function endingPayload(why: LiveSupplyEnd): Uint8Array {
  return new Uint8Array([ENDING_MARK, ENDING_BYTE[why]])
}

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl'])

const SAMPLE_ENTRY_HEAD: Record<string, number> = {
  avc1: 78,
  avc3: 78,
  mp4a: 28,
}

const SOUND_CODEC = 'mp4a.40.2'

interface Box {
  type: string
  start: number
  end: number
}

function* boxesIn(bytes: Uint8Array, from: number, to: number): Generator<Box> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let at = from

  while (at + 8 <= to) {
    let size = view.getUint32(at)
    let head = 8

    if (size === 1 && at + 16 <= to) {
      size = view.getUint32(at + 8) * 2 ** 32 + view.getUint32(at + 12)
      head = 16
    } else if (size === 0) {
      size = to - at
    }

    if (size < head || at + size > to) {
      return
    }

    yield {
      type: String.fromCharCode(...bytes.subarray(at + 4, at + 8)),
      start: at + head,
      end: at + size,
    }

    at += size
  }
}

function* everyBox(
  bytes: Uint8Array,
  from: number,
  to: number,
): Generator<Box> {
  for (const box of boxesIn(bytes, from, to)) {
    yield box

    if (CONTAINERS.has(box.type)) {
      yield* everyBox(bytes, box.start, box.end)
    } else if (box.type === 'stsd') {
      yield* everyBox(bytes, box.start + 8, box.end)
    } else if (box.type in SAMPLE_ENTRY_HEAD) {
      yield* everyBox(bytes, box.start + SAMPLE_ENTRY_HEAD[box.type], box.end)
    }
  }
}

export function codecsOf(init: Uint8Array): string | null {
  let picture: string | null = null
  let sound = false

  for (const box of everyBox(init, 0, init.length)) {
    if (box.type === 'avcC' && box.end - box.start >= 4) {
      const hex = (byte: number) => byte.toString(16).padStart(2, '0')

      picture = `avc1.${hex(init[box.start + 1])}${hex(init[box.start + 2])}${hex(init[box.start + 3])}`
    }

    if (box.type === 'mp4a') {
      sound = true
    }
  }

  if (!picture) {
    return null
  }

  return sound ? `${picture}, ${SOUND_CODEC}` : picture
}

export function mimeOf(codecs: string): string {
  return `video/mp4; codecs="${codecs}"`
}
