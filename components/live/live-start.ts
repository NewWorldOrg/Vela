import { LATE_START_SECONDS } from '@/lib/live-buffer'

const HAVE_METADATA = 1

const ROUNDING_SECONDS = 0.001

export interface LiveBuffered {
  start(): number | undefined
  end(): number | undefined
}

export interface LivePlayhead {
  currentTime: number
  readonly readyState: number
  play(): Promise<void>
}

export class LiveStart {
  private readonly picture: LivePlayhead

  private readonly buffered: LiveBuffered

  private readonly target: () => number

  private readonly now: () => number

  private readonly onRefused: () => void

  private begun = false

  private heldSince: number | null = null

  constructor(
    picture: LivePlayhead,
    buffered: LiveBuffered,
    target: () => number,
    now: () => number,
    onRefused: () => void,
  ) {
    this.picture = picture
    this.buffered = buffered
    this.target = target
    this.now = now
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
      end <= start ||
      this.picture.readyState < HAVE_METADATA
    ) {
      return
    }

    const target = this.target()

    if (end - start + ROUNDING_SECONDS < target && !this.waitedOut(target)) {
      return
    }

    this.begun = true
    this.picture.currentTime = Math.max(start, end - target)
    void this.picture.play().catch(this.onRefused)
  }

  private waitedOut(target: number): boolean {
    const at = this.now()

    this.heldSince ??= at

    return at - this.heldSince >= (target + LATE_START_SECONDS) * 1000
  }
}
