import {
  CaptionQueue,
  containedIn,
  placedOn,
  type CaptionCue,
} from '@/lib/live-captions'
import {
  ptsSeconds,
  type CaptionCanvas,
  type CaptionPicture,
} from '@/lib/live-wire'
import { CaptionDrift } from '@/lib/live-caption-drift'

export type CaptionState = 'none' | 'shown' | 'off'

interface Decoding {
  picture: CaptionPicture
  bitmap: Promise<ImageBitmap | null>
}

const READ_MS = 100

const DRAWN = 'data-drawn'

function decode(png: Uint8Array): Promise<ImageBitmap | null> {
  return createImageBitmap(
    new Blob([png.slice()], { type: 'image/png' }),
  ).catch(() => null)
}

export class CaptionLayer {
  private readonly canvas: HTMLCanvasElement

  private readonly video: HTMLVideoElement

  private readonly queue = new CaptionQueue<Decoding>()

  private readonly drift = new CaptionDrift()

  private drawnOn: CaptionCanvas | null = null

  private current: CaptionCue<Decoding> | null = null

  private bitmap: ImageBitmap | null = null

  private closed = false

  private frame: number | null = null

  private reading: ReturnType<typeof setInterval> | null = null

  private framed = false

  private readonly watching: ResizeObserver | null

  private readonly minding: MutationObserver

  private readonly repaint = () => this.paint()

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    this.canvas = canvas
    this.video = video
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

  offer(picture: CaptionPicture | null, pts: number): void {
    if (this.closed) {
      return
    }

    const edge = this.edge()

    if (edge !== null) {
      this.drift.saw(ptsSeconds(pts), edge)
    }

    this.queue.offer({
      pts,
      picture: picture ? { picture, bitmap: decode(picture.png) } : null,
    })
    this.tick()
  }

  drawOn(
    context: CanvasRenderingContext2D,
    size: { width: number; height: number },
  ): void {
    const standing = this.current?.picture?.picture

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
    this.current = null
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

  private edge(): number | null {
    const held = this.video.buffered

    return held.length > 0 ? held.end(held.length - 1) : null
  }

  private tick(): void {
    if (!this.current?.picture) {
      this.drift.adopt()
    }

    const due = this.queue.take(this.video.currentTime + this.drift.showEarlyBy)

    if (due) {
      this.stand(due)
      this.drift.adopt()
    }
  }

  private stand(cue: CaptionCue<Decoding>): void {
    this.bitmap?.close()
    this.bitmap = null
    this.current = cue

    if (!cue.picture) {
      this.paint()

      return
    }

    void cue.picture.bitmap.then((bitmap) => {
      if (this.current !== cue || this.closed) {
        bitmap?.close()

        return
      }

      this.bitmap = bitmap
      this.paint()
    })
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

    const standing = this.current?.picture?.picture

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
