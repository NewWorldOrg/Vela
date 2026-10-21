import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  chapterBoundaries,
  chaptersToDraw,
  isSkippableKind,
  nextBoundaryAfter,
  skippableChapterAt,
  SKIP_THEM_TOGETHER,
  skippableRunAt,
  skipWords,
  skipWordsInTheRow,
} from '@/lib/player-chapters'
import type { PlaybackChapter } from '@/repository/videos'

const MARKED: PlaybackChapter[] = [
  { startsAtSec: 0, endsAtSec: 212, kind: 'programme', skippable: false },
  { startsAtSec: 212, endsAtSec: 272, kind: 'break', skippable: true },
  { startsAtSec: 272, endsAtSec: 1130.5, kind: 'programme', skippable: false },
  { startsAtSec: 1130.5, endsAtSec: 1220.5, kind: 'break', skippable: true },
  { startsAtSec: 1220.5, endsAtSec: 1800, kind: 'programme', skippable: false },
]

test('the opening of the recording is not a boundary anyone jumps to', () => {
  assert.deepEqual(chapterBoundaries(MARKED), [212, 272, 1130.5, 1220.5])
})

test('a recording nobody marked has no boundaries at all', () => {
  assert.deepEqual(chapterBoundaries([]), [])
  assert.equal(nextBoundaryAfter(0, []), undefined)
})

test('the boundary that is asked for is the first one still ahead', () => {
  assert.equal(nextBoundaryAfter(0, MARKED), 212)
  assert.equal(nextBoundaryAfter(250, MARKED), 272)
  assert.equal(nextBoundaryAfter(1000, MARKED), 1130.5)
})

test('landing on a boundary does not offer that same boundary again', () => {
  assert.equal(nextBoundaryAfter(212, MARKED), 272)
  assert.equal(nextBoundaryAfter(212.4, MARKED), 272)
})

test('past the last boundary there is nowhere left to send anyone', () => {
  assert.equal(nextBoundaryAfter(1220.5, MARKED), undefined)
  assert.equal(nextBoundaryAfter(1799, MARKED), undefined)
})

test('boundaries come back in order, and the same second only once', () => {
  const outOfOrder: PlaybackChapter[] = [
    { startsAtSec: 900, endsAtSec: 960, kind: 'break', skippable: true },
    { startsAtSec: 120, endsAtSec: 900, kind: 'programme', skippable: false },
    { startsAtSec: 900, endsAtSec: 960, kind: 'break', skippable: true },
  ]

  assert.deepEqual(chapterBoundaries(outOfOrder), [120, 900])
  assert.equal(nextBoundaryAfter(0, outOfOrder), 120)
})

test('a chapter this build cannot place is no boundary and nowhere to jump to', () => {
  const unknown: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 300, kind: 'programme', skippable: false },
    { startsAtSec: 300, endsAtSec: 360, kind: 'unknown', skippable: true },
    { startsAtSec: 360, endsAtSec: 900, kind: 'programme', skippable: false },
  ]

  assert.deepEqual(chapterBoundaries(unknown), [360])
  assert.equal(nextBoundaryAfter(0, unknown), 360)
  assert.equal(nextBoundaryAfter(360, unknown), undefined)
})

test('only the chapters this build can place are drawn', () => {
  const mixed: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 300, kind: 'programme', skippable: false },
    { startsAtSec: 300, endsAtSec: 360, kind: 'unknown', skippable: true },
    { startsAtSec: 360, endsAtSec: 420, kind: 'break', skippable: false },
  ]

  assert.deepEqual(chaptersToDraw(mixed), [mixed[0], mixed[2]])
  assert.deepEqual(
    chaptersToDraw([
      { startsAtSec: 0, endsAtSec: 60, kind: 'unknown', skippable: false },
    ]),
    [],
  )
})

test('inside a break that may be skipped, the skip goes to where that break ends', () => {
  assert.equal(skippableChapterAt(212, MARKED)?.endsAtSec, 272)
  assert.equal(skippableChapterAt(250, MARKED)?.endsAtSec, 272)
  assert.equal(skippableChapterAt(1200, MARKED)?.endsAtSec, 1220.5)
})

test('outside a break there is nothing to skip', () => {
  assert.equal(skippableChapterAt(0, MARKED), undefined)
  assert.equal(skippableChapterAt(211.9, MARKED), undefined)
  assert.equal(skippableChapterAt(272, MARKED), undefined)
  assert.equal(skippableChapterAt(1500, MARKED), undefined)
  assert.equal(skippableChapterAt(100, []), undefined)
})

test('a break the backend did not let be skipped is not offered', () => {
  const heldBack: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 1700, kind: 'programme', skippable: false },
    { startsAtSec: 1700, endsAtSec: 1800, kind: 'break', skippable: false },
  ]

  assert.equal(skippableChapterAt(1750, heldBack), undefined)
})

