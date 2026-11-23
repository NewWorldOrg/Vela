import {
  LATE_START_SECONDS,
  OVERDUE_BEHIND_SECONDS,
  OVERDUE_START_SECONDS,
} from '@/lib/live-buffer'

const HAVE_METADATA = 1

const ROUNDING_SECONDS = 0.001

export interface LiveBuffered {
  start(): number | undefined
  pictureFrom(): number | undefined
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

  private picturedSince: number | null = null

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
      end <= start
    ) {
      return
    }

    const at = this.now()
    const target = this.target()

    this.heldSince ??= at

    if (at - this.heldSince >= (target + OVERDUE_START_SECONDS) * 1000) {
      this.begin(
        Math.max(start, end - Math.max(target, OVERDUE_BEHIND_SECONDS)),
      )

      return
    }

    const from = this.buffered.pictureFrom()

    if (
      from === undefined ||
      end <= from ||
      this.picture.readyState < HAVE_METADATA
    ) {
      return
    }

    this.picturedSince ??= at

    if (
      end - from + ROUNDING_SECONDS >= target ||
      at - this.picturedSince >= (target + LATE_START_SECONDS) * 1000
    ) {
      this.begin(Math.max(from, end - target))
    }
  }

  private begin(at: number): void {
    this.begun = true
    this.picture.currentTime = at
    void this.picture.play().catch(this.onRefused)
  }
}
