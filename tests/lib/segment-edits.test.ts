import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  answerOf,
  boundaryMoved,
  boundaryRange,
  formatSegmentAt,
  formatSegmentField,
  formatSegmentLength,
  kindChanged,
  readSegmentField,
  removedAt,
  sameSegments,
  snapped,
  splitAt,
  splittableAt,
} from '@/lib/segment-edits'
import type { RecordingSegment } from '@/repository/recording-segments'

const STRETCHES: RecordingSegment[] = [
  { startsAtSec: 0, endsAtSec: 412.3, kind: 'programme' },
  { startsAtSec: 412.3, endsAtSec: 502.3, kind: 'break' },
  { startsAtSec: 502.3, endsAtSec: 1804, kind: 'programme' },
]

test('a boundary let go within a second of a candidate is drawn to the nearest one', () => {
  assert.equal(snapped(412.9, [412.28, 412.31, 502.3]), 412.31)
  assert.equal(snapped(411.4, [412.28, 412.31]), 412.28)
  assert.equal(snapped(413.31, [412.31]), 412.31)
})

test('a boundary let go with no candidate in reach lands on the nearest tenth', () => {
  assert.equal(snapped(420.04, [412.28]), 420)
  assert.equal(snapped(420.06, []), 420.1)
})

test('a boundary moves the end of the stretch before it and the start of the one after it together', () => {
  const moved = boundaryMoved(STRETCHES, 1, 420)

  assert.deepEqual(moved[0], {
    startsAtSec: 0,
    endsAtSec: 420,
    kind: 'programme',
  })
  assert.deepEqual(moved[1], {
    startsAtSec: 420,
    endsAtSec: 502.3,
    kind: 'break',
  })
  assert.deepEqual(moved[2], STRETCHES[2])
})

test('a boundary cannot be moved past either end of the stretches it parts', () => {
  assert.equal(boundaryMoved(STRETCHES, 1, 600)[1].startsAtSec, 502.2)
  assert.equal(boundaryMoved(STRETCHES, 1, -5)[1].startsAtSec, 0.1)
  assert.deepEqual(boundaryRange(STRETCHES, 1), { least: 0.1, most: 502.2 })
})

test('the start of the recording and its end are not boundaries that move', () => {
  assert.deepEqual(boundaryMoved(STRETCHES, 0, 10), STRETCHES)
  assert.deepEqual(boundaryMoved(STRETCHES, 3, 10), STRETCHES)
  assert.equal(boundaryRange(STRETCHES, 0), undefined)
})

test('a stretch is split in two where the playhead stands, both halves of its kind', () => {
  const split = splitAt(STRETCHES, 900.456)

  assert.equal(split.length, 4)
  assert.deepEqual(split[2], {
    startsAtSec: 502.3,
    endsAtSec: 900.46,
    kind: 'programme',
  })
  assert.deepEqual(split[3], {
    startsAtSec: 900.46,
    endsAtSec: 1804,
    kind: 'programme',
  })
})

test('a playhead on a boundary splits nothing', () => {
  assert.equal(splittableAt(STRETCHES, 412.3), undefined)
  assert.equal(splittableAt(STRETCHES, 412.35), undefined)
  assert.deepEqual(splitAt(STRETCHES, 412.3), STRETCHES)
  assert.equal(splittableAt(STRETCHES, 450), 1)
})

test('a stretch taken out joins the one before it', () => {
  assert.deepEqual(removedAt(STRETCHES, 1), [
    { startsAtSec: 0, endsAtSec: 502.3, kind: 'programme' },
    STRETCHES[2],
  ])
})

test('the first stretch taken out joins the one after it', () => {
  assert.deepEqual(removedAt(STRETCHES, 0), [
    { startsAtSec: 0, endsAtSec: 502.3, kind: 'break' },
    STRETCHES[2],
  ])
})

test('the only stretch is never taken out', () => {
  const whole: RecordingSegment[] = [
    { startsAtSec: 0, endsAtSec: 1804, kind: 'programme' },
  ]

  assert.deepEqual(removedAt(whole, 0), whole)
})

test('a stretch changes its kind and keeps its place', () => {
  assert.deepEqual(kindChanged(STRETCHES, 1, 'programme')[1], {
    startsAtSec: 412.3,
    endsAtSec: 502.3,
    kind: 'programme',
  })
})

test('stretches that differ only below a hundredth of a second are the same', () => {
  assert.ok(
    sameSegments(
      STRETCHES,
      STRETCHES.map((one) => ({ ...one, endsAtSec: one.endsAtSec + 0.001 })),
    ),
  )
  assert.ok(!sameSegments(STRETCHES, kindChanged(STRETCHES, 1, 'programme')))
  assert.ok(!sameSegments(STRETCHES, STRETCHES.slice(1)))
})

test('an answer is sent to the hundredth of a second', () => {
  assert.deepEqual(
    answerOf([{ startsAtSec: 0, endsAtSec: 412.3049, kind: 'programme' }]),
    [{ startsAtSec: 0, endsAtSec: 412.3, kind: 'programme' }],
  )
})

test('stretches holding a kind this build cannot name are never sent', () => {
  assert.equal(
    answerOf([
      ...STRETCHES,
      { startsAtSec: 1804, endsAtSec: 1900, kind: 'unknown' },
    ]),
    undefined,
  )
})

test('a position in the list reads as the time into the recording', () => {
  assert.equal(formatSegmentAt(412.3), '0:06:52')
  assert.equal(formatSegmentAt(3725.99), '1:02:05')
})

test('the length of a stretch is rounded to the nearest second, without the float showing', () => {
  assert.equal(formatSegmentLength(STRETCHES[1]), '0:01:30')
  assert.equal(
    formatSegmentLength({
      startsAtSec: 912.6,
      endsAtSec: 1002.3,
      kind: 'break',
    }),
    '0:01:30',
  )
})

test('a field holds a position with the hundredths it has and no trailing zero', () => {
  assert.equal(formatSegmentField(912.28), '0:15:12.28')
  assert.equal(formatSegmentField(912.3), '0:15:12.3')
  assert.equal(formatSegmentField(912.05), '0:15:12.05')
  assert.equal(formatSegmentField(912), '0:15:12')
})

test('a typed position is read in hours, minutes and seconds', () => {
  assert.equal(readSegmentField('1:02:03.4'), 3723.4)
  assert.equal(readSegmentField('0:15:12.28'), 912.28)
  assert.equal(readSegmentField('15:12'), 912)
  assert.equal(readSegmentField(' 7.5 '), 7.5)
})

test('what is not a position is not read as one', () => {
  assert.equal(readSegmentField(''), undefined)
  assert.equal(readSegmentField('abc'), undefined)
  assert.equal(readSegmentField('1:75'), undefined)
  assert.equal(readSegmentField('1:02:75'), undefined)
  assert.equal(readSegmentField('1:02:03.456'), undefined)
})

test('what the field spells reads back as the same second', () => {
  for (const second of [0, 0.05, 412.3, 912.28, 3725.99]) {
    assert.equal(readSegmentField(formatSegmentField(second)), second)
  }
})
