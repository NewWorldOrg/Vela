import { ptsSeconds } from '@/lib/live-wire'

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
