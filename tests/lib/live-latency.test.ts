import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CATCH_UP_RATE,
  PART_SECONDS,
  SEEK_FROM_SECONDS,
  STALL_ALLOWANCE_CAP_SECONDS,
  STALL_ALLOWANCE_SECONDS,
  TARGET_SECONDS,
  TOLERANCE_SECONDS,
  holdOf,
  reachOf,
  targetOf,
  windowOf,
} from '@/lib/live-latency'

function behind(seconds: number, { stalls = 0, rate = 1 } = {}) {
  const at = 0

  return {
    rate,
    at,
    edge: at + seconds,
    reach: at + seconds,
    from: at,
    stalls,
  }
}

test('at the figure it is held at, the picture is played at the ordinary rate', () => {
  const window = windowOf(0)

  assert.deepEqual(holdOf(behind(window.stop)), { rate: 1 })
  assert.deepEqual(holdOf(behind(window.stop / 2)), { rate: 1 })
  assert.deepEqual(holdOf(behind(window.start)), { rate: 1 })
})

test('drifted past the start figure, the picture is played a little fast', () => {
  const window = windowOf(0)

  assert.deepEqual(holdOf(behind(window.start + PART_SECONDS)), {
    rate: CATCH_UP_RATE,
  })
  assert.deepEqual(holdOf(behind(2.4)), { rate: CATCH_UP_RATE })
  assert.deepEqual(holdOf(behind(SEEK_FROM_SECONDS - PART_SECONDS)), {
    rate: CATCH_UP_RATE,
  })
})

test('a picture already being quickened is brought all the way to the figure, not to the edge of the window', () => {
  const quickened = { rate: CATCH_UP_RATE }
  const window = windowOf(0)

  assert.deepEqual(
    holdOf(behind((window.start + window.stop) / 2, quickened)),
    { rate: CATCH_UP_RATE },
  )
  assert.deepEqual(holdOf(behind(window.stop + PART_SECONDS, quickened)), {
    rate: CATCH_UP_RATE,
  })
  assert.deepEqual(holdOf(behind(window.stop, quickened)), { rate: 1 })
  assert.deepEqual(holdOf(behind(window.stop / 2, quickened)), { rate: 1 })
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
  assert.deepEqual(holdOf(behind(2.4, { rate: CATCH_UP_RATE })), {
    rate: CATCH_UP_RATE,
  })
  assert.deepEqual(holdOf(behind(2.4)), { rate: CATCH_UP_RATE })
})

test('far enough behind, the playhead is moved to the edge at the ordinary rate', () => {
  assert.deepEqual(holdOf(behind(SEEK_FROM_SECONDS)), {
    rate: 1,
    seekTo: SEEK_FROM_SECONDS - targetOf(0),
  })
  assert.deepEqual(holdOf(behind(40, { rate: CATCH_UP_RATE })), {
    rate: 1,
    seekTo: 40 - targetOf(0),
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
    { rate: 1, seekTo: 600 - targetOf(0) },
  )
})

test('two run ends that do not meet exactly are not a hole', () => {
  assert.deepEqual(
    holdOf({
      rate: 1,
      at: 600 - targetOf(0),
      edge: 600,
      reach: 599.98,
      from: 540,
      stalls: 0,
    }),
    { rate: 1 },
  )
})

test('a stall moves the figure out, so a wire that cannot hold the target is not chased to it', () => {
  assert.equal(targetOf(0), TARGET_SECONDS)
  assert.equal(targetOf(1), TARGET_SECONDS + STALL_ALLOWANCE_SECONDS)
  assert.equal(targetOf(3), TARGET_SECONDS + 3 * STALL_ALLOWANCE_SECONDS)

  const drifted = (windowOf(0).start + windowOf(1).start) / 2

  assert.deepEqual(holdOf(behind(drifted)), { rate: CATCH_UP_RATE })
  assert.deepEqual(holdOf(behind(drifted, { stalls: 1 })), { rate: 1 })
})

test('the figure stops moving out, so stalls cannot walk the picture off the live edge', () => {
  assert.equal(targetOf(20), TARGET_SECONDS + STALL_ALLOWANCE_CAP_SECONDS)
  assert.equal(targetOf(1000), TARGET_SECONDS + STALL_ALLOWANCE_CAP_SECONDS)
})

test('the window is the figure, and the figure with the drift allowed on top', () => {
  assert.deepEqual(windowOf(0), {
    start: TARGET_SECONDS + TOLERANCE_SECONDS,
    stop: TARGET_SECONDS,
  })
})

test('the whole window sits inside a second, and no nearer the edge than the wire sends', () => {
  assert.ok(windowOf(0).start <= 1)
  assert.ok(TARGET_SECONDS >= PART_SECONDS * 3)
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
