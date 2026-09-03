import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CATCH_UP_RATE,
  STALL_ALLOWANCE_CAP_SECONDS,
  holdOf,
  reachOf,
  targetOf,
  windowOf,
} from './live-latency.ts'

/** A playhead a given distance behind the edge, on a wire with no holes. */
function behind(seconds: number, { stalls = 0, rate = 1 } = {}) {
  const edge = 600

  return {
    rate,
    at: edge - seconds,
    edge,
    reach: edge,
    from: edge - 60,
    stalls,
  }
}

test('at the figure it is held at, the picture is played at the ordinary rate', () => {
  assert.deepEqual(holdOf(behind(1.0)), { rate: 1 })
  assert.deepEqual(holdOf(behind(0.7)), { rate: 1 })
  assert.deepEqual(holdOf(behind(1.4)), { rate: 1 })
})

test('drifted past the start figure, the picture is played a little fast', () => {
  assert.deepEqual(holdOf(behind(1.5)), { rate: CATCH_UP_RATE })
  assert.deepEqual(holdOf(behind(2.4)), { rate: CATCH_UP_RATE })
  assert.deepEqual(holdOf(behind(7.9)), { rate: CATCH_UP_RATE })
})

test('a picture already being quickened is brought all the way to the figure, not to the edge of the window', () => {
  const quickened = { rate: CATCH_UP_RATE }

  assert.deepEqual(holdOf(behind(1.3, quickened)), { rate: CATCH_UP_RATE })
  assert.deepEqual(holdOf(behind(1.05, quickened)), { rate: CATCH_UP_RATE })
  assert.deepEqual(holdOf(behind(1.0, quickened)), { rate: 1 })
  assert.deepEqual(holdOf(behind(0.9, quickened)), { rate: 1 })
})

test('every distance short of the seek is answered, at either rate, so none keeps the rate it arrived with', () => {
  const window = windowOf(0)

  for (let step = 0; step < 160; step += 1) {
    const seconds = step / 20

    assert.deepEqual(
      holdOf(behind(seconds)),
      { rate: seconds > window.start ? CATCH_UP_RATE : 1 },
      `${seconds.toFixed(2)} s behind, at the ordinary rate`,
    )
    assert.deepEqual(
      holdOf(behind(seconds, { rate: CATCH_UP_RATE })),
      { rate: seconds > window.stop ? CATCH_UP_RATE : 1 },
      `${seconds.toFixed(2)} s behind, being quickened`,
    )
  }
})

test('the reported fault: 2.4 s behind at a quickened rate is brought back rather than left', () => {
  // The screen used to start catching up past 2.5 s and stop under 1.25 s,
  // with nothing said about the ground between, so a playhead there answered
  // neither question and kept whatever rate it was carrying.
  assert.deepEqual(holdOf(behind(2.4, { rate: CATCH_UP_RATE })), {
    rate: CATCH_UP_RATE,
  })
  assert.deepEqual(holdOf(behind(2.4)), { rate: CATCH_UP_RATE })
})

test('far enough behind, the playhead is moved to the edge at the ordinary rate', () => {
  assert.deepEqual(holdOf(behind(8)), { rate: 1, seekTo: 599 })
  assert.deepEqual(holdOf(behind(40, { rate: CATCH_UP_RATE })), {
    rate: 1,
    seekTo: 599,
  })
})

test('the seek never goes back past the oldest picture held', () => {
  assert.deepEqual(
    holdOf({ rate: 1, at: 100, edge: 130, reach: 130, from: 129.5, stalls: 0 }),
    { rate: 1, seekTo: 129.5 },
  )
})

test('a playhead with a hole in front of it is moved, because no rate crosses a hole', () => {
  assert.deepEqual(
    holdOf({ rate: 1, at: 597, edge: 600, reach: 597.5, from: 540, stalls: 0 }),
    { rate: 1, seekTo: 599 },
  )
})

test('a stall moves the figure out, so a wire that cannot hold the target is not chased to it', () => {
  assert.equal(targetOf(0), 1)
  assert.equal(targetOf(1), 1.2)
  assert.equal(targetOf(3), 1.6)
  assert.deepEqual(holdOf(behind(1.5)), { rate: CATCH_UP_RATE })
  assert.deepEqual(holdOf(behind(1.5, { stalls: 1 })), { rate: 1 })
})

test('the figure stops moving out, so stalls cannot walk the picture off the live edge', () => {
  assert.equal(targetOf(20), 1 + STALL_ALLOWANCE_CAP_SECONDS)
  assert.equal(targetOf(1000), 1 + STALL_ALLOWANCE_CAP_SECONDS)
})

test('the window is the figure, and the figure with the drift allowed on top', () => {
  assert.deepEqual(windowOf(0), { start: 1.4, stop: 1 })
})

test('the reach is where the run holding the playhead ends', () => {
  const runs = [
    { from: 0, to: 10 },
    { from: 12, to: 30 },
  ]

  assert.equal(reachOf(runs, 5), 10)
  assert.equal(reachOf(runs, 20), 30)
})

test('a playhead in a hole reaches no further than itself', () => {
  assert.equal(reachOf([{ from: 12, to: 30 }], 11), 11)
  assert.equal(reachOf([], 4), 4)
})
