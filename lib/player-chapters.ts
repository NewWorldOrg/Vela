import type {
  ChapterKind,
  PlaybackChapter,
  SkippableKind,
} from '@/repository/videos'

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

const SKIPPABLE: ReadonlySet<ChapterKind> = new Set<SkippableKind>([
  'break',
  'opening',
  'ending',
])

/** A chapter of a kind a person may be offered to skip. */
export interface SkippableChapter extends PlaybackChapter {
  kind: SkippableKind
}

export function isSkippableKind(kind: ChapterKind): kind is SkippableKind {
  return SKIPPABLE.has(kind)
}

/** The break, opening or ending being played when the backend lets it be skipped, or nothing. */
export function skippableChapterAt(
  position: number,
  chapters: PlaybackChapter[],
): SkippableChapter | undefined {
  return chapters.find(
    (one): one is SkippableChapter =>
      isSkippableKind(one.kind) &&
      one.skippable &&
      Number.isFinite(one.startsAtSec) &&
      Number.isFinite(one.endsAtSec) &&
      one.startsAtSec <= position &&
      position < one.endsAtSec,
  )
}
