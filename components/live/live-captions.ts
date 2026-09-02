import {
  CaptionQueue,
  containedIn,
  placedOn,
  type CaptionCue,
} from '@/lib/live-captions'
import type { CaptionCanvas, CaptionPicture } from '@/lib/live-wire'

/** What the layer has on it, written on the element for whoever reads the screen. */
export type CaptionState = 'none' | 'shown' | 'off'

/** A caption with its PNG being turned into something the canvas can draw. */
interface Decoding {
  picture: CaptionPicture
  bitmap: Promise<ImageBitmap | null>
}

/** How often the clock is read where the browser cannot say when a frame is shown. */
const READ_MS = 100

function decode(png: Uint8Array): Promise<ImageBitmap | null> {
  return createImageBitmap(
    new Blob([png.slice()], { type: 'image/png' }),
  ).catch(() => null)
}

/**
 * The captions, laid over the picture on a canvas of their own.
 *
 * Each caption arrives as a PNG placed on the broadcast's canvas, stamped with
 * the picture's own clock, and is decoded as it arrives; it is shown when the
 * playhead reaches its stamp, which the browser says frame by frame where it
 * can and is asked every tenth of a second where it cannot. The canvas is laid
 * where the picture is shown — not where the element is — and stretched as
 * the picture is, so a caption lands over what it was drawn on. Until the
 * element has a picture, the whole box — 16:9, as the broadcast is shown —
 * stands in for it.
 *
 * Switching the captions off stops the drawing and nothing else: what arrives
 * keeps standing in line, so switching them back on shows what is showing now.
 */
export class CaptionLayer {
  private readonly queue = new CaptionQueue<Decoding>()

  private drawnOn: CaptionCanvas | null = null

  /** The caption that stands now, whether or not it is drawn. */
  private current: CaptionCue<Decoding> | null = null

  private bitmap: ImageBitmap | null = null

  private on = true

  private closed = false

  private frame: number | null = null

  private reading: ReturnType<typeof setInterval> | null = null

  private readonly watching: ResizeObserver | null

  private readonly repaint = () => this.paint()

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly video: HTMLVideoElement,
  ) {
    this.watching =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(this.repaint)
    this.watching?.observe(canvas)
    video.addEventListener('resize', this.repaint)
    this.follow()
    this.paint()
  }

  /** The canvas the captions are drawn on, which every placement is read against. */
  canvasOf(size: CaptionCanvas): void {
    this.drawnOn = size
    this.paint()
  }

  /** A caption for this stamp on, or nothing for one taken off. */
  offer(picture: CaptionPicture | null, pts: number): void {
    if (this.closed) {
      return
    }

    this.queue.offer({
      pts,
      picture: picture ? { picture, bitmap: decode(picture.png) } : null,
    })
    this.tick()
  }

  show(on: boolean): void {
    this.on = on
    this.paint()
  }

  close(): void {
    this.closed = true
    this.watching?.disconnect()
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
        this.tick()

        if (!this.closed) {
          this.follow()
        }
      })

      return
    }

    this.reading = setInterval(() => this.tick(), READ_MS)
  }

  private tick(): void {
    const due = this.queue.take(this.video.currentTime)

    if (due) {
      this.stand(due)
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

    if (!this.on) {
      this.state('off')

      return
    }

    const drawn = this.current?.picture?.picture

    if (!drawn || !this.bitmap || !this.drawnOn || this.closed) {
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
    const place = placedOn(shown, this.drawnOn, drawn)

    context.drawImage(
      this.bitmap,
      place.left * ratio,
      place.top * ratio,
      place.width * ratio,
      place.height * ratio,
    )
    this.state('shown')
  }

  private state(state: CaptionState): void {
    this.canvas.dataset.caption = state
  }
}
