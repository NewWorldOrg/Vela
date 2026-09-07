import { ptsSeconds, type CaptionCanvas } from '@/lib/live-wire'

export interface CaptionCue<T> {
  pts: number
  picture: T | null
}

export class CaptionQueue<T> {
  private readonly waiting: CaptionCue<T>[] = []

  offer(cue: CaptionCue<T>): void {
    let at = this.waiting.length

    while (at > 0 && this.waiting[at - 1].pts > cue.pts) {
      at -= 1
    }

    this.waiting.splice(at, 0, cue)
  }

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
