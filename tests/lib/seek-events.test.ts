import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  LANDING_REACH_SEC,
  SeekEvents,
  STEPS_JOIN_WITHIN_MS,
} from '@/lib/seek-events'
import { RETURNS_WITHIN_MS, WATCHED_FOR_SEC } from '@/lib/skip-events'
import type { SeekEvent } from '@/repository/recording-segments'

function kept(offsetSec: number | undefined) {
  const sent: SeekEvent[] = []
  const leaving: SeekEvent[] = []
  const clock = { now: 1_000_000 }
  const waiting: { run: () => void; at: number }[] = []
  const seeks = new SeekEvents(
    (seek, whileLeaving) => (whileLeaving ? leaving : sent).push(seek),
    () => clock.now,
    (run, ms) => {
      const one = { run, at: clock.now + ms }

      waiting.push(one)

      return () => {
        waiting.splice(waiting.indexOf(one), 1)
      }
    },
  )
  const pass = (ms: number) => {
    clock.now += ms

    for (const one of waiting.filter((each) => each.at <= clock.now)) {
      one.run()
    }
  }

  seeks.runsBehindBy(offsetSec)

  return { seeks, sent, leaving, clock, pass }
}

function watchFor(seeks: SeekEvents, from: number, seconds: number) {
  for (let at = from; at <= from + seconds; at += 0.25) {
    seeks.tell(at)
  }
}

test('a seek forward by the bar is sent at once, in the recording’s own time', () => {
  const { seeks, sent } = kept(1.5)

  seeks.sought(595, 681, 'bar')

  assert.deepEqual(sent, [
    { event: 'forward', means: 'bar', fromSec: 596.5, toSec: 682.5 },
  ])
})

test('steps forward a moment apart are sent as one seek once the steps stop', () => {
  const { seeks, sent, clock, pass } = kept(0)

  seeks.sought(621, 631, 'step')
  pass(900)
  seeks.sought(631, 641, 'step')
  clock.now += STEPS_JOIN_WITHIN_MS
  seeks.sought(641.4, 651.4, 'step')
  pass(STEPS_JOIN_WITHIN_MS - 1)

  assert.deepEqual(sent, [])

  pass(1)

  assert.deepEqual(sent, [
    { event: 'forward', means: 'step', fromSec: 621, toSec: 651.4 },
  ])
})

test('steps further apart than the joining gap, by keys or by another way, are seeks of their own', () => {
  const { seeks, sent, clock } = kept(0)

  seeks.sought(100, 110, 'key')
  clock.now += STEPS_JOIN_WITHIN_MS + 1
  seeks.sought(111, 121, 'key')
  seeks.sought(121, 131, 'step')
  seeks.sought(131, 300, 'chapter')

  assert.deepEqual(sent, [
    { event: 'forward', means: 'key', fromSec: 100, toSec: 110 },
    { event: 'forward', means: 'key', fromSec: 111, toSec: 121 },
    { event: 'forward', means: 'step', fromSec: 121, toSec: 131 },
    { event: 'forward', means: 'chapter', fromSec: 131, toSec: 300 },
  ])
})

test('steps still waiting to be joined are sent when the player goes away', () => {
  const { seeks, sent } = kept(0)

  seeks.sought(100, 110, 'step')
  seeks.sought(110, 120, 'step')
  seeks.leaves()
  seeks.leaves()

  assert.deepEqual(sent, [
    { event: 'forward', means: 'step', fromSec: 100, toSec: 120 },
  ])
})

test('nothing is sent while the player plays faster than as broadcast, and the steps before are still sent', () => {
  const { seeks, sent } = kept(0)

  seeks.sought(100, 110, 'step')
  seeks.runsAt(1.5)
  seeks.sought(110, 120, 'step')
  seeks.sought(400, 500, 'bar')
  seeks.runsAt(1)
  seeks.sought(600, 690, 'bar')

  assert.deepEqual(sent, [
    { event: 'forward', means: 'step', fromSec: 100, toSec: 110 },
    { event: 'forward', means: 'bar', fromSec: 600, toSec: 690 },
  ])
})

test('a jump the skip button made is no seek, and sends the steps before it', () => {
  const { seeks, sent } = kept(0)

  seeks.sought(100, 110, 'step')
  seeks.sought(110, 200)

  assert.deepEqual(sent, [
    { event: 'forward', means: 'step', fromSec: 100, toSec: 110 },
  ])
})

test('seeking back into what a seek passed moments before and watching on from there counts as coming back, once', () => {
  const { seeks, sent, clock } = kept(2)

  seeks.sought(595, 681, 'bar')
  clock.now += RETURNS_WITHIN_MS - 1
  seeks.sought(690, 640, 'key')
  watchFor(seeks, 640, WATCHED_FOR_SEC - 1)

  assert.equal(sent.length, 1)

  watchFor(seeks, 649, 3)
  watchFor(seeks, 652, 20)

  assert.deepEqual(sent, [
    { event: 'forward', means: 'bar', fromSec: 597, toSec: 683 },
    { event: 'returned', means: 'key', fromSec: 692, toSec: 642 },
  ])
})

