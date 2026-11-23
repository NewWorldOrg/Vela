import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  BUFFER_CEILING_SECONDS,
  BUFFER_STEPS_SECONDS,
  CALM_SECONDS,
  LATE_START_SECONDS,
  LIVE_BUFFER_COOKIE,
  LiveBuffer,
  OVERDUE_BEHIND_SECONDS,
  OVERDUE_START_SECONDS,
  PICTURE_NEAR_SECONDS,
  SAME_STALL_SECONDS,
  SEEK_SETTLES_SECONDS,
  START_BUFFER_SECONDS,
  liveBufferOf,
  liveBufferSpelling,
  loweredFrom,
  raisedFrom,
} from '@/lib/live-buffer'

function bench(seconds = START_BUFFER_SECONDS) {
  const clock = { ms: 0 }
  const remembered: number[] = []
  const buffer = new LiveBuffer(
    seconds,
    () => clock.ms,
    (kept) => remembered.push(kept),
  )

  return {
    buffer,
    remembered,
    pass: (passed: number) => {
      clock.ms += passed * 1000
    },
  }
}

test('playback starts with a fifth of a second buffered', () => {
  assert.equal(START_BUFFER_SECONDS, 0.2)
})

test('the steps climb from the start figure to the ceiling, each one higher than the last', () => {
  assert.equal(BUFFER_STEPS_SECONDS[0], START_BUFFER_SECONDS)
  assert.equal(BUFFER_STEPS_SECONDS.at(-1), BUFFER_CEILING_SECONDS)

  for (let index = 1; index < BUFFER_STEPS_SECONDS.length; index += 1) {
    assert.ok(BUFFER_STEPS_SECONDS[index] > BUFFER_STEPS_SECONDS[index - 1])
  }
})

test('the ceiling is a few seconds, so stalls cannot walk the picture off the live edge', () => {
  assert.ok(BUFFER_CEILING_SECONDS >= 2)
  assert.ok(BUFFER_CEILING_SECONDS <= 5)
})

test('a raise goes to the next step and stops at the ceiling', () => {
  assert.equal(raisedFrom(START_BUFFER_SECONDS), BUFFER_STEPS_SECONDS[1])
  assert.equal(raisedFrom(BUFFER_STEPS_SECONDS[2]), BUFFER_STEPS_SECONDS[3])
  assert.equal(raisedFrom(BUFFER_CEILING_SECONDS), BUFFER_CEILING_SECONDS)
})

test('a lowering goes to the step before and stops at the start figure', () => {
  assert.equal(loweredFrom(BUFFER_CEILING_SECONDS), BUFFER_STEPS_SECONDS.at(-2))
  assert.equal(loweredFrom(BUFFER_STEPS_SECONDS[1]), START_BUFFER_SECONDS)
  assert.equal(loweredFrom(START_BUFFER_SECONDS), START_BUFFER_SECONDS)
})

test('a device that has remembered nothing starts from the start figure', () => {
  assert.equal(liveBufferOf(undefined), START_BUFFER_SECONDS)
  assert.equal(liveBufferOf(null), START_BUFFER_SECONDS)
  assert.equal(liveBufferOf(''), START_BUFFER_SECONDS)
})

test('what a device remembered is read back as the step it wrote', () => {
  for (const step of BUFFER_STEPS_SECONDS) {
    assert.equal(liveBufferOf(liveBufferSpelling(step)), step)
  }
})

test('a remembered figure that is no step is read as the next step up, inside the start figure and the ceiling', () => {
  assert.equal(liveBufferOf('0.5'), 0.6)
  assert.equal(liveBufferOf('0'), START_BUFFER_SECONDS)
  assert.equal(liveBufferOf('-4'), START_BUFFER_SECONDS)
  assert.equal(liveBufferOf('60'), BUFFER_CEILING_SECONDS)
  assert.equal(liveBufferOf('Infinity'), START_BUFFER_SECONDS)
  assert.equal(liveBufferOf('soon'), START_BUFFER_SECONDS)
})

test('the figure is remembered under a name of its own', () => {
  assert.equal(LIVE_BUFFER_COOKIE, 'vela-live-buffer')
})

test('a device holds the figure it was opened with', () => {
  assert.equal(bench().buffer.seconds, START_BUFFER_SECONDS)
  assert.equal(bench(1.5).buffer.seconds, 1.5)
})

test('a stall raises the figure one step and remembers it', () => {
  const { buffer, remembered } = bench()

  buffer.stalled()

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[1])
  assert.deepEqual(remembered, [BUFFER_STEPS_SECONDS[1]])
})

