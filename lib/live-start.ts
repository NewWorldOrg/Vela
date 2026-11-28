import { targetOf } from '@/lib/live-latency'

export interface LiveBuffered {
  start(): number | undefined
  end(): number | undefined
}

export interface LivePlayhead {
  currentTime: number
  play(): Promise<void>
}

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

type StillHeard = 'playing' | 'timeupdate'

export interface StillScreen {
  currentTime: number
  addEventListener(type: StillHeard, listener: () => void): void
  removeEventListener(type: StillHeard, listener: () => void): void
  requestVideoFrameCallback?(callback: () => void): number
  cancelVideoFrameCallback?(handle: number): void
}

export interface StillAddresses {
  make(jpeg: Uint8Array): string
  free(href: string): void
}

const OBJECT_URLS: StillAddresses = {
  make: (jpeg) =>
    URL.createObjectURL(new Blob([jpeg.slice()], { type: 'image/jpeg' })),
  free: (href) => URL.revokeObjectURL(href),
}

export class LiveStill {
  private readonly screen: StillScreen

  private readonly onShown: (href: string | null) => void

  private readonly addresses: StillAddresses

  private href: string | null = null

  private offered = false

  private over = false

  private frame: number | null = null

  private playedFrom: number | null = null

  constructor(
    screen: StillScreen,
    onShown: (href: string | null) => void,
    addresses: StillAddresses = OBJECT_URLS,
  ) {
    this.screen = screen
    this.onShown = onShown
    this.addresses = addresses

    if (screen.requestVideoFrameCallback) {
      this.frame = screen.requestVideoFrameCallback(this.presented)
    } else {
      screen.addEventListener('playing', this.playing)
      screen.addEventListener('timeupdate', this.moved)
    }
  }

  offer(jpeg: Uint8Array): void {
    if (this.over || this.offered) {
      return
    }

    this.offered = true
    this.href = this.addresses.make(jpeg)
    this.onShown(this.href)
  }

  close(): void {
    if (this.over) {
      return
    }

    this.over = true

    if (this.frame !== null) {
      this.screen.cancelVideoFrameCallback?.(this.frame)
      this.frame = null
    }

    this.screen.removeEventListener('playing', this.playing)
    this.screen.removeEventListener('timeupdate', this.moved)

    if (this.href !== null) {
      this.addresses.free(this.href)
      this.href = null
      this.onShown(null)
    }
  }

  private readonly presented = () => {
    this.frame = null
    this.close()
  }

  private readonly playing = () => {
    this.playedFrom = this.screen.currentTime
  }

  private readonly moved = () => {
    if (this.playedFrom !== null && this.screen.currentTime > this.playedFrom) {
      this.close()
    }
  }
}
