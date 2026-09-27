import type { PlaybackChapter } from '@/repository/videos'

const ALREADY_THERE = 0.5

export function chapterBoundaries(chapters: PlaybackChapter[]): number[] {
  const found = new Set<number>()

  for (const one of chapters) {
    if (Number.isFinite(one.startsAtSec) && one.startsAtSec > 0) {
      found.add(one.startsAtSec)
    }
  }

  return [...found].sort((a, b) => a - b)
}

export function nextBoundaryAfter(
  position: number,
  chapters: PlaybackChapter[],
): number | undefined {
  return chapterBoundaries(chapters).find(
    (second) => second > position + ALREADY_THERE,
  )
}

/** Where the programme resumes after the break being played, or nothing when no break is being played or it runs to the end. */
export function whereTheBreakEnds(
  position: number,
  chapters: PlaybackChapter[],
): number | undefined {
  const inBreak = chapters.some(
    (one) =>
      one.kind === 'break' &&
      one.startsAtSec <= position &&
      position < one.endsAtSec,
  )

  if (!inBreak) {
    return undefined
  }

  const resumes = chapters
    .filter(
      (one) =>
        one.kind === 'programme' &&
        Number.isFinite(one.startsAtSec) &&
        one.startsAtSec > position,
    )
    .map((one) => one.startsAtSec)

  return resumes.length > 0 ? Math.min(...resumes) : undefined
}