test('breaks that follow one another are each skipped to their own end', () => {
  const backToBack: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 600, kind: 'programme', skippable: false },
    { startsAtSec: 600, endsAtSec: 630, kind: 'break', skippable: true },
    { startsAtSec: 630, endsAtSec: 690, kind: 'break', skippable: true },
    { startsAtSec: 690, endsAtSec: 1200, kind: 'programme', skippable: false },
  ]

  assert.equal(skippableChapterAt(605, backToBack)?.endsAtSec, 630)
  assert.equal(skippableChapterAt(650, backToBack)?.endsAtSec, 690)
})

test('neither the programme nor a kind this build cannot place is skipped, whatever is said of it', () => {
  const others: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 300, kind: 'unknown', skippable: true },
    { startsAtSec: 300, endsAtSec: 360, kind: 'programme', skippable: true },
    { startsAtSec: 360, endsAtSec: 400, kind: 'unknown', skippable: true },
  ]

  assert.equal(skippableChapterAt(100, others), undefined)
  assert.equal(skippableChapterAt(320, others), undefined)
  assert.equal(skippableChapterAt(380, others), undefined)
})

const THEMED: PlaybackChapter[] = [
  { startsAtSec: 0, endsAtSec: 95, kind: 'programme', skippable: false },
  { startsAtSec: 95, endsAtSec: 185, kind: 'opening', skippable: true },
  { startsAtSec: 185, endsAtSec: 245, kind: 'break', skippable: true },
  { startsAtSec: 245, endsAtSec: 1650, kind: 'programme', skippable: false },
  { startsAtSec: 1650, endsAtSec: 1740, kind: 'ending', skippable: true },
  { startsAtSec: 1740, endsAtSec: 1770, kind: 'programme', skippable: false },
  { startsAtSec: 1770, endsAtSec: 1800, kind: 'ending', skippable: false },
]

test('inside an opening or an ending that may be skipped, the skip goes to where it ends and says which it is', () => {
  assert.deepEqual(skippableChapterAt(95, THEMED), THEMED[1])
  assert.deepEqual(skippableChapterAt(1700, THEMED), THEMED[4])
})

test('an opening followed by a break is skipped to the break, and the break to the programme', () => {
  assert.equal(skippableChapterAt(184.9, THEMED)?.kind, 'opening')
  assert.equal(skippableChapterAt(185, THEMED)?.kind, 'break')
  assert.equal(skippableChapterAt(185, THEMED)?.endsAtSec, 245)
})

test('an ending the backend did not let be skipped is not offered', () => {
  assert.equal(skippableChapterAt(1780, THEMED), undefined)
})

test('the edges of an opening and an ending are boundaries to jump to', () => {
  assert.deepEqual(chapterBoundaries(THEMED), [95, 185, 245, 1650, 1740, 1770])
  assert.equal(nextBoundaryAfter(10, THEMED), 95)
  assert.equal(nextBoundaryAfter(1700, THEMED), 1740)
})

test('a break, an opening and an ending are the kinds that may be skipped', () => {
  assert.deepEqual(
    (['programme', 'break', 'opening', 'ending', 'unknown'] as const).filter(
      isSkippableKind,
    ),
    ['break', 'opening', 'ending'],
  )
})

test('a break whose seconds cannot be read is not offered', () => {
  const unread: PlaybackChapter[] = [
    { startsAtSec: Number.NaN, endsAtSec: 360, kind: 'break', skippable: true },
    { startsAtSec: 400, endsAtSec: Number.NaN, kind: 'break', skippable: true },
  ]

  assert.equal(skippableChapterAt(320, unread), undefined)
  assert.equal(skippableChapterAt(420, unread), undefined)
})

const OPENING_THEN_A_BREAK: PlaybackChapter[] = [
  { startsAtSec: 0, endsAtSec: 95, kind: 'programme', skippable: false },
  { startsAtSec: 95, endsAtSec: 185, kind: 'opening', skippable: true },
  { startsAtSec: 185, endsAtSec: 245, kind: 'break', skippable: true },
  { startsAtSec: 245, endsAtSec: 1800, kind: 'programme', skippable: false },
]

test('inside an opening with a break right after it, one skip goes past the break too', () => {
  const run = skippableRunAt(100, OPENING_THEN_A_BREAK)

  assert.deepEqual(run?.chapters, OPENING_THEN_A_BREAK.slice(1, 3))
  assert.equal(run?.endsAtSec, 245)
  assert.deepEqual(run?.kinds, ['opening', 'break'])
})

test('inside the break that follows the opening, the skip starts from the break', () => {
  const run = skippableRunAt(200, OPENING_THEN_A_BREAK)

  assert.deepEqual(run?.chapters, [OPENING_THEN_A_BREAK[2]])
  assert.equal(run?.endsAtSec, 245)
  assert.deepEqual(run?.kinds, ['break'])
})

test('outside anything that may be skipped there is no run to skip', () => {
  assert.equal(skippableRunAt(50, OPENING_THEN_A_BREAK), undefined)
  assert.equal(skippableRunAt(245, OPENING_THEN_A_BREAK), undefined)
  assert.equal(skippableRunAt(100, []), undefined)
})

