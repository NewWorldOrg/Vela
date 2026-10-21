import type { SkipEvent, SkipEventKind } from '@/repository/recording-segments'
import type { SkippableKind } from '@/repository/videos'

/** How long after a stretch was skipped a seek back into it still counts as going back to it. */
export const RETURNS_WITHIN_MS = 30_000

/** How long, from where the seek back landed, a person watches before the stretch counts as one they went back to. */
export const WATCHED_FOR_SEC = 10

export interface Stretch {
  startsAtSec: number
  endsAtSec: number
  kind: SkippableKind
}

interface LastSkip {
  stretches: readonly [Stretch, ...Stretch[]]
  startsAtSec: number
  endsAtSec: number
  at: number
  back?: { fromSec: number; toSec: number }
}

function hundredths(second: number): number {
  return Math.round(second * 100) / 100
}

function kindAt(second: number, skip: LastSkip): SkippableKind {
  const landed = skip.stretches.find(
    (one) => one.startsAtSec <= second && second < one.endsAtSec,
  )

  return (landed ?? skip.stretches[0]).kind
}

/**
 * What a person did with the button that skips a break, an opening or an ending, sent in the recording's own time.
 * The player says where its playhead stands on the clock of the file it plays, how far the recording's own time
 * stands ahead of that clock, and when the button was pressed or closed; a seek back into a stretch skipped moments
 * before counts once the person has watched there for a while. While no time in the recording can be placed on the
 * file, nothing is sent.
 */
export class SkipEvents {
  private lastSkip: LastSkip | undefined

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

  standsWith(modelVersion: number | undefined): void {
    this.modelVersion = modelVersion
  }

  /** How far the recording's own time stands ahead of the file the player plays, or nothing when it cannot be placed. */
  runsBehindBy(offsetSec: number | undefined): void {
    this.offset = offsetSec
  }

  tell(second: number): void {
    const skip = this.lastSkip
    const back = skip?.back

    if (!skip || !back || second - back.toSec < WATCHED_FOR_SEC) {
      return
    }

    this.lastSkip = undefined
    this.send('returned', kindAt(back.toSec, skip), back.fromSec, back.toSec)
  }

  /** One press that skipped stretches following one another, each sent on its own. */
  skippedTheRun(
    fromSec: number,
    skipped: readonly [Stretch, ...Stretch[]],
  ): void {
    this.lastSkip = {
      stretches: skipped,
      startsAtSec: skipped[0].startsAtSec,
      endsAtSec: skipped[skipped.length - 1].endsAtSec,
      at: this.now(),
    }
    skipped.forEach((one, index) => {
      this.send(
        'skipped',
        one.kind,
        index === 0 ? fromSec : one.startsAtSec,
        one.endsAtSec,
      )
    })
  }

  leftTheStretch(atSec: number, left: Stretch): void {
    this.send('dismissed', left.kind, atSec, left.endsAtSec)
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

  private send(
    event: SkipEventKind,
    kind: SkippableKind,
    fromSec: number,
    toSec: number,
  ): void {
    const head = this.offset

    if (head === undefined) {
      return
    }

    this.note({
      event,
      kind,
      fromSec: hundredths(Math.max(0, fromSec + head)),
      toSec: hundredths(Math.max(0, toSec + head)),
      modelVersion: this.modelVersion,
    })
  }
}
