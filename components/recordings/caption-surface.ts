import { containedIn, placedOn } from '@/lib/caption-placement'
import type { CaptionCanvas, CaptionPicture } from '@/lib/live-wire'

export type CaptionState = 'none' | 'shown' | 'off'

export interface DecodedCaption {
  picture: CaptionPicture
  bitmap: Promise<ImageBitmap | null>
}

const READ_MS = 100

const DRAWN = 'data-drawn'

export function decodeCaption(picture: CaptionPicture): DecodedCaption {
  return {
    picture,
    bitmap: createImageBitmap(
      new Blob([picture.png.slice()], { type: 'image/png' }),
    ).catch(() => null),
  }
}

/** The canvas laid over a video that draws one broadcast caption at a time inside the picture's own rectangle. */
export class CaptionSurface {
  private readonly canvas: HTMLCanvasElement

  private readonly video: HTMLVideoElement

  private readonly tick: () => void

  private drawnOn: CaptionCanvas | null = null

  private standing: DecodedCaption | null = null

  private bitmap: ImageBitmap | null = null

  private closed = false

  private frame: number | null = null

  private reading: ReturnType<typeof setInterval> | null = null

  private framed = false

  private readonly watching: ResizeObserver | null

  private readonly minding: MutationObserver

  private readonly repaint = () => this.paint()

  constructor(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    tick: () => void,
  ) {
    this.canvas = canvas
    this.video = video
    this.tick = tick
    this.watching =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(this.repaint)
    this.watching?.observe(canvas)
    this.minding = new MutationObserver(this.repaint)
    this.minding.observe(canvas, { attributeFilter: [DRAWN] })
    video.addEventListener('resize', this.repaint)
    this.follow()
    this.paint()
  }

  canvasOf(size: CaptionCanvas): void {
    this.drawnOn = size
    this.paint()
  }

  get showsAPicture(): boolean {
    return this.standing !== null
  }

  show(caption: DecodedCaption | null): void {
    this.bitmap?.close()
    this.bitmap = null
    this.standing = caption

    if (!caption) {
      this.paint()

      return
    }

    void caption.bitmap.then((bitmap) => {
      if (this.standing !== caption || this.closed) {
        bitmap?.close()

        return
      }

      this.bitmap = bitmap
      this.paint()
    })
  }

  drawOn(
    context: CanvasRenderingContext2D,
    size: { width: number; height: number },
  ): void {
    const standing = this.standing?.picture

    if (
      !this.drawn ||
      !standing ||
      !this.bitmap ||
      !this.drawnOn ||
      this.closed
    ) {
      return
    }

    const place = placedOn({ left: 0, top: 0, ...size }, this.drawnOn, standing)

    context.drawImage(
      this.bitmap,
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
    this.video.removeEventListener('resize', this.repaint)

    if (this.frame !== null && 'cancelVideoFrameCallback' in this.video) {
      this.video.cancelVideoFrameCallback(this.frame)
    }

    if (this.reading !== null) {
      clearInterval(this.reading)
    }

    this.bitmap?.close()
    this.bitmap = null
    this.standing = null
    this.paint()
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

    // A backgrounded tab gets no requestVideoFrameCallback; the sound plays on.
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

    const standing = this.standing?.picture

    if (!standing || !this.bitmap || !this.drawnOn || this.closed) {
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
    const place = placedOn(shown, this.drawnOn, standing)

    context.drawImage(
      this.bitmap,
      place.left * ratio,
      place.top * ratio,
      place.width * ratio,
      place.height * ratio,
    )
    this.state('shown')
  }

  private get drawn(): boolean {
    return this.canvas.getAttribute(DRAWN) !== 'no'
  }

  private state(state: CaptionState): void {
    this.canvas.dataset.caption = state
  }
}