test('the run stops at a chapter the backend did not let be skipped', () => {
  const heldBack: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 95, kind: 'programme', skippable: false },
    { startsAtSec: 95, endsAtSec: 185, kind: 'opening', skippable: true },
    { startsAtSec: 185, endsAtSec: 245, kind: 'break', skippable: false },
    { startsAtSec: 245, endsAtSec: 305, kind: 'break', skippable: true },
    { startsAtSec: 305, endsAtSec: 1800, kind: 'programme', skippable: false },
  ]
  const run = skippableRunAt(100, heldBack)

  assert.equal(run?.endsAtSec, 185)
  assert.deepEqual(run?.kinds, ['opening'])
})

test('the run stops at the programme', () => {
  const run = skippableRunAt(1700, THEMED)

  assert.deepEqual(run?.chapters, [THEMED[4]])
  assert.equal(run?.endsAtSec, 1740)
})

test('the run stops where a chapter this build cannot place stands, drawn or not', () => {
  const unknown: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 95, kind: 'programme', skippable: false },
    { startsAtSec: 95, endsAtSec: 185, kind: 'opening', skippable: true },
    { startsAtSec: 185, endsAtSec: 245, kind: 'unknown', skippable: true },
    { startsAtSec: 245, endsAtSec: 305, kind: 'break', skippable: true },
    { startsAtSec: 305, endsAtSec: 1800, kind: 'programme', skippable: false },
  ]

  assert.equal(skippableRunAt(100, unknown)?.endsAtSec, 185)
  assert.equal(skippableRunAt(100, chaptersToDraw(unknown))?.endsAtSec, 185)
})

test('breaks that follow one another are one run of one kind', () => {
  const backToBack: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 600, kind: 'programme', skippable: false },
    { startsAtSec: 600, endsAtSec: 630, kind: 'break', skippable: true },
    { startsAtSec: 630, endsAtSec: 690, kind: 'break', skippable: true },
    { startsAtSec: 690, endsAtSec: 1200, kind: 'programme', skippable: false },
  ]
  const run = skippableRunAt(605, backToBack)

  assert.equal(run?.chapters.length, 2)
  assert.equal(run?.endsAtSec, 690)
  assert.deepEqual(run?.kinds, ['break'])
})

test('a kind that comes back later in the run is named once, where it first came', () => {
  const around: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 1500, kind: 'programme', skippable: false },
    { startsAtSec: 1500, endsAtSec: 1560, kind: 'break', skippable: true },
    { startsAtSec: 1560, endsAtSec: 1650, kind: 'ending', skippable: true },
    { startsAtSec: 1650, endsAtSec: 1710, kind: 'break', skippable: true },
    { startsAtSec: 1710, endsAtSec: 1800, kind: 'programme', skippable: false },
  ]
  const run = skippableRunAt(1510, around)

  assert.equal(run?.chapters.length, 3)
  assert.equal(run?.endsAtSec, 1710)
  assert.deepEqual(run?.kinds, ['break', 'ending'])
})

test('a run with a chapter of no length in it does not go round in circles', () => {
  const still: PlaybackChapter[] = [
    { startsAtSec: 95, endsAtSec: 185, kind: 'opening', skippable: true },
    { startsAtSec: 185, endsAtSec: 185, kind: 'break', skippable: true },
    { startsAtSec: 185, endsAtSec: 245, kind: 'break', skippable: true },
    { startsAtSec: 245, endsAtSec: 1800, kind: 'programme', skippable: false },
  ]

  assert.equal(skippableRunAt(100, still)?.endsAtSec, 245)
})

test('the skip button names one kind alone, and more than one joined in the order they are played', () => {
  assert.equal(skipWords(['break']), 'CM を飛ばす')
  assert.equal(skipWords(['opening']), 'OP を飛ばす')
  assert.equal(skipWords(['ending']), 'ED を飛ばす')
  assert.equal(skipWords(['opening', 'break']), 'OP と CM を飛ばす')
  assert.equal(skipWords(['break', 'ending']), 'CM と ED を飛ばす')
  assert.equal(
    skipWords(['opening', 'break', 'ending']),
    'OP と CM と ED を飛ばす',
  )
})

test('in the control row, the kinds are named while they fit, and more than one kind that does not fit is skipped together', () => {
  assert.equal(
    skipWordsInTheRow(['opening', 'break'], true),
    'OP と CM を飛ばす',
  )
  assert.equal(
    skipWordsInTheRow(['opening', 'break'], false),
    SKIP_THEM_TOGETHER,
  )
  assert.equal(
    skipWordsInTheRow(['opening', 'break', 'ending'], false),
    'まとめて飛ばす',
  )
})

test('in the control row, one kind keeps its words even where they do not fit', () => {
  assert.equal(skipWordsInTheRow(['break'], false), 'CM を飛ばす')
  assert.equal(skipWordsInTheRow(['ending'], true), 'ED を飛ばす')
})
