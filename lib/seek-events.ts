import { RETURNS_WITHIN_MS, WATCHED_FOR_SEC } from '@/lib/skip-events'
import type { SeekEvent, SeekMeans } from '@/repository/recording-segments'

/** How close one step forward follows the one before for the two to be one seek. */
export const STEPS_JOIN_WITHIN_MS = 3_000

const STEPPING: readonly SeekMeans[] = ['step', 'key']

/**
 * How far either way of where it was sent a landing made each way may lie, as learning reads it. Coming back to within
 * that of where a seek forward landed puts right a seek that went a little too far, and is no coming back.
 */
export const LANDING_REACH_SEC: Readonly<Record<SeekMeans, number>> = {
  bar: 8,
  key: 8,
  step: 10,
  chapter: 2,
}

interface Run {
  means: SeekMeans
  fromSec: number
  toSec: number
  lastAt: number
  cancel: () => void
}

/** Runs something once after a while, and gives back what calls it off. */
export type Later = (run: () => void, ms: number) => () => void

const afterAWhile: Later = (run, ms) => {
  const timer = setTimeout(run, ms)

  return () => clearTimeout(timer)
}

interface Jump {
  means: SeekMeans
  fromSec: number
  toSec: number
  at: number
  back?: { means: SeekMeans; fromSec: number; toSec: number }
}

function hundredths(second: number): number {
  return Math.round(second * 100) / 100
}

/**
 * The seeks a person makes in one recording, sent in the recording's own time. A seek forward is sent as soon as it is
 * made, but steps forward that follow one another within {@link STEPS_JOIN_WITHIN_MS} are held and sent as one, from
 * where the first started to where the last landed, once that long passes after the last, another seek is made or the
 * player goes away; when the page is hidden they are sent at once, the way that outlives the page. Seeking back into
 * what a seek forward passed moments before, short of the reach of where it landed ({@link LANDING_REACH_SEC}), counts
 * once the person has watched there for a while, as it does after the skip button. Nothing is sent while the player
 * plays faster than as broadcast, for a jump the skip button made, or while no time in the recording can be placed on
 * the file.
 */
export class SeekEvents {
  private run: Run | undefined

  private lastJump: Jump | undefined

  private offset: number | undefined

  private rate = 1

  private readonly note: (seek: SeekEvent, whileLeaving: boolean) => void

  private readonly now: () => number

  private readonly later: Later

  private leaving = false

  constructor(
    note: (seek: SeekEvent, whileLeaving: boolean) => void,
    now: () => number = Date.now,
    later: Later = afterAWhile,
  ) {
    this.note = note
    this.now = now
    this.later = later
  }

  /** How far the recording's own time stands ahead of the file the player plays, or nothing when it cannot be placed. */
  runsBehindBy(offsetSec: number | undefined): void {
    this.offset = offsetSec
  }

  runsAt(rate: number): void {
    this.rate = rate
  }

  /** A move of the playhead from one second of the file to another, by one of the ways a person seeks, or by none. */
  sought(fromSec: number, toSec: number, means?: SeekMeans): void {
    if (toSec < fromSec) {
      this.endTheRun()
      this.wentBack(fromSec, toSec, means)

      return
    }

    if (means === undefined || this.rate > 1) {
      this.endTheRun()
      this.lastJump = undefined

      return
    }

    if (STEPPING.includes(means)) {
      this.stepped(fromSec, toSec, means)

      return
    }

    this.endTheRun()
    this.jumped(fromSec, toSec, means, this.now())
  }

  tell(second: number): void {
    const back = this.lastJump?.back

    if (!back || second - back.toSec < WATCHED_FOR_SEC) {
      return
    }

    this.lastJump = undefined
    this.send({ event: 'returned', ...back })
  }

  /** The player goes away: the steps still held are sent. */
  leaves(): void {
    this.endTheRun()
  }

  /**
   * The page is hidden or put away, after which it may never run again: the steps still held are sent the way that
   * outlives the page. A seek back still being watched is kept for when the person comes back to the page.
   */
  hides(): void {
    this.leaving = true

    try {
      this.endTheRun()
    } finally {
      this.leaving = false
    }
  }

  private stepped(fromSec: number, toSec: number, means: SeekMeans): void {
    const run = this.run
    const now = this.now()

    if (
      run &&
      run.means === means &&
      now - run.lastAt <= STEPS_JOIN_WITHIN_MS
    ) {
      run.cancel()
      run.toSec = toSec
      run.lastAt = now
      run.cancel = this.later(() => this.endTheRun(), STEPS_JOIN_WITHIN_MS)

      return
    }

    this.endTheRun()
    this.run = {
      means,
      fromSec,
      toSec,
      lastAt: now,
      cancel: this.later(() => this.endTheRun(), STEPS_JOIN_WITHIN_MS),
    }
  }

  private endTheRun(): void {
    const run = this.run

    if (!run) {
      return
    }

    this.run = undefined
    run.cancel()
    this.jumped(run.fromSec, run.toSec, run.means, run.lastAt)
  }

  private jumped(
    fromSec: number,
    toSec: number,
    means: SeekMeans,
    at: number,
  ): void {
    this.lastJump = { means, fromSec, toSec, at }
    this.send({ event: 'forward', means, fromSec, toSec })
  }

  private wentBack(
    fromSec: number,
    toSec: number,
    means: SeekMeans | undefined,
  ): void {
    const jump = this.lastJump

    if (!jump) {
      return
    }

    if (this.now() - jump.at > RETURNS_WITHIN_MS) {
      this.lastJump = undefined

      return
    }

    jump.back =
      means !== undefined &&
      jump.fromSec <= toSec &&
      toSec < jump.toSec - LANDING_REACH_SEC[jump.means]
        ? { means, fromSec, toSec }
        : undefined
  }

  private send(seek: SeekEvent): void {
    const head = this.offset

    if (head === undefined) {
      return
    }

    this.note(
      {
        ...seek,
        fromSec: hundredths(Math.max(0, seek.fromSec + head)),
        toSec: hundredths(Math.max(0, seek.toSec + head)),
      },
      this.leaving,
    )
  }
}
