import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  chapterBoundaries,
  nextBoundaryAfter,
  whereTheBreakEnds,
} from '@/lib/player-chapters'
import type { PlaybackChapter } from '@/repository/videos'

const MARKED: PlaybackChapter[] = [
  { startsAtSec: 0, endsAtSec: 212, kind: 'programme' },
  { startsAtSec: 212, endsAtSec: 272, kind: 'break' },
  { startsAtSec: 272, endsAtSec: 1130.5, kind: 'programme' },
  { startsAtSec: 1130.5, endsAtSec: 1220.5, kind: 'break' },
  { startsAtSec: 1220.5, endsAtSec: 1800, kind: 'programme' },
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
    { startsAtSec: 900, endsAtSec: 960, kind: 'break' },
    { startsAtSec: 120, endsAtSec: 900, kind: 'programme' },
    { startsAtSec: 900, endsAtSec: 960, kind: 'unknown' },
  ]

  assert.deepEqual(chapterBoundaries(outOfOrder), [120, 900])
  assert.equal(nextBoundaryAfter(0, outOfOrder), 120)
})

test('a chapter this build cannot place is still a boundary', () => {
  const unknown: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 300, kind: 'programme' },
    { startsAtSec: 300, endsAtSec: 360, kind: 'unknown' },
  ]

  assert.deepEqual(chapterBoundaries(unknown), [300])
  assert.equal(nextBoundaryAfter(0, unknown), 300)
})

test('inside a break, the way out is the start of the programme after it', () => {
  assert.equal(whereTheBreakEnds(212, MARKED), 272)
  assert.equal(whereTheBreakEnds(250, MARKED), 272)
  assert.equal(whereTheBreakEnds(1200, MARKED), 1220.5)
})

test('outside a break there is nothing to skip', () => {
  assert.equal(whereTheBreakEnds(0, MARKED), undefined)
  assert.equal(whereTheBreakEnds(211.9, MARKED), undefined)
  assert.equal(whereTheBreakEnds(272, MARKED), undefined)
  assert.equal(whereTheBreakEnds(1500, MARKED), undefined)
  assert.equal(whereTheBreakEnds(100, []), undefined)
})

test('breaks that follow one another are skipped together', () => {
  const backToBack: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 600, kind: 'programme' },
    { startsAtSec: 600, endsAtSec: 630, kind: 'break' },
    { startsAtSec: 630, endsAtSec: 690, kind: 'break' },
    { startsAtSec: 690, endsAtSec: 1200, kind: 'programme' },
  ]

  assert.equal(whereTheBreakEnds(605, backToBack), 690)
  assert.equal(whereTheBreakEnds(650, backToBack), 690)
})

test('a break that runs to the end of the recording has nowhere to skip to', () => {
  const endsInABreak: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 1700, kind: 'programme' },
    { startsAtSec: 1700, endsAtSec: 1800, kind: 'break' },
  ]

  assert.equal(whereTheBreakEnds(1750, endsInABreak), undefined)
})

test('a chapter this build cannot place is neither a break nor where one ends', () => {
  const unknown: PlaybackChapter[] = [
    { startsAtSec: 0, endsAtSec: 300, kind: 'unknown' },
    { startsAtSec: 300, endsAtSec: 360, kind: 'break' },
    { startsAtSec: 360, endsAtSec: 400, kind: 'unknown' },
  ]

  assert.equal(whereTheBreakEnds(100, unknown), undefined)
  assert.equal(whereTheBreakEnds(320, unknown), undefined)
})
