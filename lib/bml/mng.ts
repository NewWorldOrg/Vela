import { crc32 } from '@/lib/bml/crc32'
import { withPalette, type Palette } from '@/lib/bml/palette'

/** How much of an MNG is read: past any of these, it is malformed. */
export const MNG_LIMITS = {
  bytes: 4 * 1024 * 1024,
  images: 256,
  width: 1920,
  height: 1080,
  pixels: 8 * 1024 * 1024,
  steps: 4096,
  nesting: 16,
} as const

/** The count of a LOOP, or of a TERM's rounds, that never runs out. */
export const FOREVER = 0x7fffffff

/** How many steps a pass may take without showing anything before it is cut short. */
const MOST_STEPS_UNSEEN = 65_536

const SIGNATURE = [0x8a, 0x4d, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const PNG_SIGNATURE = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])

const MOST_NAME = 79

const DEFI_LENGTHS = new Set([2, 3, 4, 12, 28])

export interface MngBox {
  left: number
  top: number
  right: number
  bottom: number
}

/** One embedded image, as a PNG file of its own. */
export interface MngImage {
  png: Uint8Array
  width: number
  height: number
}

export type FramingMode = 1 | 2 | 3 | 4

interface Change<T> {
  value: T
  lasting: boolean
}

/** What the MNG says, in order, once its images are taken out: a FRAM, an image shown where its DEFI put it, and the two ends of a LOOP. */
export type MngStep =
  | {
      kind: 'frame'
      mode: FramingMode | null
      delay: Change<number> | null
      clip: Change<{ delta: boolean; box: MngBox }> | null
    }
  | {
      kind: 'image'
      image: number
      x: number
      y: number
      clip: MngBox | null
      shown: boolean
    }
  | { kind: 'loop'; count: number; end: number }
  | { kind: 'end'; start: number }

/** A TERM: 0 holds the last frame, 1 clears it, 2 goes back to the first, 3 plays it all again `iterations` times with `delay` ticks between, then does `after`. */
export interface MngTermination {
  action: 0 | 1 | 2 | 3
  after: 0 | 1 | 2
  delay: number
  iterations: number
}

export interface MngAnimation {
  width: number
  height: number
  ticksPerSecond: number
  images: MngImage[]
  steps: MngStep[]
  termination: MngTermination | null
  pixels: number
}

export type MngReading =
  | { read: 'mng'; animation: MngAnimation; ignored: string[] }
  | { read: 'malformed'; why: string }

/** An image drawn at its place, inside the boundaries it is clipped to. */
export interface MngDraw {
  image: number
  x: number
  y: number
  clip: MngBox
}

/** What changes on the frame at once: cleared first or not, the images laid on it, and how long it stays before the next. */
export interface MngUpdate {
  clear: boolean
  draws: MngDraw[]
  delayMs: number
}

class Malformed extends Error {}

interface Chunk {
  type: string
  data: Uint8Array
  whole: Uint8Array
}

interface Defined {
  x: number
  y: number
  clip: MngBox | null
  shown: boolean
}

const UNDEFINED: Defined = { x: 0, y: 0, clip: null, shown: true }

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

/** Whether the bytes begin as an MNG does. */
export function isMng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= SIGNATURE.length &&
    SIGNATURE.every((byte, index) => bytes[index] === byte)
  )
}

function* chunksOf(bytes: Uint8Array): Generator<Chunk> {
  const view = viewOf(bytes)
  let at = SIGNATURE.length

  while (at < bytes.length) {
    const length = at + 12 <= bytes.length ? view.getUint32(at) : -1
    const end = at + 12 + length

    if (length < 0 || length > FOREVER || end > bytes.length) {
      throw new Malformed('a chunk runs past the end')
    }

    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))

    if (!/^[A-Za-z]{4}$/.test(type)) {
      throw new Malformed('a chunk type that is not four letters')
    }

    if (crc32(bytes.subarray(at + 4, end - 4)) !== view.getUint32(end - 4)) {
      throw new Malformed(`a CRC that does not match in ${type}`)
    }

    yield {
      type,
      data: bytes.subarray(at + 8, end - 4),
      whole: bytes.subarray(at, end),
    }
    at = end
  }
}

