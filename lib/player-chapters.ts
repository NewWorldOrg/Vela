import type { PlaybackChapter } from '@/repository/videos'

const ALREADY_THERE = 0.5

/** The chapters this build can place; one of a kind it has never heard of draws nothing and is never jumped to. */
export function chaptersToDraw(chapters: PlaybackChapter[]): PlaybackChapter[] {
  return chapters.filter((one) => one.kind !== 'unknown')
}

export function chapterBoundaries(chapters: PlaybackChapter[]): number[] {
  const found = new Set<number>()

  for (const one of chaptersToDraw(chapters)) {
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

/** The break being played when the backend lets it be skipped, or nothing. */
export function skippableBreakAt(
  position: number,
  chapters: PlaybackChapter[],
): PlaybackChapter | undefined {
  return chapters.find(
    (one) =>
      one.kind === 'break' &&
      one.skippable &&
      Number.isFinite(one.startsAtSec) &&
      Number.isFinite(one.endsAtSec) &&
      one.startsAtSec <= position &&
      position < one.endsAtSec,
  )
}
