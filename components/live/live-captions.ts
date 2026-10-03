import { CaptionQueue } from '@/lib/live-captions'
import {
  ptsSeconds,
  type CaptionCanvas,
  type CaptionPicture,
} from '@/lib/live-wire'
import { CaptionDrift } from '@/lib/live-caption-drift'
import {
  CaptionSurface,
  decodeCaption,
  type DecodedCaption,
} from '@/components/recordings/caption-surface'

export type { CaptionState } from '@/components/recordings/caption-surface'

export class CaptionLayer {
  private readonly video: HTMLVideoElement

  private readonly queue = new CaptionQueue<DecodedCaption>()

  private readonly drift = new CaptionDrift()

  private readonly surface: CaptionSurface

  private closed = false

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    this.video = video
    this.surface = new CaptionSurface(canvas, video, () => this.tick())
  }

  canvasOf(size: CaptionCanvas): void {
    this.surface.canvasOf(size)
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
      picture: picture ? decodeCaption(picture) : null,
    })
    this.tick()
  }

  drawOn(
    context: CanvasRenderingContext2D,
    size: { width: number; height: number },
  ): void {
    this.surface.drawOn(context, size)
  }

  close(): void {
    this.closed = true
    this.surface.close()
  }

  private edge(): number | null {
    const held = this.video.buffered

    return held.length > 0 ? held.end(held.length - 1) : null
  }

  private tick(): void {
    if (!this.surface.showsAPicture) {
      this.drift.adopt()
    }

    const due = this.queue.take(this.video.currentTime + this.drift.showEarlyBy)

    if (due) {
      this.surface.show(due.picture)
      this.drift.adopt()
    }
  }
}