function boxAt(view: DataView, at: number): MngBox {
  return {
    left: view.getInt32(at),
    right: view.getInt32(at + 4),
    top: view.getInt32(at + 8),
    bottom: view.getInt32(at + 12),
  }
}

function changeOf(code: number, most: number, what: string): number {
  if (code > most) {
    throw new Malformed(`a FRAM change of ${what} past ${most}`)
  }

  return code
}

function frameOf(data: Uint8Array): MngStep {
  if (data.length === 0) {
    return { kind: 'frame', mode: null, delay: null, clip: null }
  }

  if (data[0] > 4) {
    throw new Malformed('a framing mode past 4')
  }

  const mode = data[0] === 0 ? null : (data[0] as FramingMode)
  const separator = data.indexOf(0, 1)
  const nameEnd = separator < 0 ? data.length : separator

  if (nameEnd - 1 > MOST_NAME) {
    throw new Malformed('a FRAM name too long')
  }

  if (separator < 0) {
    return { kind: 'frame', mode, delay: null, clip: null }
  }

  return { kind: 'frame', mode, ...frameChanges(data, separator + 1) }
}

function frameChanges(
  data: Uint8Array,
  from: number,
): Pick<Extract<MngStep, { kind: 'frame' }>, 'delay' | 'clip'> {
  if (from + 4 > data.length) {
    throw new Malformed('a FRAM cut short')
  }

  const view = viewOf(data)
  const delayChange = changeOf(data[from], 2, 'delay')
  const timeoutChange = changeOf(data[from + 1], 8, 'timeout')
  const clipChange = changeOf(data[from + 2], 2, 'clipping')
  const syncChange = changeOf(data[from + 3], 2, 'sync')
  const delayAt = from + 4
  const clipAt = delayAt + (delayChange ? 4 : 0) + (timeoutChange ? 4 : 0)
  const syncAt = clipAt + (clipChange ? 17 : 0)

  if (
    syncAt > data.length ||
    (syncChange && (data.length - syncAt) % 4 !== 0)
  ) {
    throw new Malformed('a FRAM cut short')
  }

  const ticks = delayChange ? view.getUint32(delayAt) : 0

  if (ticks > FOREVER || (clipChange && data[clipAt] > 1)) {
    throw new Malformed('a FRAM value out of range')
  }

  return {
    delay: delayChange ? { value: ticks, lasting: delayChange === 2 } : null,
    clip: clipChange
      ? {
          value: { delta: data[clipAt] === 1, box: boxAt(view, clipAt + 1) },
          lasting: clipChange === 2,
        }
      : null,
  }
}

function definedOf(data: Uint8Array): Defined {
  if (!DEFI_LENGTHS.has(data.length) || (data[2] ?? 0) > 1) {
    throw new Malformed('a DEFI that does not hold together')
  }

  const view = viewOf(data)

  return {
    x: data.length >= 12 ? view.getInt32(4) : 0,
    y: data.length >= 12 ? view.getInt32(8) : 0,
    clip: data.length === 28 ? boxAt(view, 12) : null,
    shown: (data[2] ?? 0) === 0,
  }
}

function terminationOf(data: Uint8Array): MngTermination {
  const action = data[0]

  if (
    (data.length !== 1 && data.length !== 10) ||
    action > 3 ||
    (action === 3 && (data.length !== 10 || data[1] > 2))
  ) {
    throw new Malformed('a TERM that does not hold together')
  }

  if (action !== 3) {
    return { action: action as 0 | 1 | 2, after: 0, delay: 0, iterations: 1 }
  }

  const view = viewOf(data)

  return {
    action,
    after: data[1] as 0 | 1 | 2,
    delay: Math.min(FOREVER, view.getUint32(2)),
    iterations: Math.min(FOREVER, view.getUint32(6)),
  }
}

interface Embedding {
  width: number
  height: number
  chunks: Uint8Array[]
  data: boolean
}

class Reading {
  readonly images: MngImage[] = []

  readonly steps: MngStep[] = []

  readonly ignored = new Set<string>()

  termination: MngTermination | null = null

  pixels = 0

  private defined: Defined | null = null

  private readonly loops: { start: number; nest: number }[] = []

  private embedding: Embedding | null = null

  readonly width: number

  readonly height: number

  readonly ticksPerSecond: number