test('stalls that come close together are one stall, and raise the figure once', () => {
  const { buffer, remembered, pass } = bench()

  buffer.stalled()
  pass(SAME_STALL_SECONDS / 2)
  buffer.stalled()
  pass(SAME_STALL_SECONDS / 2 - 0.1)
  buffer.stalled()

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[1])
  assert.deepEqual(remembered, [BUFFER_STEPS_SECONDS[1]])
})

test('a stall that comes after the last one has passed raises the figure again', () => {
  const { buffer, remembered, pass } = bench()

  buffer.stalled()
  pass(SAME_STALL_SECONDS)
  buffer.stalled()

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[2])
  assert.deepEqual(remembered, [
    BUFFER_STEPS_SECONDS[1],
    BUFFER_STEPS_SECONDS[2],
  ])
})

test('stall after stall, the figure stops at the ceiling and is not written again', () => {
  const { buffer, remembered, pass } = bench()

  for (let stall = 0; stall < BUFFER_STEPS_SECONDS.length + 5; stall += 1) {
    buffer.stalled()
    pass(SAME_STALL_SECONDS)
  }

  assert.equal(buffer.seconds, BUFFER_CEILING_SECONDS)
  assert.deepEqual(remembered, BUFFER_STEPS_SECONDS.slice(1))
})

test('a long stretch played without a stall lowers the figure one step and remembers it', () => {
  const { buffer, remembered } = bench(BUFFER_STEPS_SECONDS[3])

  buffer.played(CALM_SECONDS - 1)

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[3])
  assert.deepEqual(remembered, [])

  buffer.played(1)

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[2])
  assert.deepEqual(remembered, [BUFFER_STEPS_SECONDS[2]])
})

test('the figure comes down a step for each long stretch, not all at once', () => {
  const { buffer, remembered } = bench(BUFFER_STEPS_SECONDS[3])

  buffer.played(CALM_SECONDS * 3)

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[2])

  buffer.played(CALM_SECONDS)
  buffer.played(CALM_SECONDS)

  assert.equal(buffer.seconds, START_BUFFER_SECONDS)
  assert.deepEqual(remembered, [
    BUFFER_STEPS_SECONDS[2],
    BUFFER_STEPS_SECONDS[1],
    START_BUFFER_SECONDS,
  ])
})

test('at the start figure a long stretch changes nothing and writes nothing', () => {
  const { buffer, remembered } = bench()

  buffer.played(CALM_SECONDS * 2)

  assert.equal(buffer.seconds, START_BUFFER_SECONDS)
  assert.deepEqual(remembered, [])
})

test('a stall starts the long stretch over, even one that raised nothing', () => {
  const { buffer, pass } = bench(BUFFER_STEPS_SECONDS[2])

  buffer.played(CALM_SECONDS - 1)
  buffer.stalled()

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[3])

  pass(1)
  buffer.played(CALM_SECONDS - 1)
  buffer.stalled()
  buffer.played(CALM_SECONDS - 1)

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[3])

  buffer.played(1)

  assert.equal(buffer.seconds, BUFFER_STEPS_SECONDS[2])
})

test('the stretch that lowers the figure is far longer than the time stalls are counted as one', () => {
  assert.ok(CALM_SECONDS >= 600)
  assert.ok(CALM_SECONDS > SAME_STALL_SECONDS * 60)
})

test('the start waits no longer than a second past the figure for a supply that comes slowly', () => {
  assert.ok(LATE_START_SECONDS > 0)
  assert.ok(LATE_START_SECONDS <= 1)
})

test('a start that has not come is forced well after the late start would have come, so the two never race', () => {
  assert.ok(OVERDUE_START_SECONDS >= LATE_START_SECONDS + 1)
  assert.ok(OVERDUE_START_SECONDS <= 5)
})

test('a forced start goes as far behind the edge as playback started before the figure came down', () => {
  assert.equal(OVERDUE_BEHIND_SECONDS, 0.6)
  assert.ok(OVERDUE_BEHIND_SECONDS > START_BUFFER_SECONDS)
})

test('a first picture is believed only when it is no more than a couple of seconds past what the browser holds', () => {
  assert.ok(PICTURE_NEAR_SECONDS >= 1)
  assert.ok(PICTURE_NEAR_SECONDS < OVERDUE_START_SECONDS)
})

test('a seek is given a second to settle before a wait counts as a stall', () => {
  assert.ok(SEEK_SETTLES_SECONDS > 0)
  assert.ok(SEEK_SETTLES_SECONDS <= 1)
})
