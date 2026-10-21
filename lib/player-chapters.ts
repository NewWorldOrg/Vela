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

function canBeSkipped(one: PlaybackChapter): one is SkippableChapter {
  return (
    isSkippableKind(one.kind) &&
    one.skippable &&
    Number.isFinite(one.startsAtSec) &&
    Number.isFinite(one.endsAtSec)
  )
}

/** The break, opening or ending being played when the backend lets it be skipped, or nothing. */
export function skippableChapterAt(
  position: number,
  chapters: PlaybackChapter[],
): SkippableChapter | undefined {
  return chapters.find(
    (one): one is SkippableChapter =>
      canBeSkipped(one) &&
      one.startsAtSec <= position &&
      position < one.endsAtSec,
  )
}

/** Chapters that may be skipped, each starting where the one before it ends, skipped with one press. */
export interface SkippableRun {
  /** The chapter being played, then each one that follows it. */
  chapters: [SkippableChapter, ...SkippableChapter[]]
  endsAtSec: number
  /** The kinds in the order they are played, each once. */
  kinds: SkippableKind[]
}

function skippableAfter(
  one: SkippableChapter,
  chapters: PlaybackChapter[],
): SkippableChapter | undefined {
  const next = chapters.find(
    (other) =>
      other.startsAtSec === one.endsAtSec && other.endsAtSec > one.endsAtSec,
  )

  return next && canBeSkipped(next) ? next : undefined
}

/** The chapter being played when it may be skipped, with every chapter that may be skipped right after it. */
export function skippableRunAt(
  position: number,
  chapters: PlaybackChapter[],
): SkippableRun | undefined {
  const here = skippableChapterAt(position, chapters)

  if (!here) {
    return undefined
  }

  const run: [SkippableChapter, ...SkippableChapter[]] = [here]
  let next = skippableAfter(here, chapters)

  while (next) {
    run.push(next)
    next = skippableAfter(next, chapters)
  }

  return {
    chapters: run,
    endsAtSec: run[run.length - 1].endsAtSec,
    kinds: [...new Set(run.map((one) => one.kind))],
  }
}

const SHORT_NAME: Record<SkippableKind, string> = {
  break: 'CM',
  opening: 'OP',
  ending: 'ED',
}

/** The words on the skip button for the kinds it skips, in the order they are played. */
export function skipWords(kinds: readonly SkippableKind[]): string {
  return `${kinds.map((kind) => SHORT_NAME[kind]).join(' と ')} を飛ばす`
}

export const SKIP_THEM_TOGETHER = 'まとめて飛ばす'

/** The words on the skip button in the control row: the kinds when they fit there, and for more than one kind that does not, words that name none of them. */
export function skipWordsInTheRow(
  kinds: readonly SkippableKind[],
  fits: boolean,
): string {
  return fits || kinds.length < 2 ? skipWords(kinds) : SKIP_THEM_TOGETHER
}
