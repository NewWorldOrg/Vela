import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CATCH_UP_RATE,
  EASE_OFF_RATE,
  NEAR_TOLERANCE_SECONDS,
  NOT_GAINING_AFTER_SECONDS,
  PART_SECONDS,
  SEEK_FROM_SECONDS,
  SUPPLY_GRACE_SECONDS,
  TOLERANCE_SECONDS,
  WARN_FROM_SECONDS,
  delayOf,
  holdOf,
  latencyTone,
  losingGround,
  nearWindowOf,
  pictureFromOf,
  reachOf,
  windowOf,
} from '@/lib/live-latency'
import {
  BUFFER_CEILING_SECONDS,
  BUFFER_STEPS_SECONDS,
  PICTURE_NEAR_SECONDS,
  START_BUFFER_SECONDS,
} from '@/lib/live-buffer'

const TARGET = START_BUFFER_SECONDS

const RAISED = BUFFER_STEPS_SECONDS[1]

function behind(seconds: number, { target = TARGET, rate = 1 } = {}) {
  const at = 0

  return {
    rate,
    at,
    edge: at + seconds,
    reach: at + seconds,
    from: at,
    target,
  }
}

test('at the figure it is held at, the picture is played at the ordinary rate', () => {
  const window = windowOf(TARGET)
  const near = nearWindowOf(TARGET)

  assert.deepEqual(holdOf(behind(window.stop)), { rate: 1 })
  assert.deepEqual(holdOf(behind((near.start + window.start) / 2)), { rate: 1 })
  assert.deepEqual(holdOf(behind(near.start)), { rate: 1 })
  assert.deepEqual(holdOf(behind(window.start)), { rate: 1 })
})

test('drifted past the start figure, the picture is played a little fast', () => {
  const window = windowOf(TARGET)

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
  const window = windowOf(TARGET)

  assert.deepEqual(
    holdOf(behind((window.start + window.stop) / 2, quickened)),
    { rate: CATCH_UP_RATE },
  )
  assert.deepEqual(holdOf(behind(window.stop + PART_SECONDS, quickened)), {
    rate: CATCH_UP_RATE,
  })
  assert.deepEqual(holdOf(behind(window.stop, quickened)), { rate: 1 })
  assert.deepEqual(
    holdOf(behind((nearWindowOf(TARGET).start + window.stop) / 2, quickened)),
    { rate: 1 },
  )
})

test('too close to the edge, the picture is played a little slow', () => {
  const near = nearWindowOf(TARGET)

  assert.deepEqual(holdOf(behind(near.start - PART_SECONDS)), {
    rate: EASE_OFF_RATE,
  })
  assert.deepEqual(holdOf(behind(0.058)), { rate: EASE_OFF_RATE })
  assert.deepEqual(holdOf(behind(0)), { rate: EASE_OFF_RATE })
})

test('a picture already being eased is brought all the way to the figure, not to the edge of the window', () => {
  const eased = { rate: EASE_OFF_RATE }
  const near = nearWindowOf(TARGET)

  assert.deepEqual(holdOf(behind((near.start + near.stop) / 2, eased)), {
    rate: EASE_OFF_RATE,
  })
  assert.deepEqual(holdOf(behind(near.stop - PART_SECONDS, eased)), {
    rate: EASE_OFF_RATE,
  })
  assert.deepEqual(holdOf(behind(near.stop, eased)), { rate: 1 })
  assert.deepEqual(holdOf(behind(windowOf(TARGET).start, eased)), { rate: 1 })
})

test('the picture is eased by the amount it is quickened by, which is as much as goes unheard', () => {
  assert.ok(EASE_OFF_RATE < 1)
  assert.ok(Math.abs(1 - EASE_OFF_RATE - (CATCH_UP_RATE - 1)) < 1e-9)
})

test('every distance short of the seek is answered, at any rate, so none keeps the rate it arrived with', () => {
  const window = windowOf(TARGET)
  const near = nearWindowOf(TARGET)
  const slowIf = (held: boolean) => (held ? EASE_OFF_RATE : 1)

  for (let step = 0; step < 160; step += 1) {
    const seconds = step / 20

    assert.deepEqual(
      holdOf(behind(seconds)),
      {
        rate:
          seconds > window.start ? CATCH_UP_RATE : slowIf(seconds < near.start),
      },
      `${seconds.toFixed(2)} s behind, at the ordinary rate`,
    )
    assert.deepEqual(
      holdOf(behind(seconds, { rate: CATCH_UP_RATE })),
      {
        rate:
          seconds > window.stop ? CATCH_UP_RATE : slowIf(seconds < near.start),
      },
      `${seconds.toFixed(2)} s behind, being quickened`,
    )
    assert.deepEqual(
      holdOf(behind(seconds, { rate: EASE_OFF_RATE })),
      {
        rate:
          seconds > window.start ? CATCH_UP_RATE : slowIf(seconds < near.stop),
      },
      `${seconds.toFixed(2)} s behind, being eased`,
    )
  }
})

