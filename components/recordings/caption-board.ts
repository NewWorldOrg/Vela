import {
  CLEARANCE_MOTION,
  liftClearOf,
  type Rect,
} from '@/lib/caption-placement'
import {
  PLAIN_CAPTION_STYLE,
  type CaptionShift,
  type CaptionStyle,
} from '@/lib/caption-style'
import { movesNow } from '@/lib/motion'

/** What lies over the bottom of the picture while the control row is up, in the window's coordinates, where the target of each thing's own motion is. */
export type MeasureClearance = () => Rect[]

/** What the surface drawing the captions answers to the board. */
export interface CaptionDrawing {
  repaint: () => void
  restyle: () => void
  /** The move as it lands for the caption standing now, kept inside the picture. */
  keptInside: (shift: CaptionShift) => CaptionShift
}

/** How far a pointer moves, holding, before the caption is taken to be moved rather than pressed. */
export const MOVES_FROM: Record<string, number> = {
  mouse: 6,
  pen: 6,
  touch: 12,
}

/** How long after a caption is let go a click is the end of that move, not a press on the player. */
const A_MOVE_ENDS_MS = 400

interface Grab {
  pointer: number
  x: number
  y: number
  from: CaptionShift
  shown: Rect
  moving: boolean
  kind: string
}

interface Motion {
  from: number
  to: number
  startedAt: number
  ms: number
  ease: (time: number) => number
}

interface Placed {
  image: Rect
  shown: Rect
  canvas: HTMLCanvasElement
}

