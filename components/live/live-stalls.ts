import { SEEK_SETTLES_SECONDS, START_SETTLES_SECONDS } from '@/lib/live-buffer'

export interface WatchedPicture {
  readonly seeking: boolean
  addEventListener(type: string, heard: () => void): void
  removeEventListener(type: string, heard: () => void): void
}

export class LiveStalls {
  private readonly picture: WatchedPicture

  private readonly now: () => number

  private readonly onStall: () => void

  private rolling = false

  private soughtAt: number | null = null

  private firstPlayedAt: number | null = null

  private readonly heard: [string, () => void][]

  constructor(picture: WatchedPicture, now: () => number, onStall: () => void) {
    this.picture = picture
    this.now = now
    this.onStall = onStall
    this.heard = [
      ['playing', () => this.played()],
      ['pause', () => this.paused()],
      ['seeking', () => this.sought()],
      ['waiting', () => this.waited()],
    ]

    for (const [type, heard] of this.heard) {
      picture.addEventListener(type, heard)
    }
  }

  get playing(): boolean {
    return this.rolling
  }

  leave(): void {
    this.rolling = false

    for (const [type, heard] of this.heard) {
      this.picture.removeEventListener(type, heard)
    }
  }

  private played(): void {
    this.rolling = true
    this.firstPlayedAt ??= this.now()
  }

  private paused(): void {
    this.rolling = false
  }

  private sought(): void {
    this.soughtAt = this.now()
  }

  private waited(): void {
    const wasRolling = this.rolling

    this.rolling = false

    if (wasRolling && !this.picture.seeking && this.settled()) {
      this.onStall()
    }
  }

  private settled(): boolean {
    const at = this.now()

    return (
      this.firstPlayedAt !== null &&
      at - this.firstPlayedAt >= START_SETTLES_SECONDS * 1000 &&
      (this.soughtAt === null ||
        at - this.soughtAt >= SEEK_SETTLES_SECONDS * 1000)
    )
  }
}
