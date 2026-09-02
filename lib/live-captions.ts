import { ptsSeconds, type CaptionCanvas } from '@/lib/live-wire'

/**
 * One caption as it stands in line: when the clock has to reach for it to
 * show, and what to show — or, for a caption taken off, nothing.
 */
export interface CaptionCue<T> {
  pts: number
  picture: T | null
}

/**
 * The captions that have arrived and are not yet due.
 *
 * A caption is stamped with the same 90 kHz clock as the picture it belongs
 * to, and arrives about a second after that picture does — so it is not shown
 * when it arrives but when the playhead reaches its stamp. The line is kept
 * in the order of the clock, whatever order the wire delivered in, and what is
 * due is taken all at once: only the last of it is what the screen shows now,
 * and a caption whose stamp is already behind the playhead — the one a viewer
 * joining late is handed — is due the moment it arrives.
 */
export class CaptionQueue<T> {
  private readonly waiting: CaptionCue<T>[] = []

  offer(cue: CaptionCue<T>): void {
    let at = this.waiting.length

    while (at > 0 && this.waiting[at - 1].pts > cue.pts) {
      at -= 1
    }

    this.waiting.splice(at, 0, cue)
  }

  /**
   * The caption the screen shows at this second of the playhead, if that has
   * changed since the last take. Everything due is taken; the last is answered.
   */
  take(seconds: number): CaptionCue<T> | undefined {
    let last: CaptionCue<T> | undefined

    while (
      this.waiting.length > 0 &&
      ptsSeconds(this.waiting[0].pts) <= seconds
    ) {
      last = this.waiting.shift()
    }

    return last
  }

  get length(): number {
    return this.waiting.length
  }
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Size {
  left: number
  top: number
}

/**
 * Where a picture of this shape sits inside a box, kept whole and in the
 * middle — what `object-fit: contain` does to the element's picture, worked
 * out here so the captions can be laid where the picture actually is rather
 * than where the element is.
 */
export function containedIn(box: Size, picture: Size): Rect {
  if (
    box.width <= 0 ||
    box.height <= 0 ||
    picture.width <= 0 ||
    picture.height <= 0
  ) {
    return { left: 0, top: 0, width: 0, height: 0 }
  }

  const scale = Math.min(box.width / picture.width, box.height / picture.height)
  const width = picture.width * scale
  const height = picture.height * scale

  return {
    left: (box.width - width) / 2,
    top: (box.height - height) / 2,
    width,
    height,
  }
}

/**
 * Where a caption drawn on the canvas lands on the picture as shown.
 *
 * The canvas is the broadcast's own picture in pixels, and those pixels need
 * not be square: a 1440x1080 broadcast is shown 16:9. The caption was drawn on
 * that canvas, so it takes the same stretch the picture does — each axis is
 * scaled on its own, and the caption lands exactly over what it was drawn on.
 */
export function placedOn(
  shown: Rect,
  canvas: CaptionCanvas,
  drawn: Rect,
): Rect {
  const across = shown.width / canvas.width
  const down = shown.height / canvas.height

  return {
    left: shown.left + drawn.left * across,
    top: shown.top + drawn.top * down,
    width: drawn.width * across,
    height: drawn.height * down,
  }
}
