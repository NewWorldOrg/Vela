import type { SkipEvent, SkipEventKind } from '@/repository/recording-segments'

/** How long after a break was skipped a seek back into it still counts as going back to it. */
export const RETURNS_WITHIN_MS = 30_000

/** How long, from where the seek back landed, a person watches before the break counts as one they went back to. */
export const WATCHED_FOR_SEC = 10

export interface Stretch {
  startsAtSec: number
  endsAtSec: number
}

/** What the player lets the page under it do: put the playhead on a second of the file it plays, and plan its chapters again. */
export interface HeardPlayer {
  seek: (second: number) => void
  replan: () => void
}

interface LastSkip extends Stretch {
  at: number
  back?: { fromSec: number; toSec: number }
}

function hundredths(second: number): number {
  return Math.round(second * 100) / 100
}

/**
 * What the player and the stretches under it share. The player says where its playhead stands on the clock of
 * the file it plays, how far the recording's own time stands ahead of that clock, and what the person did with
 * the button that skips a break; the stretches are read in the recording's own time and ask the player to seek
 * and to plan its chapters again. While no time in the recording can be placed on the file, the stretches
 * neither see the playhead nor seek, and nothing done with the button is sent.
 */
export class WatchLink {
  private position = 0

  private player: HeardPlayer | undefined

  private lastSkip: LastSkip | undefined

  private readonly listeners = new Set<() => void>()

  private offset: number | undefined

  private modelVersion: number | undefined

  private readonly note: (skip: SkipEvent) => void

  private readonly now: () => number

  constructor(
    modelVersion: number | undefined,
    note: (skip: SkipEvent) => void,
    now: () => number = Date.now,
  ) {
    this.modelVersion = modelVersion
    this.note = note
    this.now = now
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  /** The second of the recording the playhead stands at, or nothing while no player is heard or its clock is not known. */
  playhead = (): number | undefined =>
    this.player && this.offset !== undefined
      ? hundredths(this.position + this.offset)
      : undefined

  /** Whether a player is heard on a clock the stretches can be read against, so that they can seek it. */
  follows = (): boolean =>
    this.player !== undefined && this.offset !== undefined

  hear(player: HeardPlayer): () => void {
    this.player = player
    this.told()

    return () => {
      if (this.player === player) {
        this.player = undefined
        this.told()
      }
    }
  }

  standsWith(modelVersion: number | undefined): void {
    this.modelVersion = modelVersion
  }

  /** How far the recording's own time stands ahead of the file the player plays, or nothing when it cannot be placed. */
  runsBehindBy(offsetSec: number | undefined): void {
    if (offsetSec === this.offset) {
      return
    }

    this.offset = offsetSec
    this.told()
  }

  tell(second: number): void {
    if (second === this.position) {
      return
    }

    this.position = second
    this.watching(second)
    this.told()
  }

  seek(recordingSecond: number): void {
    if (!this.player || this.offset === undefined) {
      return
    }

    this.player.seek(Math.max(0, recordingSecond - this.offset))
  }

  replan(): void {
    this.player?.replan()
  }

  skippedTheBreak(fromSec: number, skipped: Stretch): void {
    this.lastSkip = {
      startsAtSec: skipped.startsAtSec,
      endsAtSec: skipped.endsAtSec,
      at: this.now(),
    }
    this.send('skipped', fromSec, skipped.endsAtSec)
  }

  leftTheBreak(atSec: number, endsAtSec: number): void {
    this.send('dismissed', atSec, endsAtSec)
  }

  sought(fromSec: number, toSec: number): void {
    const skip = this.lastSkip

    if (!skip) {
      return
    }

    if (this.now() - skip.at > RETURNS_WITHIN_MS) {
      this.lastSkip = undefined

      return
    }

    skip.back =
      skip.startsAtSec <= toSec && toSec < skip.endsAtSec
        ? { fromSec, toSec }
        : undefined
  }

  private watching(second: number): void {
    const back = this.lastSkip?.back

    if (!back || second - back.toSec < WATCHED_FOR_SEC) {
      return
    }

    this.lastSkip = undefined
    this.send('returned', back.fromSec, back.toSec)
  }

  private send(event: SkipEventKind, fromSec: number, toSec: number): void {
    const head = this.offset

    if (head === undefined) {
      return
    }

    this.note({
      event,
      kind: 'break',
      fromSec: hundredths(Math.max(0, fromSec + head)),
      toSec: hundredths(Math.max(0, toSec + head)),
      modelVersion: this.modelVersion,
    })
  }

  private told(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}