test('coming back counts against the steps joined as one, from the last of them', () => {
  const { seeks, sent, clock, pass } = kept(0)

  seeks.sought(621, 631, 'step')
  seeks.sought(631, 641, 'step')
  pass(STEPS_JOIN_WITHIN_MS + 1)
  clock.now += RETURNS_WITHIN_MS - STEPS_JOIN_WITHIN_MS - 2
  seeks.sought(645, 625, 'bar')
  watchFor(seeks, 625, WATCHED_FOR_SEC)

  assert.deepEqual(sent.at(-1), {
    event: 'returned',
    means: 'bar',
    fromSec: 645,
    toSec: 625,
  })
})

test('a seek back too late, outside what was passed, or left before watching for a while is no coming back', () => {
  for (const [after, landing, watched] of [
    [RETURNS_WITHIN_MS + 1, 640, WATCHED_FOR_SEC],
    [1000, 590, WATCHED_FOR_SEC],
    [1000, 681, WATCHED_FOR_SEC],
  ] as const) {
    const { seeks, sent, clock } = kept(0)

    seeks.sought(595, 681, 'bar')
    clock.now += after
    seeks.sought(690, landing, 'bar')
    watchFor(seeks, landing, watched)

    assert.equal(sent.length, 1)
  }

  const { seeks, sent } = kept(0)

  seeks.sought(595, 681, 'bar')
  seeks.sought(690, 640, 'bar')
  watchFor(seeks, 640, 4)
  seeks.sought(644, 700, 'bar')
  watchFor(seeks, 700, WATCHED_FOR_SEC)

  assert.deepEqual(
    sent.map((seek) => seek.event),
    ['forward', 'forward'],
  )
})

test('nothing is sent while no time in the recording can be placed on the file', () => {
  const { seeks, sent } = kept(undefined)

  seeks.sought(595, 681, 'bar')

  assert.deepEqual(sent, [])
})

test('the steps still held are sent the way that outlives the page when the page is hidden, and nothing more when they would have been sent', () => {
  const { seeks, sent, leaving, pass } = kept(0)

  seeks.sought(100, 110, 'step')
  seeks.sought(110, 120, 'step')
  seeks.hides()
  pass(STEPS_JOIN_WITHIN_MS + 1)
  seeks.hides()

  assert.deepEqual(sent, [])
  assert.deepEqual(leaving, [
    { event: 'forward', means: 'step', fromSec: 100, toSec: 120 },
  ])
})

test('a seek back still being watched when the page is hidden is kept, and counts once the person watches on after coming back to the page', () => {
  const { seeks, sent, leaving } = kept(0)

  seeks.sought(595, 681, 'bar')
  seeks.sought(690, 640, 'bar')
  watchFor(seeks, 640, 4)
  seeks.hides()
  watchFor(seeks, 644, WATCHED_FOR_SEC)

  assert.deepEqual(leaving, [])
  assert.deepEqual(sent.at(-1), {
    event: 'returned',
    means: 'bar',
    fromSec: 690,
    toSec: 640,
  })
})

test('steps run past a pod and brought back by one step land within the reach of where they landed, which is no coming back; two steps back are', () => {
  for (const [backs, returned] of [
    [1, false],
    [2, true],
  ] as const) {
    const { seeks, sent, pass } = kept(0)

    for (let at = 624; at < 684; at += 10) {
      seeks.sought(at, at + 10, 'step')
    }

    pass(STEPS_JOIN_WITHIN_MS + 1)

    for (let back = 0; back < backs; back += 1) {
      seeks.sought(684 - back * 10, 674 - back * 10, 'key')
    }

    watchFor(seeks, 684 - backs * 10, WATCHED_FOR_SEC)

    assert.deepEqual(sent[0], {
      event: 'forward',
      means: 'step',
      fromSec: 624,
      toSec: 684,
    })
    assert.equal(
      sent.some((seek) => seek.event === 'returned'),
      returned,
    )
  }
})

test('the reach of a landing is that of the way the seek forward was made, as learning reads it', () => {
  assert.deepEqual(LANDING_REACH_SEC, { bar: 8, key: 8, step: 10, chapter: 2 })

  for (const [landing, returned] of [
    [673, false],
    [672.9, true],
  ] as const) {
    const { seeks, sent } = kept(0)

    seeks.sought(595, 681, 'bar')
    seeks.sought(690, landing, 'bar')
    watchFor(seeks, landing, WATCHED_FOR_SEC)

    assert.equal(sent.length, returned ? 2 : 1)
  }
})