function stillNow(): boolean {
  if (
    typeof document === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return true
  }

  return !movesNow(
    document.documentElement.dataset.motion,
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
}

function inCanvas(rect: Rect, canvas: DOMRect): Rect {
  return { ...rect, left: rect.left - canvas.left, top: rect.top - canvas.top }
}

/** Everything about the captions that outlives a session of the player: the style chosen, the lift clear of the control row and its motion, and the grip that moves the caption. One surface at a time draws on it. */
export class CaptionBoard {
  private chosen: CaptionStyle

  private surface: CaptionDrawing | null = null

  private measure: MeasureClearance | null = null

  private clearance: Rect[] = []

  private progress = 0

  private motion: Motion | null = null

  private frame: number | null = null

  private lifted = 0

  private grip: HTMLElement | null = null

  private grab: Grab | null = null

  private dragged: CaptionShift | null = null

  private movedUntil = 0

  private placedNow: Placed | null = null

  private moved: ((shift: CaptionShift) => void) | null = null

  constructor(style: CaptionStyle = PLAIN_CAPTION_STYLE) {
    this.chosen = style
  }

  /** The style to draw with: the move being made while the caption is held. */
  get style(): CaptionStyle {
    return this.dragged ? { ...this.chosen, shift: this.dragged } : this.chosen
  }

  get holding(): boolean {
    return this.grab?.moving === true
  }

  restyle(style: CaptionStyle): void {
    this.chosen = style
    this.surface?.restyle()
  }

  /** What to tell when the caption has been moved and let go. */
  whenMoved(moved: ((shift: CaptionShift) => void) | null): void {
    this.moved = moved
  }

  attach(surface: CaptionDrawing): void {
    this.surface = surface
  }

  detach(surface: CaptionDrawing): void {
    if (this.surface === surface) {
      this.surface = null
      this.placed(null)
    }
  }

  /** Lift the captions clear of what `measure` finds while the control row is up over the picture, or let them down with null. */
  clearOf(measure: MeasureClearance | null): void {
    const was = this.measure

    this.measure = measure

    if (this.holding || (was === null) === (measure === null)) {
      this.surface?.repaint()

      return
    }

    this.moveTo(measure ? 1 : 0)
  }

  /** How far to lift a caption drawn at `image`, inside a picture shown at `shown`, on `canvas`. */
  liftFor(image: Rect, shown: Rect, canvas: HTMLCanvasElement): number {
    if (this.holding || (this.progress === 0 && this.motion === null)) {
      this.lifted = 0

      return 0
    }

    if (this.measure) {
      this.clearance = this.measure()
    }

    const box = canvas.getBoundingClientRect()
    const over = this.clearance.map((one) => inCanvas(one, box))
    const eased = this.easedProgress()

    this.lifted = liftClearOf(image, shown, over) * eased

    return this.lifted
  }

  /** Where the caption was drawn, so the grip can stand over it; null when nothing is drawn. */
  placed(placed: Placed | null): void {
    this.placedNow = placed

    const grip = this.grip

    if (!grip) {
      return
    }

    const parent = grip.parentElement

    if (!placed || !(parent instanceof HTMLElement)) {
      delete grip.dataset.shown

      return
    }

    const from = parent.getBoundingClientRect()
    const canvas = placed.canvas.getBoundingClientRect()

    grip.dataset.shown = 'true'
    grip.style.left = `${canvas.left - from.left + placed.image.left}px`
    grip.style.top = `${canvas.top - from.top + placed.image.top}px`
    grip.style.width = `${placed.image.width}px`
    grip.style.height = `${placed.image.height}px`
  }

  /** The element over the caption that takes the pointer, or null while the caption cannot be moved. */
  gripBy(grip: HTMLElement | null): void {
    if (grip === this.grip) {
      return
    }

    this.release()

    if (this.grip) {
      this.listen(this.grip, false)
    }

    this.grip = grip

    if (grip) {
      this.listen(grip, true)
      this.placed(this.placedNow)
    }
  }

  close(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame)
      this.frame = null
    }

    this.gripBy(null)
  }

  private listen(grip: HTMLElement, on: boolean): void {
    const pairs: Array<[string, (event: never) => void]> = [
      ['pointerdown', this.down],
      ['pointermove', this.move],
      ['pointerup', this.up],
      ['pointercancel', this.cancel],
      ['lostpointercapture', this.cancel],
      ['click', this.swallow],
      ['dblclick', this.swallow],
    ]

    for (const [type, listener] of pairs) {
      const capture = type === 'click' || type === 'dblclick'

      if (on) {
        grip.addEventListener(type, listener as EventListener, capture)
      } else {
        grip.removeEventListener(type, listener as EventListener, capture)
      }
    }
  }

  private readonly down = (event: PointerEvent): void => {
    const placed = this.placedNow

    if (!event.isPrimary || event.button !== 0 || !placed || !this.surface) {
      return
    }

    this.grab = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      from: this.surface.keptInside(this.chosen.shift),
      shown: placed.shown,
      moving: false,
      kind: event.pointerType,
    }
    this.capture(event.pointerId, true)
  }

  /** Keeps the pointer on the grip while the caption is held; a pointer already gone is still heard while it stays over the caption. */
  private capture(pointer: number, on: boolean): void {
    try {
      if (on) {
        this.grip?.setPointerCapture(pointer)
      } else {
        this.grip?.releasePointerCapture(pointer)
      }
    } catch {
      return
    }
  }

  private readonly move = (event: PointerEvent): void => {
    const grab = this.grab

    if (!grab || event.pointerId !== grab.pointer || !this.surface) {
      return
    }

    const across = event.clientX - grab.x
    const down = event.clientY - grab.y

    if (!grab.moving) {
      if (Math.hypot(across, down) < (MOVES_FROM[grab.kind] ?? 6)) {
        return
      }

      this.takeHold(grab)
    }

    this.dragged = this.surface.keptInside({
      x: grab.from.x + across / (grab.shown.width || 1),
      y: grab.from.y + down / (grab.shown.height || 1),
    })
    this.surface.repaint()
  }

  private takeHold(grab: Grab): void {
    grab.moving = true
    grab.from = {
      x: grab.from.x,
      y: grab.from.y - this.lifted / (grab.shown.height || 1),
    }
    this.stopMoving(0)

    if (this.grip) {
      this.grip.dataset.holding = 'true'
    }
  }

  private readonly up = (event: PointerEvent): void => {
    const grab = this.grab

    if (!grab || event.pointerId !== grab.pointer) {
      return
    }

    const shift = this.dragged

    this.grab = null
    this.dragged = null
    this.capture(event.pointerId, false)

    if (!grab.moving || !shift) {
      return
    }

    delete this.grip?.dataset.holding
    this.movedUntil = performance.now() + A_MOVE_ENDS_MS
    this.chosen = { ...this.chosen, shift }
    this.moved?.(shift)

    if (this.measure) {
      this.moveTo(1)
    } else {
      this.surface?.repaint()
    }
  }

  private readonly cancel = (event: PointerEvent): void => {
    if (this.grab?.pointer === event.pointerId) {
      this.release()
    }
  }

  private release(): void {
    const held = this.holding

    this.grab = null
    this.dragged = null
    delete this.grip?.dataset.holding

    if (held) {
      this.moveTo(this.measure ? 1 : 0)
    }
  }

  private readonly swallow = (event: Event): void => {
    if (performance.now() < this.movedUntil) {
      event.stopPropagation()
      event.preventDefault()
    }
  }

  private easedProgress(): number {
    const motion = this.motion

    if (!motion) {
      return this.progress
    }

    const time = Math.min(1, (performance.now() - motion.startedAt) / motion.ms)
    const eased = motion.ease(time)

    return motion.from + (motion.to - motion.from) * eased
  }

  private stopMoving(at: number): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame)
      this.frame = null
    }

    this.motion = null
    this.progress = at
  }

  private moveTo(to: number): void {
    const from = this.easedProgress()

    this.stopMoving(from)

    if (from === to || stillNow()) {
      this.progress = to
      this.surface?.repaint()

      return
    }

    const timing = to > from ? CLEARANCE_MOTION.rise : CLEARANCE_MOTION.fall

    this.motion = {
      from,
      to,
      startedAt: performance.now(),
      ms: timing.ms,
      ease: timing.ease,
    }
    this.step()
  }

  private readonly step = (): void => {
    const motion = this.motion

    if (!motion) {
      return
    }

    const done = performance.now() - motion.startedAt >= motion.ms

    if (done) {
      this.motion = null
      this.progress = motion.to
      this.frame = null
    }

    this.surface?.repaint()

    if (!done) {
      this.frame = requestAnimationFrame(this.step)
    }
  }
}
