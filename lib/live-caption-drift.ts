export const WINDOW = 24

export const SETTLE = 12

export const STEP_SECONDS = 0.35

export const AFRESH_SECONDS = 4

function middleOf(readings: readonly number[]): number | null {
  if (readings.length < SETTLE) {
    return null
  }

  const sorted = [...readings].sort((first, second) => first - second)
  const half = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[half - 1] + sorted[half]) / 2
    : sorted[half]
}

export class CaptionDrift {
  private readonly readings: number[] = []

  private datum: number | null = null

  private lastEdge: number | null = null

  private held = 0

  private staged = 0

  // One instant gives both readings; an edge read later is another number.
  saw(stamp: number, edge: number): void {
    if (this.lastEdge !== null && edge + AFRESH_SECONDS < this.lastEdge) {
      this.reset()
    }

    this.lastEdge = edge
    this.readings.push(stamp - edge)

    if (this.readings.length > WINDOW) {
      this.readings.shift()
    }

    const reading = middleOf(this.readings)

    if (reading === null) {
      return
    }

    if (this.datum === null) {
      this.datum = reading

      return
    }

    const wanted = reading - this.datum

    this.staged =
      Math.abs(wanted - this.held) >= STEP_SECONDS ? wanted : this.held
  }

  adopt(): void {
    this.held = this.staged
  }

  reset(): void {
    this.readings.length = 0
    this.datum = null
    this.lastEdge = null
    this.held = 0
    this.staged = 0
  }

  get showEarlyBy(): number {
    return this.held
  }

  get pending(): number {
    return this.staged
  }
}