test('a settled playhead is left alone: nothing is quickened, eased or moved while the wire holds', () => {
  const jitter = [0, 0.04, -0.03, 0.07, -0.05, 0.02, 0.09, -0.02, 0.05, -0.06]
  let rate = 1

  for (let step = 0; step < 200; step += 1) {
    const seconds = TARGET + jitter[step % jitter.length]
    const hold = holdOf(behind(seconds, { rate }))

    assert.deepEqual(hold, { rate: 1 }, `${seconds.toFixed(2)} s behind`)
    rate = hold.rate
  }
})

test('a playhead that has drifted in front of the figure is walked back to it and then let be', () => {
  const STEP_SECONDS = 0.1
  let rate = 1
  let at = 0
  let edge = 0.058

  for (let step = 0; step < 200; step += 1) {
    const hold = holdOf({
      rate,
      at,
      edge,
      reach: edge,
      from: -60,
      target: TARGET,
    })

    assert.equal(hold.seekTo, undefined)
    rate = hold.rate
    at += STEP_SECONDS * rate
    edge += STEP_SECONDS
  }

  assert.equal(rate, 1)
  assert.ok(edge - at >= TARGET)
  assert.ok(edge - at < TARGET + PART_SECONDS)
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
    seekTo: SEEK_FROM_SECONDS - TARGET,
  })
  assert.deepEqual(holdOf(behind(40, { rate: CATCH_UP_RATE })), {
    rate: 1,
    seekTo: 40 - TARGET,
  })
})

test('the seek never goes back past the oldest picture held', () => {
  assert.deepEqual(
    holdOf({
      rate: 1,
      at: 100,
      edge: 130,
      reach: 130,
      from: 129.9,
      target: TARGET,
    }),
    { rate: 1, seekTo: 129.9 },
  )
})

test('a playhead with a hole in front of it is moved, because no rate crosses a hole', () => {
  assert.deepEqual(
    holdOf({
      rate: 1,
      at: 597,
      edge: 600,
      reach: 597.5,
      from: 540,
      target: TARGET,
    }),
    { rate: 1, seekTo: 600 - TARGET },
  )
})

test('two run ends that do not meet exactly are not a hole', () => {
  assert.deepEqual(
    holdOf({
      rate: 1,
      at: 600 - TARGET,
      edge: 600,
      reach: 599.98,
      from: 540,
      target: TARGET,
    }),
    { rate: 1 },
  )
})

test('a device that holds more is steered to its own figure, so a wire that cannot hold the start figure is not chased to it', () => {
  const drifted = (windowOf(TARGET).start + windowOf(RAISED).start) / 2

  assert.deepEqual(holdOf(behind(drifted)), { rate: CATCH_UP_RATE })
  assert.deepEqual(holdOf(behind(drifted, { target: RAISED })), { rate: 1 })
})

test("the seek to the edge lands the device's own figure behind it", () => {
  for (const target of BUFFER_STEPS_SECONDS) {
    assert.deepEqual(holdOf(behind(SEEK_FROM_SECONDS, { target })), {
      rate: 1,
      seekTo: SEEK_FROM_SECONDS - target,
    })
  }
})

test('at every step a device can hold, the figure sits inside its window and each side has room', () => {
  for (const target of BUFFER_STEPS_SECONDS) {
    const window = windowOf(target)
    const near = nearWindowOf(target)

    assert.equal(window.stop, target)
    assert.equal(near.stop, target)
    assert.ok(near.start > 0, `${target} s leaves room before the edge`)
    assert.ok(near.start < target)
    assert.ok(window.start > target)
    assert.deepEqual(holdOf(behind(target, { target })), { rate: 1 })
    assert.deepEqual(holdOf(behind(near.start - PART_SECONDS, { target })), {
      rate: EASE_OFF_RATE,
    })
    assert.deepEqual(holdOf(behind(window.start + PART_SECONDS, { target })), {
      rate: CATCH_UP_RATE,
    })
  }
})

test('even at the ceiling the playhead is quickened long before it is moved', () => {
  assert.ok(windowOf(BUFFER_CEILING_SECONDS).start < SEEK_FROM_SECONDS / 2)
})

test('the window is the figure, and the figure with the drift allowed on top', () => {
  assert.deepEqual(windowOf(TARGET), {
    start: TARGET + TOLERANCE_SECONDS,
    stop: TARGET,
  })
})

test('the near window is the figure, and the figure with the drift allowed underneath', () => {
  assert.deepEqual(nearWindowOf(TARGET), {
    start: TARGET - NEAR_TOLERANCE_SECONDS,
    stop: TARGET,
  })
  assert.deepEqual(nearWindowOf(RAISED), {
    start: RAISED - NEAR_TOLERANCE_SECONDS,
    stop: RAISED,
  })
})

test('there is less room underneath the figure than above it, and what is left outlasts the part the wire sends', () => {
  assert.ok(NEAR_TOLERANCE_SECONDS < TOLERANCE_SECONDS)
  assert.ok(nearWindowOf(TARGET).start > PART_SECONDS)
  assert.ok(nearWindowOf(TARGET).start < TARGET)
})

test('the parts the wire sends move the edge without the playhead being eased or quickened', () => {
  for (const parts of [-1, 0, 1, 2]) {
    assert.deepEqual(holdOf(behind(TARGET + parts * PART_SECONDS)), {
      rate: 1,
    })
  }
})

