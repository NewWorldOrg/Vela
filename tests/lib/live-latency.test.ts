import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CATCH_UP_RATE,
  NOT_GAINING_AFTER_SECONDS,
  PART_SECONDS,
  SEEK_FROM_SECONDS,
  STALL_ALLOWANCE_CAP_SECONDS,
  STALL_ALLOWANCE_SECONDS,
  SUPPLY_GRACE_SECONDS,
  TARGET_SECONDS,
  TOLERANCE_SECONDS,
  delayOf,
  holdOf,
  latencyTone,
  losingGround,
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

test('the figure is the distance to the edge while the pictures keep arriving', () => {
  assert.equal(delayOf({ behind: 0.62, stalledFor: 0 }), 0.62)
  assert.equal(delayOf({ behind: 0.62, stalledFor: 0.25 }), 0.62)
  assert.equal(
    delayOf({ behind: 0.62, stalledFor: SUPPLY_GRACE_SECONDS }),
    0.62,
  )
})

test('a supply that has stopped is counted into the figure, so a frozen picture does not read as near the edge', () => {
  const frozen = (seconds: number) =>
    delayOf({ behind: 0.06, stalledFor: seconds })

  assert.ok(frozen(SUPPLY_GRACE_SECONDS + 1) > windowOf(0).start)
  assert.equal(latencyTone(frozen(SUPPLY_GRACE_SECONDS + 1), false), 'warn')
  assert.equal(latencyTone(frozen(SUPPLY_GRACE_SECONDS + 30), false), 'err')
})

test('a frozen picture never reads as healthy for longer than the grace the supply is given', () => {
  for (let step = 0; step < 400; step += 1) {
    const seconds = SUPPLY_GRACE_SECONDS + 1 + step / 10

    assert.notEqual(
      latencyTone(delayOf({ behind: 0.06, stalledFor: seconds }), false),
      'ok',
      `${seconds.toFixed(1)} s with nothing arriving`,
    )
  }
})

test('a quickened picture that is closing the gap is left alone', () => {
  assert.equal(losingGround(null), false)
  assert.equal(
    losingGround({
      forSeconds: NOT_GAINING_AFTER_SECONDS + 60,
      gapWas: 2.7,
      gapIs: 2.69,
    }),
    false,
  )
})

test('a quickened picture that has not closed the gap in a minute is losing ground', () => {
  const run = { forSeconds: NOT_GAINING_AFTER_SECONDS, gapWas: 1, gapIs: 2.7 }

  assert.equal(losingGround(run), true)
  assert.equal(
    losingGround({ ...run, forSeconds: NOT_GAINING_AFTER_SECONDS - 1 }),
    false,
  )
  assert.equal(losingGround({ ...run, gapIs: run.gapWas }), true)
})

test('a figure that is not being closed on is not shown as a healthy reading, whatever it says', () => {
  assert.equal(latencyTone(0.6, false), 'ok')
  assert.equal(latencyTone(0.6, true), 'err')
  assert.equal(latencyTone(windowOf(0).start, false), 'ok')
  assert.equal(latencyTone(windowOf(0).start + PART_SECONDS, false), 'warn')
  assert.equal(latencyTone(SEEK_FROM_SECONDS, false), 'err')
})
