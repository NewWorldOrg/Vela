import { updatesOf, type MngAnimation, type MngUpdate } from '@/lib/bml/mng'

/** How many frames of no delay are drawn at once before the page is let through. */
export const MOST_UPDATES_AT_ONCE = 64

/** How long frames are worked out and drawn at once before the page is let through. */
export const MOST_MS_AT_ONCE = 8

const LEAST_DELAY_MS = 10

const MOST_DELAY_MS = 0x7fffffff

/** A decoded picture the player lets go of once it is done with it. */
export interface MngBitmap {
  close(): void
}

/** The part of a canvas's 2D context the player draws with. */
export interface MngSurface<B extends MngBitmap> {
  clearRect(x: number, y: number, width: number, height: number): void
  save(): void
  restore(): void
  beginPath(): void
  rect(x: number, y: number, width: number, height: number): void
  clip(): void
  drawImage(image: B, x: number, y: number): void
}

export interface MngCanvas<B extends MngBitmap> {
  width: number
  height: number
  readonly isConnected: boolean
  getContext(kind: '2d'): MngSurface<B> | null
}

/** What the player asks of the frame it runs in. */
export interface MngHost<B extends MngBitmap> {
  decode(png: Uint8Array): Promise<B>
  setTimeout(run: () => void, ms: number): number
  clearTimeout(id: number): void
  warn(message: string): void
  now(): number
}

/** How many pixels an MNG holds once it plays: its canvas, at the size of its frame, and its pictures decoded. */
export function pixelsHeld(mng: MngAnimation): number {
  return mng.width * mng.height + mng.pixels
}

/** Plays an MNG on a canvas: decodes every picture first, then draws the frames in order for as long as each says, and lets go of the pictures once it ends, is stopped, or finds its canvas gone from the document. */
export class MngPlayer<B extends MngBitmap> {
  private readonly canvas: MngCanvas<B>

  private readonly mng: MngAnimation

  private readonly host: MngHost<B>

  private readonly updates: Iterator<MngUpdate>

  private surface: MngSurface<B> | null = null

  private bitmaps: B[] = []

  private timer: number | null = null

  private stopped = false

  constructor(canvas: MngCanvas<B>, mng: MngAnimation, host: MngHost<B>) {
    this.canvas = canvas
    this.mng = mng
    this.host = host
    this.updates = updatesOf(mng)
  }

  get playing(): boolean {
    return !this.stopped
  }

  /** How many pixels it holds: its canvas and its pictures decoded. */
  get pixels(): number {
    return pixelsHeld(this.mng)
  }

  play(): void {
    this.canvas.width = this.mng.width
    this.canvas.height = this.mng.height

    const surface = this.canvas.getContext('2d')

    if (!surface) {
      this.host.warn('no canvas to draw an MNG on')
      this.stop()

      return
    }

    void Promise.allSettled(
      this.mng.images.map(async (image) => this.host.decode(image.png)),
    ).then((settled) => this.decoded(surface, settled))
  }

  stop(): void {
    if (this.stopped) {
      return
    }

    this.stopped = true

    if (this.timer !== null) {
      this.host.clearTimeout(this.timer)
      this.timer = null
    }

    this.bitmaps.forEach((bitmap) => bitmap.close())
    this.bitmaps = []
  }

  private decoded(
    surface: MngSurface<B>,
    settled: PromiseSettledResult<B>[],
  ): void {
    const bitmaps = settled.flatMap((each) =>
      each.status === 'fulfilled' ? [each.value] : [],
    )

    if (this.stopped || bitmaps.length < settled.length) {
      bitmaps.forEach((bitmap) => bitmap.close())

      if (!this.stopped) {
        this.host.warn('an MNG image that does not decode')
        this.stop()
      }

      return
    }

    this.surface = surface
    this.bitmaps = bitmaps
    this.next()
  }

  private next(): void {
    this.timer = null

    if (this.stopped) {
      return
    }

    if (!this.canvas.isConnected) {
      this.stop()

      return
    }

    const began = this.host.now()

    for (
      let drawn = 0;
      drawn < MOST_UPDATES_AT_ONCE && this.host.now() - began < MOST_MS_AT_ONCE;
      drawn += 1
    ) {
      const update = this.updates.next()

      if (update.done) {
        this.stop()

        return
      }

      this.paint(update.value)

      if (update.value.delayMs > 0) {
        this.wait(update.value.delayMs)

        return
      }
    }

    this.wait(LEAST_DELAY_MS)
  }

  private wait(ms: number): void {
    this.timer = this.host.setTimeout(
      () => this.next(),
      Math.min(MOST_DELAY_MS, Math.max(LEAST_DELAY_MS, Math.round(ms))),
    )
  }

  private paint(update: MngUpdate): void {
    const surface = this.surface

    if (!surface) {
      return
    }

    if (update.clear) {
      surface.clearRect(0, 0, this.mng.width, this.mng.height)
    }

    update.draws.forEach(({ image, x, y, clip }) => {
      if (clip.right <= clip.left || clip.bottom <= clip.top) {
        return
      }

      surface.save()
      surface.beginPath()
      surface.rect(
        clip.left,
        clip.top,
        clip.right - clip.left,
        clip.bottom - clip.top,
      )
      surface.clip()
      surface.drawImage(this.bitmaps[image], x, y)
      surface.restore()
    })
  }
}