test('the whole window sits inside a second, and no nearer the edge than the wire sends', () => {
  assert.ok(windowOf(TARGET).start <= 1)
  assert.ok(TARGET >= PART_SECONDS * 3)
})

test('with nothing held, picture and sound begin nowhere', () => {
  assert.equal(pictureFromOf([], [10]), undefined)
})

test('a run whose sound starts before its first picture begins, for playing, at that picture', () => {
  assert.equal(pictureFromOf([{ from: 9.1, to: 10.4 }], [10, 10.05, 10.1]), 10)
})

test('while the sound that came first is all there is, picture and sound begin past the end of what is held', () => {
  const run = { from: 9.4, to: 9.95 }
  const from = pictureFromOf([run], [10])

  assert.equal(from, 10)
  assert.ok(from > run.to)
})

test('a run whose picture was already running where it starts begins where it starts', () => {
  assert.equal(pictureFromOf([{ from: 10, to: 10.4 }], [10, 10.05]), 10)
  assert.equal(pictureFromOf([{ from: 10.02, to: 10.4 }], [10, 10.05]), 10.02)
  assert.equal(
    pictureFromOf([{ from: 150, to: 210 }], [149.95, 150, 150.05]),
    150,
  )
})

test('after a break the run that reaches the edge begins at the first picture that came after the break', () => {
  const runs = [
    { from: 10, to: 12 },
    { from: 19.3, to: 20.4 },
  ]

  assert.equal(pictureFromOf(runs, [10, 11.95, 20, 20.05]), 20)
  assert.equal(pictureFromOf(runs, [10, 11.95, 12.05, 19.25, 19.3]), 19.3)
})

test('a first picture read far past what the browser holds is not believed, and the run begins where the browser says it does', () => {
  const run = { from: 43_209.6, to: 43_210.3 }

  assert.equal(pictureFromOf([run], [run.to * 2]), run.from)
  assert.equal(pictureFromOf([run], [run.to + 60, run.to + 60.05]), run.from)
  assert.equal(
    pictureFromOf([run], [run.to + PICTURE_NEAR_SECONDS + 0.01]),
    run.from,
  )
})

test('a first picture read a little past what the browser holds is believed, since the sound that came first ends before it', () => {
  const run = { from: 43_209.6, to: 43_210.3 }

  assert.equal(pictureFromOf([run], [43_210.4]), 43_210.4)
  assert.equal(
    pictureFromOf([run], [run.to + PICTURE_NEAR_SECONDS]),
    run.to + PICTURE_NEAR_SECONDS,
  )
})

test('a first picture read far before what the browser holds leaves the run to begin where the browser says it does', () => {
  const run = { from: 43_209.6, to: 43_211 }

  assert.equal(pictureFromOf([run], [21_604.8, 21_604.85]), run.from)
})

test('a run no picture time is known for begins where the browser says it does', () => {
  assert.equal(pictureFromOf([{ from: 9.1, to: 10.4 }], []), 9.1)
  assert.equal(
    pictureFromOf(
      [
        { from: 10, to: 12 },
        { from: 19.3, to: 20.4 },
      ],
      [10, 11.95],
    ),
    19.3,
  )
})

test('a seek to the edge after a break lands on the first picture of the new run, not in the sound that came before it', () => {
  const runs = [
    { from: 590, to: 597.5 },
    { from: 599.4, to: 600.05 },
  ]
  const from = pictureFromOf(runs, [590, 597.45, 600])

  assert.equal(from, 600)
  assert.deepEqual(
    holdOf({
      rate: 1,
      at: 597,
      edge: 600.05,
      reach: 597.5,
      from: 600,
      target: TARGET,
    }),
    { rate: 1, seekTo: 600 },
  )
})

test('a seek to the edge of a run shorter than the figure lands on its start, not in the break before it', () => {
  assert.deepEqual(
    holdOf({
      rate: 1,
      at: 597,
      edge: 600.05,
      reach: 597.5,
      from: pictureFromOf(
        [
          { from: 590, to: 597.5 },
          { from: 599.95, to: 600.05 },
        ],
        [590, 597.45, 599.95, 600],
      ) as number,
      target: TARGET,
    }),
    { rate: 1, seekTo: 599.95 },
  )
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

  assert.ok(frozen(SUPPLY_GRACE_SECONDS + 1) > WARN_FROM_SECONDS)
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
  assert.equal(latencyTone(WARN_FROM_SECONDS, false), 'ok')
  assert.equal(latencyTone(WARN_FROM_SECONDS + PART_SECONDS, false), 'warn')
  assert.equal(latencyTone(SEEK_FROM_SECONDS, false), 'err')
})

test('the reading turns to a warning past a second, where it did before the start figure came down', () => {
  assert.equal(WARN_FROM_SECONDS, 1)
  assert.ok(WARN_FROM_SECONDS >= windowOf(TARGET).start)
  assert.equal(latencyTone(TARGET, false), 'ok')
  assert.equal(latencyTone(windowOf(TARGET).start, false), 'ok')
})
