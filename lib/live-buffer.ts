export const LIVE_BUFFER_COOKIE = 'vela-live-buffer'

export const START_BUFFER_SECONDS = 0.2

export const BUFFER_CEILING_SECONDS = 3

export const BUFFER_STEPS_SECONDS: readonly number[] = [
  START_BUFFER_SECONDS,
  0.4,
  0.6,
  1,
  1.5,
  2,
  BUFFER_CEILING_SECONDS,
]

export const SAME_STALL_SECONDS = 10

export const CALM_SECONDS = 1800

export const LATE_START_SECONDS = 1

export const SEEK_SETTLES_SECONDS = 1

export function raisedFrom(seconds: number): number {
  return (
    BUFFER_STEPS_SECONDS.find((step) => step > seconds) ??
    BUFFER_CEILING_SECONDS
  )
}

export function loweredFrom(seconds: number): number {
  return (
    BUFFER_STEPS_SECONDS.findLast((step) => step < seconds) ??
    START_BUFFER_SECONDS
  )
}

export function liveBufferOf(said: string | null | undefined): number {
  const seconds = Number(said)

  if (!said || !Number.isFinite(seconds)) {
    return START_BUFFER_SECONDS
  }

  return (
    BUFFER_STEPS_SECONDS.find((step) => step >= seconds) ??
    BUFFER_CEILING_SECONDS
  )
}

export function liveBufferSpelling(seconds: number): string {
  return String(seconds)
}

export class LiveBuffer {
  private readonly now: () => number

  private readonly remember: (seconds: number) => void

  private held: number

  private calm = 0

  private raisedAt: number | null = null

  constructor(
    seconds: number,
    now: () => number,
    remember: (seconds: number) => void,
  ) {
    this.held = seconds
    this.now = now
    this.remember = remember
  }

  get seconds(): number {
    return this.held
  }

  stalled(): void {
    const at = this.now()

    this.calm = 0

    if (
      this.raisedAt !== null &&
      at - this.raisedAt < SAME_STALL_SECONDS * 1000
    ) {
      return
    }

    this.raisedAt = at
    this.hold(raisedFrom(this.held))
  }

  played(seconds: number): void {
    this.calm += seconds

    if (this.calm < CALM_SECONDS) {
      return
    }

    this.calm = 0
    this.hold(loweredFrom(this.held))
  }

  private hold(seconds: number): void {
    if (seconds === this.held) {
      return
    }

    this.held = seconds
    this.remember(seconds)
  }
}
