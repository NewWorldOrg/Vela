import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  RETURNS_WITHIN_MS,
  SkipEvents,
  WATCHED_FOR_SEC,
} from '@/lib/skip-events'
import type { SkipEvent } from '@/repository/recording-segments'

const BREAK = { startsAtSec: 412.3, endsAtSec: 502.3 }

function kept(offsetSec: number | undefined, modelVersion?: number) {
  const sent: SkipEvent[] = []
  const clock = { now: 1_000_000 }
  const events = new SkipEvents(
    modelVersion,
    (skip) => sent.push(skip),
    () => clock.now,
  )

  events.runsBehindBy(offsetSec)

  return { events, sent, clock }
}

function watchFor(events: SkipEvents, from: number, seconds: number) {
  for (let at = from; at <= from + seconds; at += 0.25) {
    events.tell(at)
  }
}

test('pressing the skip button says where it was pressed and where it landed', () => {
  const { events, sent } = kept(0, 3)

  events.skippedTheBreak(415, BREAK)

  assert.deepEqual(sent, [
    {
      event: 'skipped',
      kind: 'break',
      fromSec: 415,
      toSec: 502.3,
      modelVersion: 3,
    },
  ])
})

test('closing the skip button says where it was closed and where the break ends', () => {
  const { events, sent } = kept(0, 3)

  events.leftTheBreak(420.5, 502.3)

  assert.deepEqual(sent, [
    {
      event: 'dismissed',
      kind: 'break',
      fromSec: 420.5,
      toSec: 502.3,
      modelVersion: 3,
    },
  ])
})

test('a recording no model found the stretches of names no version of the model', () => {
  const { events, sent } = kept(0)

  events.skippedTheBreak(415, BREAK)

  assert.equal(sent[0].modelVersion, undefined)
})

test('a version that comes to the page later is the one sent', () => {
  const { events, sent } = kept(0, 3)

  events.standsWith(4)
  events.skippedTheBreak(415, BREAK)
  events.standsWith(undefined)
  events.leftTheBreak(1180, 1265.6)

  assert.deepEqual(
    sent.map((one) => one.modelVersion),
    [4, undefined],
  )
})

test('seeking back into the skipped break within 30 seconds and watching 10 there is going back to it', () => {
  const { events, sent, clock } = kept(0, 3)

  events.skippedTheBreak(415, BREAK)
  clock.now += 12_000
  events.sought(514.2, 430)
  watchFor(events, 430, WATCHED_FOR_SEC)

  assert.deepEqual(sent.at(-1), {
    event: 'returned',
    kind: 'break',
    fromSec: 514.2,
    toSec: 430,
    modelVersion: 3,
  })
  assert.equal(sent.length, 2)
})

test('watching under 10 seconds after going back says nothing', () => {
  const { events, sent, clock } = kept(0)

  events.skippedTheBreak(415, BREAK)
  clock.now += 5_000
  events.sought(505, 430)
  watchFor(events, 430, WATCHED_FOR_SEC - 0.5)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})

test('going back after 30 seconds is not going back to the skip', () => {
  const { events, sent, clock } = kept(0)

  events.skippedTheBreak(415, BREAK)
  clock.now += RETURNS_WITHIN_MS + 1
  events.sought(540, 430)
  watchFor(events, 430, WATCHED_FOR_SEC + 5)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})

test('a seek that lands outside the skipped break is not going back to it', () => {
  const { events, sent, clock } = kept(0)

  events.skippedTheBreak(415, BREAK)
  clock.now += 3_000
  events.sought(505, 300)
  watchFor(events, 300, WATCHED_FOR_SEC + 5)
  events.sought(515, BREAK.endsAtSec)
  watchFor(events, BREAK.endsAtSec, WATCHED_FOR_SEC + 5)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})

test('seeking away again before 10 seconds are watched takes the going back away', () => {
  const { events, sent, clock } = kept(0)

  events.skippedTheBreak(415, BREAK)
  clock.now += 3_000
  events.sought(505, 430)
  watchFor(events, 430, 4)
  events.sought(434, 900)
  watchFor(events, 900, WATCHED_FOR_SEC + 5)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})

test('going back is said once for one skip', () => {
  const { events, sent, clock } = kept(0)

  events.skippedTheBreak(415, BREAK)
  clock.now += 3_000
  events.sought(505, 430)
  watchFor(events, 430, WATCHED_FOR_SEC + 1)
  events.sought(441, 430)
  watchFor(events, 430, WATCHED_FOR_SEC + 1)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped', 'returned'],
  )
})

test('what is sent is in the recording’s own time, the head an artefact left out added back', () => {
  const { events, sent, clock } = kept(14.5, 2)

  events.skippedTheBreak(400, { startsAtSec: 397.8, endsAtSec: 487.8 })
  clock.now += 2_000
  events.sought(490, 410)
  watchFor(events, 410, WATCHED_FOR_SEC)

  assert.deepEqual(
    sent.map((one) => [one.event, one.fromSec, one.toSec]),
    [
      ['skipped', 414.5, 502.3],
      ['returned', 504.5, 424.5],
    ],
  )
})

test('while no time in the recording can be placed on the file, nothing done with the button is sent', () => {
  const { events, sent } = kept(undefined, 3)

  events.skippedTheBreak(415, BREAK)
  events.leftTheBreak(420, 502.3)

  assert.deepEqual(sent, [])
})

test('while no time in the recording can be placed on the file, going back to a skipped break is not sent either', () => {
  const { events, sent, clock } = kept(0, 3)

  events.skippedTheBreak(415, BREAK)
  events.runsBehindBy(undefined)
  clock.now += 3_000
  events.sought(505, 430)
  watchFor(events, 430, WATCHED_FOR_SEC + 1)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})
