import {
  NO_MARGIN,
  captionPlaced,
  containedIn,
  type Rect,
} from '@/lib/caption-placement'
import {
  lookKey,
  lookOf,
  looksAsBroadcast,
  type CaptionShift,
} from '@/lib/caption-style'
import type { CaptionCanvas, CaptionPicture } from '@/lib/live-wire'
import {
  CaptionBoard,
  type CaptionDrawing,
} from '@/components/recordings/caption-board'
import {
  broadcastCaption,
  restyledCaption,
  type DrawnCaption,
} from '@/components/recordings/caption-restyle'

export type CaptionState = 'none' | 'shown' | 'off'

export interface DecodedCaption {
  picture: CaptionPicture
  bitmap: Promise<ImageBitmap | null>
  taken?: boolean
}

const READ_MS = 100

const DRAWN = 'data-drawn'

const AS_BROADCAST = 'broadcast'

export function decodeCaption(picture: CaptionPicture): DecodedCaption {
  return {
    picture,
    bitmap: createImageBitmap(
      new Blob([picture.png.slice()], { type: 'image/png' }),
    ).catch(() => null),
  }
}

interface Made {
  of: DecodedCaption
  key: string
  drawn: DrawnCaption
}

/** The canvas laid over a video that draws one broadcast caption at a time inside the picture's own rectangle, in the style its board holds. */
export class CaptionSurface implements CaptionDrawing {
  private readonly canvas: HTMLCanvasElement

  private readonly video: HTMLVideoElement

  private readonly tick: () => void

  private readonly board: CaptionBoard

  private drawnOn: CaptionCanvas | null = null

  private standing: DecodedCaption | null = null

  private made: Made | null = null

  private making = false

  private wanted = false

  private shown: Rect | null = null

  private closed = false

  private frame: number | null = null

  private reading: ReturnType<typeof setInterval> | null = null

  private framed = false

  private readonly watching: ResizeObserver | null

  private readonly minding: MutationObserver

  private readonly repainting = () => this.paint()

  private readonly resized = () => this.restyle()

  constructor(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    tick: () => void,
    board: CaptionBoard = new CaptionBoard(),
  ) {
    this.canvas = canvas
    this.video = video
    this.tick = tick
    this.board = board
    this.watching =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(this.repainting)
    this.watching?.observe(canvas)
    this.minding = new MutationObserver(this.repainting)
    this.minding.observe(canvas, { attributeFilter: [DRAWN] })
    video.addEventListener('resize', this.resized)
    board.attach(this)
    this.follow()
    this.paint()
  }

  canvasOf(size: CaptionCanvas): void {
    this.drawnOn = size
    this.restyle()
  }

  get showsAPicture(): boolean {
    return this.standing !== null
  }

  /** Stand a caption: nothing at once for null; otherwise the one drawn now stays until the new one is ready, as the broadcast's own pictures always have. */
  show(caption: DecodedCaption | null): void {
    this.standing = caption

    if (caption) {
      this.make()

      return
    }

    this.made?.drawn.close()
    this.made = null
    this.paint()
  }

  repaint(): void {
    this.paint()
  }

  restyle(): void {
    this.make()
    this.paint()
  }

  keptInside(shift: CaptionShift): CaptionShift {
    const made = this.drawable()

    if (!made || !this.drawnOn || !this.shown) {
      return shift
    }

    return captionPlaced({
      shown: this.shown,
      canvas: this.drawnOn,
      drawn: made.of.picture,
      margin: made.drawn.margin,
      scale: this.scale(),
      shift,
    }).shift
  }

  drawOn(
    context: CanvasRenderingContext2D,
    size: { width: number; height: number },
  ): void {
    const made = this.drawable()

    if (!this.drawn || !made || !this.drawnOn || this.closed) {
      return
    }

    const place = captionPlaced({
      shown: { left: 0, top: 0, ...size },
      canvas: this.drawnOn,
      drawn: made.of.picture,
      margin: made.drawn.margin,
      scale: this.scale(),
      shift: this.board.style.shift,
    }).image

    context.drawImage(
      made.drawn.image,
      place.left,
      place.top,
      place.width,
      place.height,
    )
  }

  close(): void {
    this.closed = true
    this.watching?.disconnect()
    this.minding.disconnect()
    this.video.removeEventListener('resize', this.resized)
    this.board.detach(this)

    if (this.frame !== null && 'cancelVideoFrameCallback' in this.video) {
      this.video.cancelVideoFrameCallback(this.frame)
    }

    if (this.reading !== null) {
      clearInterval(this.reading)
    }

    this.made?.drawn.close()
    this.made = null
    this.standing = null
    this.paint()
  }

  private scale(): number {
    return Number(this.board.style.scale) / 100
  }

  /** How much wider than tall a pixel of the caption's canvas is drawn: 4/3 for a 1440x1080 canvas over a 16:9 picture. */
  private stretch(): number {
    const { videoWidth, videoHeight } = this.video
    const canvas = this.drawnOn

    if (!canvas || videoWidth <= 0 || videoHeight <= 0) {
      return 1
    }

    return videoWidth / canvas.width / (videoHeight / canvas.height)
  }

