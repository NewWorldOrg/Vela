import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  RETURNS_WITHIN_MS,
  WATCHED_FOR_SEC,
  WatchLink,
  headSkipPlayed,
  type HeardPlayer,
} from '@/lib/watch-link'
import type { SkipEvent } from '@/repository/recording-segments'

const BREAK = { startsAtSec: 412.3, endsAtSec: 502.3 }

function linked(headSkipSec: number | undefined, modelVersion?: number) {
  const sent: SkipEvent[] = []
  const clock = { now: 1_000_000 }
  const sought: number[] = []
  let replanned = 0
  const link = new WatchLink(
    headSkipSec,
    modelVersion,
    (skip) => sent.push(skip),
    () => clock.now,
  )
  const player: HeardPlayer = {
    seek: (second) => sought.push(second),
    replan: () => {
      replanned += 1
    },
  }

  return {
    link,
    sent,
    clock,
    sought,
    player,
    replans: () => replanned,
  }
}

function watchFor(link: WatchLink, from: number, seconds: number) {
  for (let at = from; at <= from + seconds; at += 0.25) {
    link.tell(at)
  }
}

test('pressing the skip button says where it was pressed and where it landed', () => {
  const { link, sent } = linked(0, 3)

  link.skippedTheBreak(415, BREAK)

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
  const { link, sent } = linked(0, 3)

  link.leftTheBreak(420.5, 502.3)

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

test('a break that a person answered names no version of the model', () => {
  const { link, sent } = linked(0, 3)

  link.standsWith(undefined)
  link.skippedTheBreak(415, BREAK)

  assert.equal(sent[0].modelVersion, undefined)
})

test('seeking back into the skipped break within 30 seconds and watching 10 there is going back to it', () => {
  const { link, sent, clock } = linked(0, 3)

  link.skippedTheBreak(415, BREAK)
  clock.now += 12_000
  link.sought(514.2, 430)
  watchFor(link, 430, WATCHED_FOR_SEC)

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
  const { link, sent, clock } = linked(0)

  link.skippedTheBreak(415, BREAK)
  clock.now += 5_000
  link.sought(505, 430)
  watchFor(link, 430, WATCHED_FOR_SEC - 0.5)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})

test('going back after 30 seconds is not going back to the skip', () => {
  const { link, sent, clock } = linked(0)

  link.skippedTheBreak(415, BREAK)
  clock.now += RETURNS_WITHIN_MS + 1
  link.sought(540, 430)
  watchFor(link, 430, WATCHED_FOR_SEC + 5)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})

test('a seek that lands outside the skipped break is not going back to it', () => {
  const { link, sent, clock } = linked(0)

  link.skippedTheBreak(415, BREAK)
  clock.now += 3_000
  link.sought(505, 300)
  watchFor(link, 300, WATCHED_FOR_SEC + 5)
  link.sought(515, BREAK.endsAtSec)
  watchFor(link, BREAK.endsAtSec, WATCHED_FOR_SEC + 5)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})

test('seeking away again before 10 seconds are watched takes the going back away', () => {
  const { link, sent, clock } = linked(0)

  link.skippedTheBreak(415, BREAK)
  clock.now += 3_000
  link.sought(505, 430)
  watchFor(link, 430, 4)
  link.sought(434, 900)
  watchFor(link, 900, WATCHED_FOR_SEC + 5)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped'],
  )
})

test('going back is said once for one skip', () => {
  const { link, sent, clock } = linked(0)

  link.skippedTheBreak(415, BREAK)
  clock.now += 3_000
  link.sought(505, 430)
  watchFor(link, 430, WATCHED_FOR_SEC + 1)
  link.sought(441, 430)
  watchFor(link, 430, WATCHED_FOR_SEC + 1)

  assert.deepEqual(
    sent.map((one) => one.event),
    ['skipped', 'returned'],
  )
})

test('what is sent is in the recording’s own time, the head an artefact left out added back', () => {
  const { link, sent, clock } = linked(14.5, 2)

  link.skippedTheBreak(400, { startsAtSec: 397.8, endsAtSec: 487.8 })
  clock.now += 2_000
  link.sought(490, 410)
  watchFor(link, 410, WATCHED_FOR_SEC)

  assert.deepEqual(
    sent.map((one) => [one.event, one.fromSec, one.toSec]),
    [
      ['skipped', 414.5, 502.3],
      ['returned', 504.5, 424.5],
    ],
  )
})

test('the stretches see the playhead in the recording’s own time only while a player is heard', () => {
  const { link, player } = linked(14.5)

  link.tell(100)
  assert.equal(link.playhead(), undefined)
  assert.equal(link.follows(), false)

  const away = link.hear(player)

  assert.equal(link.playhead(), 114.5)
  assert.equal(link.follows(), true)

  away()

  assert.equal(link.playhead(), undefined)
})

test('a seek from the stretches lands on the clock of the file played, never before its start', () => {
  const { link, player, sought } = linked(14.5)

  link.hear(player)
  link.seek(502.3)
  link.seek(3)

  assert.deepEqual(sought, [487.8, 0])
})

test('without the clock of the file played, the stretches neither see the playhead nor seek', () => {
  const { link, player, sought } = linked(undefined)

  link.hear(player)
  link.tell(100)
  link.seek(200)

  assert.equal(link.playhead(), undefined)
  assert.equal(link.follows(), false)
  assert.deepEqual(sought, [])
})

test('asking for the chapters again reaches the player heard', () => {
  const { link, player, replans } = linked(0)

  link.replan()
  link.hear(player)
  link.replan()

  assert.equal(replans(), 1)
})

test('whoever follows the playhead is told when it moves, and not when it stands still', () => {
  const { link, player } = linked(0)
  let told = 0
  const leave = link.subscribe(() => {
    told += 1
  })

  link.hear(player)
  link.tell(10)
  link.tell(10)
  link.tell(10.25)
  leave()
  link.tell(11)

  assert.equal(told, 3)
})

test('an artefact handed over as it is plays behind the recording by the head its encode left out', () => {
  assert.equal(
    headSkipPlayed({ route: 'direct', source: 'artefact' }, 14.5),
    14.5,
  )
  assert.equal(
    headSkipPlayed({ route: 'direct', source: 'artefact' }, undefined),
    undefined,
  )
})

test('the recording itself, and anything transcoded while it plays, plays the recording’s own time', () => {
  assert.equal(
    headSkipPlayed({ route: 'direct', source: 'recording' }, 14.5),
    0,
  )
  assert.equal(
    headSkipPlayed({ route: 'onTheFly', source: 'artefact' }, 14.5),
    0,
  )
  assert.equal(headSkipPlayed(undefined, 14.5), 0)
})
