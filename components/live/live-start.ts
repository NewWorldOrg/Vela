import { targetOf } from '@/lib/live-latency'

export interface LiveBuffered {
  start(): number | undefined
  end(): number | undefined
}

export interface LivePlayhead {
  currentTime: number
  play(): Promise<void>
}

/** Plays a live picture from the target behind the edge, the first time it is checked with that much buffered. */
export class LiveStart {
  private readonly picture: LivePlayhead

  private readonly buffered: LiveBuffered

  private readonly onRefused: () => void

  private begun = false

  constructor(
    picture: LivePlayhead,
    buffered: LiveBuffered,
    onRefused: () => void,
  ) {
    this.picture = picture
    this.buffered = buffered
    this.onRefused = onRefused
  }

  get started(): boolean {
    return this.begun
  }

  check(): void {
    const start = this.buffered.start()
    const end = this.buffered.end()

    if (
      this.begun ||
      start === undefined ||
      end === undefined ||
      end - start < targetOf(0)
    ) {
      return
    }

    this.begun = true
    this.picture.currentTime = Math.max(start, end - targetOf(0))
    void this.picture.play().catch(this.onRefused)
  }
}