  private keyNow(): string {
    const look = lookOf(this.board.style)

    if (looksAsBroadcast(look)) {
      return AS_BROADCAST
    }

    return `${lookKey(look)}@${this.stretch().toFixed(2)}@${this.drawnOn?.height ?? 0}`
  }

  /** What is drawn now: the standing caption once it is made, and until then the one before it. */
  private drawable(): Made | null {
    return this.standing ? this.made : null
  }

  private make(): void {
    const caption = this.standing

    if (!caption || this.closed) {
      return
    }

    const key = this.keyNow()

    if (this.made?.of === caption && this.made.key === key) {
      return
    }

    if (this.making) {
      this.wanted = true

      return
    }

    this.making = true
    void this.render(caption, key).then((drawn) =>
      this.madeOf(caption, key, drawn),
    )
  }

  private madeOf(
    caption: DecodedCaption,
    key: string,
    drawn: DrawnCaption | null,
  ): void {
    this.making = false

    if (this.closed || this.standing !== caption || this.keyNow() !== key) {
      drawn?.close()
    } else {
      this.made?.drawn.close()
      this.made = drawn ? { of: caption, key, drawn } : null
      this.paint()
    }

    if (this.wanted) {
      this.wanted = false
      this.make()
    }
  }

  private async render(
    caption: DecodedCaption,
    key: string,
  ): Promise<DrawnCaption | null> {
    if (key === AS_BROADCAST) {
      return this.asBroadcast(caption)
    }

    const restyled = await restyledCaption(
      caption.picture,
      lookOf(this.board.style),
      this.stretch(),
      this.drawnOn?.height ?? caption.picture.height,
    )

    if (!restyled) {
      return this.asBroadcast(caption)
    }

    this.letGoOfTheBroadcast(caption)

    return restyled
  }

  /** Closes the broadcast's own picture decoded on arrival, once a restyled one is drawn instead. */
  private letGoOfTheBroadcast(caption: DecodedCaption): void {
    if (caption.taken) {
      return
    }

    caption.taken = true
    void caption.bitmap.then((bitmap) => bitmap?.close())
  }

  private async asBroadcast(
    caption: DecodedCaption,
  ): Promise<DrawnCaption | null> {
    if (caption.taken) {
      return broadcastCaption(caption.picture)
    }

    caption.taken = true

    const bitmap = await caption.bitmap

    return bitmap
      ? { image: bitmap, margin: NO_MARGIN, close: () => bitmap.close() }
      : null
  }

  private follow(): void {
    if ('requestVideoFrameCallback' in this.video) {
      this.frame = this.video.requestVideoFrameCallback(() => {
        this.framed = true
        this.tick()

        if (!this.closed) {
          this.follow()
        }
      })
    }

    if (this.reading === null) {
      this.reading = setInterval(() => this.carry(), READ_MS)
    }
  }

  private carry(): void {
    if (this.framed) {
      this.framed = false

      return
    }

    this.tick()
  }

  private paint(): void {
    const context = this.canvas.getContext('2d')

    if (!context) {
      return
    }

    const box = {
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
    }
    const ratio = window.devicePixelRatio || 1
    const across = Math.round(box.width * ratio)
    const down = Math.round(box.height * ratio)

    if (this.canvas.width !== across || this.canvas.height !== down) {
      this.canvas.width = across
      this.canvas.height = down
    }

    context.clearRect(0, 0, across, down)

    if (!this.drawn) {
      this.state('off')

      return
    }

    const made = this.drawable()

    if (!made || !this.drawnOn || this.closed) {
      this.state('none')

      return
    }

    const shown =
      this.video.videoWidth > 0 && this.video.videoHeight > 0
        ? containedIn(box, {
            width: this.video.videoWidth,
            height: this.video.videoHeight,
          })
        : { left: 0, top: 0, ...box }
    const place = captionPlaced({
      shown,
      canvas: this.drawnOn,
      drawn: made.of.picture,
      margin: made.drawn.margin,
      scale: this.scale(),
      shift: this.board.style.shift,
    }).image
    const lift = this.board.liftFor(place, shown, this.canvas)
    const at = { ...place, top: place.top - lift }

    this.shown = shown
    context.drawImage(
      made.drawn.image,
      at.left * ratio,
      at.top * ratio,
      at.width * ratio,
      at.height * ratio,
    )
    this.canvas.dataset.look =
      made.key === AS_BROADCAST ? 'as-broadcast' : 'restyled'
    this.state('shown')
    this.board.placed({ image: at, shown, canvas: this.canvas })
  }

  private get drawn(): boolean {
    return this.canvas.getAttribute(DRAWN) !== 'no'
  }

  private state(state: CaptionState): void {
    this.canvas.dataset.caption = state

    if (state !== 'shown') {
      this.board.placed(null)
    }
  }
}
