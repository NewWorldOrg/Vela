import {
  firstPictureAt,
  pictureTrackOf,
  type PictureTrack,
} from '@/lib/live-fragment'
import { pictureFromOf, type LiveRun } from '@/lib/live-latency'

export class LivePictures {
  private track: PictureTrack | null = null

  private readonly starts: number[] = []

  get kept(): number {
    return this.starts.length
  }

  header(init: Uint8Array): void {
    try {
      this.track ??= pictureTrackOf(init)
    } catch {}
  }

  fragment(bytes: Uint8Array, oldestHeld: number | undefined): void {
    const at = this.readIn(bytes)

    if (at === undefined || !Number.isFinite(at)) {
      return
    }

    this.starts.push(at)

    while (
      oldestHeld !== undefined &&
      this.starts.length > 1 &&
      this.starts[1] <= oldestHeld
    ) {
      this.starts.shift()
    }
  }

  fromOf(runs: readonly LiveRun[]): number | undefined {
    return pictureFromOf(runs, this.starts)
  }

  private readIn(bytes: Uint8Array): number | undefined {
    try {
      return this.track ? firstPictureAt(bytes, this.track) : undefined
    } catch {
      return undefined
    }
  }
}
