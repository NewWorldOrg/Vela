import type {
  ChapterKind,
  PlaybackChapter,
  SkippableKind,
} from '@/repository/videos'

const ALREADY_THERE = 0.5

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

export interface SkippableRun {
  chapters: [SkippableChapter, ...SkippableChapter[]]
  endsAtSec: number
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

export function skipWords(kinds: readonly SkippableKind[]): string {
  return `${kinds.map((kind) => SHORT_NAME[kind]).join(' と ')} を飛ばす`
}

export const SKIP_ONLY = '飛ばす'

export function skipWordsInTheRow(kinds: readonly SkippableKind[]): string {
  return kinds.length < 2
    ? skipWords(kinds)
    : `${kinds.map((kind) => SHORT_NAME[kind]).join('+')} を飛ばす`
}

export function skipNameInTheRow(
  kinds: readonly SkippableKind[],
  fits: boolean,
): string {
  return fits
    ? skipWordsInTheRow(kinds)
    : `${SKIP_ONLY}(${kinds.map((kind) => SHORT_NAME[kind]).join(' と ')})`
}
