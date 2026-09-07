import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CaptionDrift,
  SETTLE,
  STEP_SECONDS,
  WINDOW,
} from '@/lib/live-caption-drift'
import { CaptionQueue } from '@/lib/live-captions'
import { PTS_HERTZ } from '@/lib/live-wire'

const CADENCE = 1

const PIPELINE_LEAD = 1

function near(got: number, want: number, slack = 1e-9): void {
  assert.ok(Math.abs(got - want) <= slack, `${got} is not ${want}`)
}

function feed(
  drift: CaptionDrift,
  count: number,
  skew: (step: number) => number,
  from = 0,
  each?: () => void,
): number {
  for (let step = 0; step < count; step += 1) {
    const edge = from + step * CADENCE

    drift.saw(edge - PIPELINE_LEAD + skew(step), edge)
    each?.()
  }

  return from + count * CADENCE
}

const steady = () => 0

const off = (by: number) => () => by

function settle(drift: CaptionDrift): number {
  return feed(drift, WINDOW, steady)
}

test('a wire whose two clocks keep step is never corrected', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW * 3, steady)
  drift.adopt()

  assert.equal(drift.pending, 0)
  assert.equal(drift.showEarlyBy, 0)
})

test('captions gone late are shown earlier by what they went late by', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW, off(1.2), settle(drift))
  drift.adopt()

  near(drift.showEarlyBy, 1.2)
})

test('captions gone early are held back by what they went early by', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW, off(-0.9), settle(drift))
  drift.adopt()

  near(drift.showEarlyBy, -0.9)
})

test('a drift that creeps in over minutes is corrected all the same', () => {
  const drift = new CaptionDrift()
  const perSecond = 0.001
  const seconds = 1200

  feed(
    drift,
    seconds / CADENCE,
    (step) => step * CADENCE * perSecond,
    settle(drift),
    () => drift.adopt(),
  )

  near(drift.showEarlyBy, seconds * perSecond, STEP_SECONDS)
})

test('a drift smaller than one step is left alone', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW, off(0.2), settle(drift))
  drift.adopt()

  assert.equal(drift.showEarlyBy, 0)
})

test('a reading that only wobbles never moves the correction', () => {
  const drift = new CaptionDrift()
  const moved: number[] = []

  feed(
    drift,
    WINDOW * 20,
    (step) => Math.sin(step * 1.7) * 0.25,
    0,
    () => {
      drift.adopt()
      moved.push(drift.showEarlyBy)
    },
  )

  assert.deepEqual(new Set(moved), new Set([0]))
})

test('the correction moves in steps, not on every reading', () => {
  const drift = new CaptionDrift()
  const perSecond = 0.002
  const seconds = 1000
  const moved = new Set<number>()

  feed(
    drift,
    seconds / CADENCE,
    (step) => step * CADENCE * perSecond,
    settle(drift),
    () => {
      drift.adopt()
      moved.add(drift.showEarlyBy)
    },
  )

  assert.ok(moved.size > 1, 'the correction never moved')
  assert.ok(
    moved.size <= Math.ceil((seconds * perSecond) / STEP_SECONDS) + 2,
    `${moved.size}`,
  )
})

test('a correction already made is not made again', () => {
  const drift = new CaptionDrift()
  const drifted = feed(drift, WINDOW, off(1.2), settle(drift))

  drift.adopt()
  feed(drift, WINDOW, off(1.2), drifted)

  assert.equal(drift.pending, drift.showEarlyBy)
})

test('a correction waits for the caption on screen to change', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW, off(1.2), settle(drift))

  assert.equal(drift.showEarlyBy, 0)
  near(drift.pending, 1.2)

  drift.adopt()

  near(drift.showEarlyBy, 1.2)
})

test('nothing is corrected until enough captions have been read', () => {
  const drift = new CaptionDrift()

  feed(drift, SETTLE - 1, off(5))
  drift.adopt()

  assert.equal(drift.showEarlyBy, 0)
})

test('a channel change mid-flight forgets what the last one measured', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW, off(1.2), settle(drift))
  drift.adopt()
  near(drift.showEarlyBy, 1.2)

  feed(drift, SETTLE, steady)

  assert.equal(drift.showEarlyBy, 0)
  assert.equal(drift.pending, 0)
})

test('a timeline that begins again is measured afresh, not carried over', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW, off(1.2), settle(drift))
  drift.adopt()

  feed(drift, WINDOW * 2, off(-2))
  drift.adopt()

  assert.equal(drift.showEarlyBy, 0)
})

test('a stamp already behind the playhead is still due at once when corrected', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW, off(1.2), settle(drift))
  drift.adopt()

  const queue = new CaptionQueue<string>()

  queue.offer({ pts: 40 * PTS_HERTZ, picture: 'what is showing now' })

  assert.deepEqual(queue.take(41 + drift.showEarlyBy), {
    pts: 40 * PTS_HERTZ,
    picture: 'what is showing now',
  })
})

test('a correction brings a caption forward by the drift it measured', () => {
  const drift = new CaptionDrift()

  feed(drift, WINDOW, off(1.2), settle(drift))
  drift.adopt()

  const queue = new CaptionQueue<string>()

  queue.offer({ pts: 100 * PTS_HERTZ, picture: 'a line of speech' })

  assert.equal(queue.take(98.9), undefined)
  assert.equal(queue.take(98.7 + drift.showEarlyBy), undefined)
  assert.deepEqual(queue.take(98.9 + drift.showEarlyBy), {
    pts: 100 * PTS_HERTZ,
    picture: 'a line of speech',
  })
})
