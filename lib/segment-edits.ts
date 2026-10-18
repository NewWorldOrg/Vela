import { formatPlayhead } from '@/lib/format'
import type {
  AnsweredSegment,
  RecordingSegment,
  SegmentKind,
} from '@/repository/recording-segments'

/** How far a boundary that is moved reaches for a boundary candidate before it is placed where it was let go. */
export const SNAPS_WITHIN_SEC = 1

/** The finest step a boundary is placed by when no candidate is near, and the step the arrow keys move it by. */
export const STEP_SEC = 0.1

/** The shortest a stretch is left by a boundary moved or a stretch split. */
export const SHORTEST_SEC = 0.1

const POSITION = /^(?:(\d+):)?(?:(\d{1,2}):)?(\d{1,2}(?:\.\d{1,2})?)$/

function hundredths(second: number): number {
  return Math.round(second * 100) / 100
}

function tenths(second: number): number {
  return Math.round(second * 10) / 10
}

/** The second a boundary let go at `second` lands on: the nearest candidate within reach, otherwise the nearest step. */
export function snapped(second: number, snaps: readonly number[]): number {
  const near = snaps.filter((one) => Math.abs(one - second) <= SNAPS_WITHIN_SEC)

  if (near.length === 0) {
    return tenths(second)
  }

  return near.reduce((best, one) =>
    Math.abs(one - second) < Math.abs(best - second) ? one : best,
  )
}

/** Where the boundary before the stretch at `nth` may go: no nearer than the shortest stretch to the ends of the two it parts. */
export function boundaryRange(
  segments: readonly RecordingSegment[],
  nth: number,
): { least: number; most: number } | undefined {
  const before = segments[nth - 1]
  const after = segments[nth]

  if (!before || !after) {
    return undefined
  }

  const least = hundredths(before.startsAtSec + SHORTEST_SEC)
  const most = hundredths(after.endsAtSec - SHORTEST_SEC)

  return least <= most ? { least, most } : undefined
}

/** The stretches with the boundary before the one at `nth` put at `second`, kept within the two stretches it parts. */
export function boundaryMoved(
  segments: readonly RecordingSegment[],
  nth: number,
  second: number,
): RecordingSegment[] {
  const range = boundaryRange(segments, nth)

  if (!range || !Number.isFinite(second)) {
    return [...segments]
  }

  const at = hundredths(Math.min(range.most, Math.max(range.least, second)))

  return segments.map((one, index) => {
    if (index === nth - 1) {
      return { ...one, endsAtSec: at }
    }

    return index === nth ? { ...one, startsAtSec: at } : one
  })
}

/** The stretch `second` falls in, when it falls far enough inside it to be cut there. */
export function splittableAt(
  segments: readonly RecordingSegment[],
  second: number,
): number | undefined {
  const at = hundredths(second)
  const nth = segments.findIndex(
    (one) =>
      one.startsAtSec + SHORTEST_SEC <= at &&
      at <= one.endsAtSec - SHORTEST_SEC,
  )

  return nth < 0 ? undefined : nth
}

/** The stretches with the one `second` falls in cut in two there, both halves of its kind. */
export function splitAt(
  segments: readonly RecordingSegment[],
  second: number,
): RecordingSegment[] {
  const nth = splittableAt(segments, second)

  if (nth === undefined) {
    return [...segments]
  }

  const at = hundredths(second)
  const cut = segments[nth]

  return [
    ...segments.slice(0, nth),
    { ...cut, endsAtSec: at },
    { ...cut, startsAtSec: at },
    ...segments.slice(nth + 1),
  ]
}

/** The stretches with the one at `nth` taken into the one before it, or into the one after it when it is the first. */
export function removedAt(
  segments: readonly RecordingSegment[],
  nth: number,
): RecordingSegment[] {
  const gone = segments[nth]

  if (!gone || segments.length < 2) {
    return [...segments]
  }

  if (nth === 0) {
    const [, next, ...rest] = segments

    return [{ ...next, startsAtSec: gone.startsAtSec }, ...rest]
  }

  return segments.flatMap((one, index) => {
    if (index === nth) {
      return []
    }

    return index === nth - 1 ? [{ ...one, endsAtSec: gone.endsAtSec }] : [one]
  })
}

export function kindChanged(
  segments: readonly RecordingSegment[],
  nth: number,
  kind: SegmentKind,
): RecordingSegment[] {
  return segments.map((one, index) => (index === nth ? { ...one, kind } : one))
}

export function sameSegments(
  one: readonly RecordingSegment[],
  other: readonly RecordingSegment[],
): boolean {
  return (
    one.length === other.length &&
    one.every(
      (segment, index) =>
        segment.kind === other[index].kind &&
        hundredths(segment.startsAtSec) ===
          hundredths(other[index].startsAtSec) &&
        hundredths(segment.endsAtSec) === hundredths(other[index].endsAtSec),
    )
  )
}

/** The stretches as an answer is sent, or nothing while one of them is of a kind this build cannot name. */
export function answerOf(
  segments: readonly RecordingSegment[],
): AnsweredSegment[] | undefined {
  const answered: AnsweredSegment[] = []

  for (const one of segments) {
    if (one.kind === 'unknown') {
      return undefined
    }

    answered.push({
      startsAtSec: hundredths(one.startsAtSec),
      endsAtSec: hundredths(one.endsAtSec),
      kind: one.kind,
    })
  }

  return answered
}

/** A position in the recording as the list reads it, `0:12:00`. */
export function formatSegmentAt(second: number): string {
  return formatPlayhead(hundredths(second))
}

/** How long a stretch lasts, to the nearest second, in the same spelling as its positions. */
export function formatSegmentLength(segment: RecordingSegment): string {
  return formatPlayhead(
    Math.round(hundredths(segment.endsAtSec - segment.startsAtSec)),
  )
}

/** A position as a field holds it while it is being changed: the list's spelling with the hundredths it has, `0:15:12.28`. */
export function formatSegmentField(second: number): string {
  const at = hundredths(second)
  const whole = Math.floor(at)
  const rest = Math.round((at - whole) * 100)

  if (rest === 0) {
    return formatPlayhead(whole)
  }

  const fraction = String(rest).padStart(2, '0').replace(/0$/, '')

  return `${formatPlayhead(whole)}.${fraction}`
}

/** The second a position typed as `1:02:03.4`, `2:03` or `3.4` stands for, or nothing when it is not one. */
export function readSegmentField(text: string): number | undefined {
  const found = POSITION.exec(text.trim())

  if (!found) {
    return undefined
  }

  const [, first, second, rest] = found
  const hours = second === undefined ? 0 : Number(first ?? 0)
  const minutes = second === undefined ? Number(first ?? 0) : Number(second)

  if (minutes >= 60 || (first !== undefined && Number(rest) >= 60)) {
    return undefined
  }

  return hundredths(hours * 3600 + minutes * 60 + Number(rest))
}