  constructor(header: Uint8Array) {
    if (header.length < 12) {
      throw new Malformed('an MHDR cut short')
    }

    const view = viewOf(header)

    this.width = view.getUint32(0)
    this.height = view.getUint32(4)
    this.ticksPerSecond = view.getUint32(8)

    if (
      this.width === 0 ||
      this.height === 0 ||
      this.width > MNG_LIMITS.width ||
      this.height > MNG_LIMITS.height
    ) {
      throw new Malformed('a frame of no size or past the largest')
    }
  }

  /** Takes one chunk, and says whether it was the last. */
  take(chunk: Chunk): boolean {
    if (this.embedding) {
      this.embed(this.embedding, chunk)

      return false
    }

    switch (chunk.type) {
      case 'IHDR':
        this.begin(chunk)
        return false
      case 'FRAM':
        this.step(frameOf(chunk.data))
        return false
      case 'DEFI':
        this.defined = definedOf(chunk.data)
        return false
      case 'TERM':
        this.termination = terminationOf(chunk.data)
        return false
      case 'LOOP':
        this.loop(chunk.data)
        return false
      case 'ENDL':
        this.endLoop(chunk.data)
        return false
      case 'MHDR':
        throw new Malformed('a second MHDR')
      case 'MEND':
        if (this.loops.length > 0) {
          throw new Malformed('a LOOP left open at MEND')
        }

        return true
      default:
        this.ignored.add(chunk.type)
        return false
    }
  }

  private step(step: MngStep): void {
    if (this.steps.length >= MNG_LIMITS.steps) {
      throw new Malformed('too many steps')
    }

    this.steps.push(step)
  }

  private begin(chunk: Chunk): void {
    if (chunk.data.length !== 13) {
      throw new Malformed('an IHDR that does not hold together')
    }

    const view = viewOf(chunk.data)
    const width = view.getUint32(0)
    const height = view.getUint32(4)

    if (width === 0 || height === 0) {
      throw new Malformed('an image of no size')
    }

    if (width > this.width || height > this.height) {
      throw new Malformed('an image larger than the frame')
    }

    if (this.images.length >= MNG_LIMITS.images) {
      throw new Malformed(`more than ${MNG_LIMITS.images} images`)
    }

    this.pixels += width * height

    if (this.pixels > MNG_LIMITS.pixels) {
      throw new Malformed('too many pixels in all')
    }

    this.embedding = { width, height, chunks: [chunk.whole], data: false }
  }

  private embed(embedding: Embedding, chunk: Chunk): void {
    if (
      chunk.type === 'IHDR' ||
      chunk.type === 'MHDR' ||
      chunk.type === 'MEND'
    ) {
      throw new Malformed('an image without its IEND')
    }

    embedding.chunks.push(chunk.whole)
    embedding.data ||= chunk.type === 'IDAT'

    if (chunk.type !== 'IEND') {
      return
    }

    if (!embedding.data) {
      throw new Malformed('an image without IDAT')
    }

    const defined = this.defined ?? UNDEFINED

    this.embedding = null
    this.defined = null
    this.images.push({
      png: pngOf(embedding.chunks),
      width: embedding.width,
      height: embedding.height,
    })
    this.step({ kind: 'image', image: this.images.length - 1, ...defined })
  }

  private loop(data: Uint8Array): void {
    if (data.length < 5) {
      throw new Malformed('a LOOP cut short')
    }

    const count = viewOf(data).getUint32(1)

    if (count > FOREVER) {
      throw new Malformed('a LOOP count out of range')
    }

    if (this.loops.length >= MNG_LIMITS.nesting) {
      throw new Malformed('loops nested too deep')
    }

    this.loops.push({ start: this.steps.length, nest: data[0] })
    this.step({ kind: 'loop', count, end: -1 })
  }

  private endLoop(data: Uint8Array): void {
    const open = this.loops.pop()

    if (data.length !== 1 || !open || open.nest !== data[0]) {
      throw new Malformed('an ENDL that closes no LOOP')
    }

    const start = this.steps[open.start]

    if (start.kind === 'loop') {
      start.end = this.steps.length
    }

    this.step({ kind: 'end', start: open.start })
  }

