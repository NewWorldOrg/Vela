import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  chapterBoundaries,
  chaptersToDraw,
  nextBoundaryAfter,
  skippableBreakAt,
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
  assert.equal(skippableBreakAt(212, MARKED)?.endsAtSec, 272)
  assert.equal(skippableBreakAt(250, MARKED)?.endsAtSec, 272)
  assert.equal(skippableBreakAt(1200, MARKED)?.endsAtSec, 1220.5)
})

test('outside a break there is nothing to skip', () => {
  assert.equal(skippableBreakAt(0, MARKED), undefined)
  assert.equal(skippableBreakAt(211.9, MARKED), undefined)
  assert.equal(skippableBreakAt(272, MARKED), undefined)
  assert.equal(skippableBreakAt(1500, MARKED), undefined)
  assert.equal(skippableBreakAt(100, []), undefined)
})

test('a break the backend did not let be skipped is not offered', () => {
  const heldBack: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 1700, kind: 'programme', skippable: false },
    { startsAtSec: 1700, endsAtSec: 1800, kind: 'break', skippable: false },
  ]

  assert.equal(skippableBreakAt(1750, heldBack), undefined)
})

test('breaks that follow one another are each skipped to their own end', () => {
  const backToBack: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 600, kind: 'programme', skippable: false },
    { startsAtSec: 600, endsAtSec: 630, kind: 'break', skippable: true },
    { startsAtSec: 630, endsAtSec: 690, kind: 'break', skippable: true },
    { startsAtSec: 690, endsAtSec: 1200, kind: 'programme', skippable: false },
  ]

  assert.equal(skippableBreakAt(605, backToBack)?.endsAtSec, 630)
  assert.equal(skippableBreakAt(650, backToBack)?.endsAtSec, 690)
})

test('only a break is skipped, whatever else is said to be skippable', () => {
  const others: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 300, kind: 'unknown', skippable: true },
    { startsAtSec: 300, endsAtSec: 360, kind: 'programme', skippable: true },
    { startsAtSec: 360, endsAtSec: 400, kind: 'unknown', skippable: true },
  ]

  assert.equal(skippableBreakAt(100, others), undefined)
  assert.equal(skippableBreakAt(320, others), undefined)
  assert.equal(skippableBreakAt(380, others), undefined)
})

test('a break whose seconds cannot be read is not offered', () => {
  const unread: PlaybackChapter[] = [
    { startsAtSec: Number.NaN, endsAtSec: 360, kind: 'break', skippable: true },
    { startsAtSec: 400, endsAtSec: Number.NaN, kind: 'break', skippable: true },
  ]

  assert.equal(skippableBreakAt(320, unread), undefined)
  assert.equal(skippableBreakAt(420, unread), undefined)
})
