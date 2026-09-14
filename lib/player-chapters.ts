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