  animation(): MngAnimation {
    return {
      width: this.width,
      height: this.height,
      ticksPerSecond: this.ticksPerSecond,
      images: this.images,
      steps: this.steps,
      termination: this.termination,
      pixels: this.pixels,
    }
  }
}

function pngOf(chunks: Uint8Array[]): Uint8Array {
  const length = chunks.reduce((sum, each) => sum + each.length, 0)
  const png = new Uint8Array(PNG_SIGNATURE.length + length)
  let at = PNG_SIGNATURE.length

  png.set(PNG_SIGNATURE)
  chunks.forEach((each) => {
    png.set(each, at)
    at += each.length
  })

  return png
}

/** Reads an MNG: its frame, its images as PNG files of their own and what it says to do with them, with the chunk types it does not draw named once each; or why it is malformed. Every CRC is checked, and nothing past MNG_LIMITS is taken. */
export function readMng(bytes: Uint8Array): MngReading {
  if (bytes.length > MNG_LIMITS.bytes) {
    return { read: 'malformed', why: 'too large' }
  }

  if (!isMng(bytes)) {
    return { read: 'malformed', why: 'not an MNG' }
  }

  try {
    const chunks = chunksOf(bytes)
    const first = chunks.next()

    if (first.done || first.value.type !== 'MHDR') {
      throw new Malformed('no MHDR first')
    }

    const reading = new Reading(first.value.data)

    for (const chunk of chunks) {
      if (reading.take(chunk)) {
        return {
          read: 'mng',
          animation: reading.animation(),
          ignored: [...reading.ignored],
        }
      }
    }

    throw new Malformed('no MEND')
  } catch (error) {
    if (error instanceof Malformed) {
      return { read: 'malformed', why: error.message }
    }

    throw error
  }
}

/** The animation with every indexed image that leaves its palette to the document given the document's. */
export function paintedWith(
  animation: MngAnimation,
  palette: Palette,
): MngAnimation {
  return {
    ...animation,
    images: animation.images.map((image) => ({
      ...image,
      png: withPalette(image.png, palette),
    })),
  }
}

function meet(a: MngBox, b: MngBox | null): MngBox {
  return b
    ? {
        left: Math.max(a.left, b.left),
        top: Math.max(a.top, b.top),
        right: Math.min(a.right, b.right),
        bottom: Math.min(a.bottom, b.bottom),
      }
    : a
}

function moved(box: MngBox, by: MngBox): MngBox {
  return {
    left: box.left + by.left,
    top: box.top + by.top,
    right: box.right + by.right,
    bottom: box.bottom + by.bottom,
  }
}

/** The subframes of one pass through an MNG, under its framing modes: which images each lays down, whether the frame is cleared first, and how long it stays. */
class Subframes {
  private mode: FramingMode = 1

  private delay = 1

  private nextDelay: number | null = null

  private clip: MngBox

  private nextClip: MngBox | null = null

  private fresh = true

  private layers: MngDraw[] = []

  private opened = false

  private shown = 0

  private readonly whole: MngBox

  private readonly tickMs: number

  constructor(whole: MngBox, tickMs: number) {
    this.whole = whole
    this.clip = whole
    this.tickMs = tickMs
  }

  image(step: Extract<MngStep, { kind: 'image' }>): MngUpdate[] {
    if (!step.shown) {
      return []
    }

    const draw: MngDraw = {
      image: step.image,
      x: step.x,
      y: step.y,
      clip: meet(meet(this.whole, this.nextClip ?? this.clip), step.clip),
    }

    this.shown += 1

    switch (this.mode) {
      case 1:
        return [this.update(this.fresh, [draw])]
      case 3:
        return [this.update(true, [draw])]
      default:
        this.layers.push(draw)
        return []
    }
  }

  frame(step: Extract<MngStep, { kind: 'frame' }>): MngUpdate[] {
    const closed = this.close(true)

    this.nextDelay = null
    this.nextClip = null
    this.opened = true
    this.shown = 0
    this.mode = step.mode ?? this.mode

    if (step.delay?.lasting) {
      this.delay = step.delay.value
    } else if (step.delay) {
      this.nextDelay = step.delay.value
    }

    if (step.clip) {
      const { delta, box } = step.clip.value
      const clip = delta ? moved(this.clip, box) : box

      if (step.clip.lasting) {
        this.clip = clip
      } else {
        this.nextClip = clip
      }
    }

    return closed
  }

