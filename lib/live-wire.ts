/**
 * The wire a live picture arrives on, as the browser reads and writes it.
 *
 * Every message is one frame: a channel byte, a 90 kHz presentation time in
 * eight big-endian bytes, and the payload. The picture channels carry fMP4 —
 * the header is `ftyp`+`moov`, and every frame after it is `moof`+`mdat` with
 * the sound muxed in. The caption channels carry the broadcast's captions as
 * the server drew them: a header naming the canvas, then a picture — placed on
 * that canvas, as a palette PNG — each time the caption changes, and an empty
 * frame when it goes. The control channel carries the few typed messages a
 * wire says about itself, told apart by their length and by nothing else.
 *
 * The numbers here are the API's own enumerations, copied from its source and
 * not inferred from anything seen on the wire.
 */

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
  /** 90 kHz ticks. The wire has room for 64 bits; the clock never leaves 33. */
  pts: number
  payload: Uint8Array
}

/**
 * One message off the wire. Nothing shorter than a header, and nothing on a
 * channel the wire did not set aside, is a frame.
 */
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

/** A frame as the wire carries it. */
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

/** The canvas the captions are drawn on: the broadcast's own picture, in pixels. */
export interface CaptionCanvas {
  width: number
  height: number
}

/** Two big-endian bytes a side. */
export const CAPTION_CANVAS_LENGTH = 4

/**
 * A caption as the server drew it: the part of the canvas it covers, and the
 * palette PNG of that part. The wire places and measures it in two bytes each.
 */
export interface CaptionPicture {
  left: number
  top: number
  width: number
  height: number
  png: Uint8Array
}

/** Left, top, width and height, before the PNG. */
export const CAPTION_PLACEMENT_LENGTH = 8

export type CaptionSaid =
  | { said: 'shown'; picture: CaptionPicture }
  | { said: 'cleared' }
  | { said: 'unknown' }

/** The canvas the caption header names. Anything but two sides, or a side of nothing, is not one. */
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

/** A caption header as the wire carries it. */
export function captionCanvasPayload(canvas: CaptionCanvas): Uint8Array {
  const payload = new Uint8Array(CAPTION_CANVAS_LENGTH)
  const view = new DataView(payload.buffer)

  view.setUint16(0, canvas.width)
  view.setUint16(2, canvas.height)

  return payload
}

/**
 * What a caption frame says. An empty payload takes the caption off; anything
 * with a placement and a PNG behind it is a caption shown; a placement with
 * nothing behind it, or one that measures nothing, is `unknown`.
 */
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

/** A caption shown, as the wire carries it. */
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

/** The one-byte messages. A viewer may say the last two and nothing else. */
const CONTROL_BYTE = { ping: 0x01, pong: 0x02, leaving: 0x03 } as const

export type LiveControl = keyof typeof CONTROL_BYTE

/** A control message a viewer sends, ready for the wire. */
export function controlFrame(said: 'pong' | 'leaving'): Uint8Array {
  return frameOf('control', 0, new Uint8Array([CONTROL_BYTE[said]]))
}

/** How far a channel has come, in the order it comes. */
export const STARTUP_SEGMENTS = [
  'tunerSecured',
  'channelLocked',
  'transcoderStarted',
  'initReached',
  'firstPicture',
] as const

export type LiveStartupSegment = (typeof STARTUP_SEGMENTS)[number]

/** Milliseconds from the start of the session at which each segment was reached. */
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

/** How many transcoders run and how many may, said with a full-budget refusal. */
export interface TranscodeCeiling {
  running: number
  atOnce: number
}

const ENDING_BYTE = {
  letGo: 1,
  takenForARecording: 2,
  driverDraining: 3,
  windowClosed: 4,
  tunerFailed: 5,
  stoppedByAnother: 6,
  driverLost: 7,
} as const

export type LiveSupplyEnd = keyof typeof ENDING_BYTE

export const LIVE_SUPPLY_ENDS = Object.keys(ENDING_BYTE) as LiveSupplyEnd[]

const ENDING_LENGTH = 2

const ENDING_MARK = 0xe0

export type LiveControlSaid =
  | { said: LiveControl }
  | { said: 'progress'; startup: LiveStartup }
  | { said: 'refusal'; refusal: LiveRefusal; ceiling?: TranscodeCeiling }
  | { said: 'ending'; why: LiveSupplyEnd }
  | { said: 'unknown' }

function nameOf<T extends string>(
  table: Record<T, number>,
  code: number,
): T | undefined {
  return (Object.keys(table) as T[]).find((name) => table[name] === code)
}

/**
 * What the control channel said, read off the payload's length. A message of
 * a length the wire never sends, or one that names a value the API has no name
 * for, is `unknown` rather than a guess.
 */
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
    return { said: 'refusal', refusal }
  }

  return { said: 'refusal', refusal, ceiling: { running, atOnce } }
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

/** A progress report as the wire carries it. */
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

/** A refusal as the wire carries it. */
export function refusalPayload(
  refusal: LiveRefusal,
  ceiling?: TranscodeCeiling,
): Uint8Array {
  const payload = new Uint8Array(REFUSAL_LENGTH)
  const view = new DataView(payload.buffer)

  payload[0] = REFUSAL_BYTE[refusal]

  if (ceiling) {
    view.setUint16(1, ceiling.running)
    view.setUint16(3, ceiling.atOnce)
  }

  return payload
}

/** An ending report as the wire carries it. */
export function endingPayload(why: LiveSupplyEnd): Uint8Array {
  return new Uint8Array([ENDING_MARK, ENDING_BYTE[why]])
}

/** The boxes that hold other boxes, down to the sample descriptions. */
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl'])

/** How far into a sample entry its own boxes begin. */
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

/**
 * The `codecs` a `SourceBuffer` for this header has to be opened with, read
 * off the header itself: the H.264 profile and level are in its `avcC`, and
 * the sound is there when an `mp4a` entry is. A header with no H.264 in it
 * is not one this player can show, and answers nothing.
 */
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
