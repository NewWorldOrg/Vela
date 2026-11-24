import {
  BLIND_START_SECONDS,
  LATE_START_SECONDS,
  OVERDUE_START_SECONDS,
  startHoldOf,
} from '@/lib/live-buffer'
import { TOLERANCE_SECONDS } from '@/lib/live-latency'

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

  private putAt: number | null = null

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
    const from = this.buffered.pictureFrom()

    this.heldSince ??= at

    if (this.blindly(at, target, from, end - start)) {
      this.put(Math.max(start, end - Math.max(target, BLIND_START_SECONDS)))
      this.begin()

      return
    }

    if (
      from === undefined ||
      end <= from ||
      this.picture.readyState < HAVE_METADATA
    ) {
      return
    }

    this.picturedSince ??= at
    this.putAt ??= this.put(
      end - from <= target + TOLERANCE_SECONDS ? from : end - target,
    )

    if (
      end - this.putAt + ROUNDING_SECONDS >= startHoldOf(target) ||
      at - this.picturedSince >= (target + LATE_START_SECONDS) * 1000
    ) {
      this.begin()
    }
  }

  private blindly(
    at: number,
    target: number,
    from: number | undefined,
    held: number,
  ): boolean {
    const overdue =
      this.heldSince !== null &&
      at - this.heldSince >= (target + OVERDUE_START_SECONDS) * 1000
    const unseen =
      from === undefined &&
      this.putAt === null &&
      held + ROUNDING_SECONDS >= Math.max(target, BLIND_START_SECONDS)

    return overdue || unseen
  }

  private put(at: number): number {
    this.picture.currentTime = at

    return at
  }

  private begin(): void {
    this.begun = true
    void this.picture.play().catch(this.onRefused)
  }
}