  /** Ends the subframe open: what modes 2 and 4 held back is laid down, and in modes 3 and 4 a subframe a FRAM opened and closed with no image in it is a cleared frame. */
  close(byFrame: boolean): MngUpdate[] {
    const layers = this.layers
    const empty = byFrame && this.opened && this.shown === 0

    this.layers = []

    switch (this.mode) {
      case 2:
        return layers.length > 0 ? [this.update(this.fresh, layers)] : []
      case 3:
        return empty ? [this.update(true, [])] : []
      case 4:
        return layers.length > 0 || empty ? [this.update(true, layers)] : []
      default:
        return []
    }
  }

  private update(clear: boolean, draws: MngDraw[]): MngUpdate {
    this.fresh = false

    return {
      clear,
      draws,
      delayMs: (this.nextDelay ?? this.delay) * this.tickMs,
    }
  }
}

interface Looping {
  start: number
  left: number
  seen: number
}

/** One pass through an MNG's steps. A loop goes round again only while it shows something, past its first time round, and a pass that goes too long showing nothing ends. */
function* passOf(
  animation: MngAnimation,
  tickMs: number,
): Generator<MngUpdate> {
  const subframes = new Subframes(
    { left: 0, top: 0, right: animation.width, bottom: animation.height },
    tickMs,
  )
  const loops: Looping[] = []
  const steps = animation.steps
  let made = 0
  let unseen = 0
  let at = 0

  while (at < steps.length && unseen < MOST_STEPS_UNSEEN) {
    const step = steps[at]
    let next = at + 1
    let updates: MngUpdate[] = []

    switch (step.kind) {
      case 'image':
        updates = subframes.image(step)
        break
      case 'frame':
        updates = subframes.frame(step)
        break
      case 'loop':
        if (step.count === 0) {
          next = step.end + 1
        } else {
          loops.push({ start: at, left: step.count, seen: -1 })
        }
        break
      case 'end':
        next = roundAgain(loops, made) ?? next
        break
    }

    made += updates.length
    unseen = updates.length > 0 ? 0 : unseen + 1
    yield* updates
    at = next
  }

  yield* subframes.close(false)
}

/** Where a loop's ENDL sends the pass: back past its LOOP while it has rounds left and showed something, or on. */
function roundAgain(loops: Looping[], made: number): number | null {
  const loop = loops[loops.length - 1]
  const showed = loop.seen < 0 || made > loop.seen
  const left = loop.left === FOREVER || loop.left > 1

  if (!showed || !left) {
    loops.pop()

    return null
  }

  loop.left = loop.left === FOREVER ? FOREVER : loop.left - 1
  loop.seen = made

  return loop.start + 1
}

/** The updates an MNG makes on its frame, in order, round after round as its TERM says, then what the TERM leaves on it at the end. With no ticks in a second, only the first. */
export function* updatesOf(animation: MngAnimation): Generator<MngUpdate> {
  if (animation.ticksPerSecond === 0) {
    const first = passOf(animation, 0).next()

    if (!first.done) {
      yield first.value
    }

    return
  }

  const tickMs = 1000 / animation.ticksPerSecond
  const term = animation.termination
  const rounds = term?.action === 3 ? Math.max(1, term.iterations) : 1
  let first: MngUpdate | null = null
  let held: MngUpdate | null = null

  for (let round = 0; rounds === FOREVER || round < rounds; round += 1) {
    let showed = false

    for (const update of passOf(animation, tickMs)) {
      if (held) {
        yield held
      }

      held = update
      first ??= update
      showed = true
    }

    if (!showed) {
      break
    }

    if (term && held && (rounds === FOREVER || round + 1 < rounds)) {
      held = { ...held, delayMs: held.delayMs + term.delay * tickMs }
    }
  }

  if (held) {
    yield held
  }

  yield* ending(term, first)
}

function ending(
  term: MngTermination | null,
  first: MngUpdate | null,
): MngUpdate[] {
  const action = term?.action === 3 ? term.after : (term?.action ?? 0)

  if (action === 1) {
    return [{ clear: true, draws: [], delayMs: 0 }]
  }

  return action === 2 && first ? [{ ...first, clear: true, delayMs: 0 }] : []
}
