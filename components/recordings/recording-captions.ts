import {
  captionAt,
  extended,
  timelineOf,
  whatTheCaptionsNeed,
  type CaptionTimeline,
  type TimedCaption,
} from '@/lib/recording-captions'
import type { CaptionWindowRead } from '@/repository/video-captions'
import {
  CaptionSurface,
  decodeCaption,
} from '@/components/recordings/caption-surface'

export type CaptionClock = () => number | null

export type ReadCaptionWindow = (
  fromSec: number,
  signal: AbortSignal,
) => Promise<CaptionWindowRead>

export const RESTS_AFTER_A_REFUSAL_MS = 10_000

interface Asking {
  fromSec: number
  anew: boolean
  abort: AbortController
}

/** A recording's captions, looked up by the second of the picture on screen and read ahead ten minutes at a time. */
export class RecordingCaptions {
  private readonly clock: CaptionClock

  private readonly read: ReadCaptionWindow

  private readonly surface: CaptionSurface

  private timeline: CaptionTimeline | null = null

  private standing: TimedCaption | null = null

  private asking: Asking | null = null

  private restsUntil = 0

  private none = false

  private closed = false

  constructor(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    clock: CaptionClock,
    read: ReadCaptionWindow,
  ) {
    this.clock = clock
    this.read = read
    this.surface = new CaptionSurface(canvas, video, () => this.tick())
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
    this.asking?.abort.abort()
    this.asking = null
    this.surface.close()
  }

  private tick(): void {
    const second = this.clock()

    if (second === null || this.closed || this.none) {
      return
    }

    const need = whatTheCaptionsNeed(
      this.timeline,
      second,
      this.asking?.fromSec,
    )

    if (need.need === 'anew' || need.need === 'wait') {
      this.stand(null)

      if (need.need === 'anew') {
        this.ask(need.fromSec, true)
      }

      return
    }

    if (this.asking?.anew) {
      this.drop()
    }

    if (need.need === 'ahead') {
      this.ask(need.fromSec, false)
    }

    this.stand(this.timeline ? captionAt(this.timeline, second) : null)
  }

  private stand(cue: TimedCaption | null): void {
    if (cue === this.standing) {
      return
    }

    this.standing = cue
    this.surface.show(cue?.picture ? decodeCaption(cue.picture) : null)
  }

  private drop(): void {
    this.asking?.abort.abort()
    this.asking = null
  }

  private ask(fromSec: number, anew: boolean): void {
    if (Date.now() < this.restsUntil) {
      return
    }

    this.drop()

    const asked: Asking = { fromSec, anew, abort: new AbortController() }

    this.asking = asked

    void this.read(fromSec, asked.abort.signal)
      .catch((error: unknown): CaptionWindowRead => {
        if (!asked.abort.signal.aborted) {
          console.warn('[captions] the captions were not read', error)
        }

        return { state: 'failed' }
      })
      .then((answer) => this.heard(asked, answer))
  }

  private heard(asked: Asking, answer: CaptionWindowRead): void {
    if (this.asking !== asked || this.closed) {
      return
    }

    this.asking = null

    if (answer.state === 'none') {
      this.none = true
      this.stand(null)

      return
    }

    if (answer.state !== 'read') {
      this.restsUntil = Date.now() + RESTS_AFTER_A_REFUSAL_MS

      return
    }

    this.surface.canvasOf(answer.window.canvas)
    this.timeline =
      asked.anew || this.timeline === null
        ? timelineOf(answer.window, asked.fromSec)
        : extended(this.timeline, answer.window, asked.fromSec)
    this.tick()
  }
}
