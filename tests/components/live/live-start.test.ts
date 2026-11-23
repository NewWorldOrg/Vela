import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  BUFFER_CEILING_SECONDS,
  BUFFER_STEPS_SECONDS,
  LATE_START_SECONDS,
  OVERDUE_BEHIND_SECONDS,
  OVERDUE_START_SECONDS,
  START_BUFFER_SECONDS,
} from '@/lib/live-buffer'
import { LiveStart } from '@/components/live/live-start'

const ON_AIR_AT = 43_210.5

const HAVE_NOTHING = 0

const HAVE_METADATA = 1

class Picture {
  currentTime = 0

  readyState = HAVE_METADATA

  plays = 0

  refuses = false

  play(): Promise<void> {
    this.plays += 1

    return this.refuses
      ? Promise.reject(new Error('the browser wants a gesture first'))
      : Promise.resolve()
  }
}

class Held {
  from?: number

  to?: number

  oldest?: number

  constructor(from?: number, to?: number, oldest?: number) {
    this.from = from
    this.to = to
    this.oldest = oldest
  }

  start(): number | undefined {
    return this.oldest ?? this.from
  }

  pictureFrom(): number | undefined {
    return this.from
  }

  end(): number | undefined {
    return this.to
  }
}

function bench(held: Held, target = START_BUFFER_SECONDS) {
  const picture = new Picture()
  const clock = { ms: 0 }
  const device = { target }
  let refusals = 0
  const starter = new LiveStart(
    picture,
    held,
    () => device.target,
    () => clock.ms,
    () => {
      refusals += 1
    },
  )

  return {
    picture,
    starter,
    device,
    refusals: () => refusals,
    pass: (seconds: number) => {
      clock.ms += seconds * 1000
    },
  }
}

test('with nothing buffered, nothing is played', () => {
  const { picture, starter } = bench(new Held())

  starter.check()

  assert.equal(picture.plays, 0)
  assert.equal(picture.currentTime, 0)
  assert.equal(starter.started, false)
})

test('short of the start figure, nothing is played', () => {
  const { picture, starter } = bench(
    new Held(ON_AIR_AT, ON_AIR_AT + START_BUFFER_SECONDS - 0.05),
  )

  starter.check()

  assert.equal(picture.plays, 0)
  assert.equal(starter.started, false)
})

test('the check that finds a fifth of a second held plays, with no wait for more', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT + 0.15)
  const { picture, starter } = bench(held)

  starter.check()

  assert.equal(picture.plays, 0)

  held.to = ON_AIR_AT + 0.25
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 0.25 - START_BUFFER_SECONDS)
  assert.equal(starter.started, true)
})

test('a fifth of a second that the arithmetic leaves a hair short is still a fifth of a second', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT + 0.2)
  const { picture, starter } = bench(held)

  assert.ok(ON_AIR_AT + 0.2 - ON_AIR_AT < START_BUFFER_SECONDS)

  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT)
})

test('what the old figure waited for is not waited for: 0.6 s is no longer needed', () => {
  const { picture, starter } = bench(new Held(ON_AIR_AT, ON_AIR_AT + 0.3))

  starter.check()

  assert.equal(picture.plays, 1)
})

test('a viewer who joins a stream that is already flowing starts on the first fragment, the start figure behind its edge', () => {
  const { picture, starter } = bench(new Held(ON_AIR_AT, ON_AIR_AT + 1.5))

  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 1.5 - START_BUFFER_SECONDS)
  assert.equal(starter.started, true)
})

test('a picture that is not ready to be moved is not played yet, and is played once it is', () => {
  const { picture, starter } = bench(new Held(ON_AIR_AT, ON_AIR_AT + 1))

  picture.readyState = HAVE_NOTHING
  starter.check()

  assert.equal(picture.plays, 0)
  assert.equal(picture.currentTime, 0)
  assert.equal(starter.started, false)

  picture.readyState = HAVE_METADATA
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 1 - START_BUFFER_SECONDS)
})

test('a device that has raised its figure waits for that much', () => {
  const raised = BUFFER_STEPS_SECONDS[3]
  const held = new Held(ON_AIR_AT, ON_AIR_AT + raised - 0.3)
  const { picture, starter } = bench(held, raised)

  starter.check()

  assert.equal(picture.plays, 0)

  held.to = ON_AIR_AT + raised + 0.1
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 0.1)
})

test('the figure is read at each check, so a raise before the start is honoured', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT + 0.1)
  const { picture, starter, device } = bench(held)

  starter.check()
  device.target = BUFFER_STEPS_SECONDS[1]
  held.to = ON_AIR_AT + 0.3
  starter.check()

  assert.equal(picture.plays, 0)

  held.to = ON_AIR_AT + 0.45
  starter.check()

  assert.equal(picture.plays, 1)
})

test('it starts once, and later checks leave the playhead to the latency steering', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT + 1)
  const { picture, starter } = bench(held)

  starter.check()
  held.to = ON_AIR_AT + 3
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 1 - START_BUFFER_SECONDS)
})

test('a play the browser refuses is told once', async () => {
  const { picture, starter, refusals } = bench(
    new Held(ON_AIR_AT, ON_AIR_AT + 1),
  )

  picture.refuses = true
  starter.check()
  starter.check()
  await new Promise((settle) => setImmediate(settle))

  assert.equal(refusals(), 1)
  assert.equal(picture.plays, 1)
})

test('sound or picture that comes late holds the buffered span short: the start waits a second past the figure and no longer', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT + 0.1)
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(LATE_START_SECONDS)
  starter.check()

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS)
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT)
  assert.equal(starter.started, true)
})

test('the wait is counted from the first span that is held, not from before anything came', () => {
  const held = new Held()
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(30)
  starter.check()

  assert.equal(picture.plays, 0)

  held.from = ON_AIR_AT
  held.to = ON_AIR_AT + 0.05
  starter.check()

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS + LATE_START_SECONDS)
  starter.check()

  assert.equal(picture.plays, 1)
})

test('a span with nothing in it is never played, however long it has been', () => {
  const { picture, starter, pass } = bench(new Held(ON_AIR_AT, ON_AIR_AT))

  starter.check()
  pass(60)
  starter.check()

  assert.equal(picture.plays, 0)
  assert.equal(starter.started, false)
})

test('sound held from before the first picture is not counted: nothing is played until the figure is held from the first picture on', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT - 0.04, ON_AIR_AT - 0.9)
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(LATE_START_SECONDS + START_BUFFER_SECONDS + 0.5)
  starter.check()

  assert.equal(picture.plays, 0)
  assert.equal(starter.started, false)

  held.to = ON_AIR_AT + 0.15
  starter.check()

  assert.equal(picture.plays, 0)

  held.to = ON_AIR_AT + 0.21
  starter.check()

  assert.equal(picture.plays, 1)
  assert.ok(picture.currentTime >= ON_AIR_AT)
  assert.equal(picture.currentTime, ON_AIR_AT + 0.21 - START_BUFFER_SECONDS)
})

test('the playhead is never put before the first picture, whatever is held', () => {
  for (const ahead of [0.2, 0.21, 0.3, 0.6, 1.5, 4]) {
    for (const target of BUFFER_STEPS_SECONDS) {
      const { picture, starter, pass } = bench(
        new Held(ON_AIR_AT, ON_AIR_AT + ahead),
        target,
      )

      starter.check()
      pass(target + LATE_START_SECONDS)
      starter.check()

      assert.equal(picture.plays, 1)
      assert.ok(
        picture.currentTime >= ON_AIR_AT,
        `${ahead} s held, ${target} s wanted`,
      )
    }
  }
})

test('a device at the ceiling is given its figure and the same second, so it is not started short while the supply is still filling it', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT + 0.5)
  const { picture, starter, pass } = bench(held, BUFFER_CEILING_SECONDS)

  starter.check()
  pass(BUFFER_CEILING_SECONDS)
  held.to = ON_AIR_AT + BUFFER_CEILING_SECONDS - 0.5
  starter.check()

  assert.equal(picture.plays, 0)

  pass(LATE_START_SECONDS)
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT)
})

test('a first picture that never comes into what is held does not keep the start waiting for ever: past the bound it starts the way it did before, behind the edge of what the browser holds', () => {
  const held = new Held(ON_AIR_AT + 3600, ON_AIR_AT + 0.5, ON_AIR_AT)
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(OVERDUE_START_SECONDS)
  held.to = ON_AIR_AT + 3.6
  starter.check()

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS)
  held.to = ON_AIR_AT + 3.7
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(starter.started, true)
  assert.equal(picture.currentTime, ON_AIR_AT + 3.7 - OVERDUE_BEHIND_SECONDS)
})

test('a forced start is counted from the first thing the browser holds, not from before anything came', () => {
  const held = new Held()
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(60)
  starter.check()

  assert.equal(picture.plays, 0)

  held.oldest = ON_AIR_AT
  held.from = ON_AIR_AT + 3600
  held.to = ON_AIR_AT + 0.3
  starter.check()
  pass(OVERDUE_START_SECONDS)
  starter.check()

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS)
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT)
})

test('a forced start does not wait for where picture and sound begin to be known at all', () => {
  const held = new Held(undefined, ON_AIR_AT + 2, ON_AIR_AT)
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(START_BUFFER_SECONDS + OVERDUE_START_SECONDS)
  held.to = ON_AIR_AT + 5
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 5 - OVERDUE_BEHIND_SECONDS)
})

test('a forced start does not wait for the picture to say it is ready either, as the start before did not', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT + 1)
  const { picture, starter, pass } = bench(held)

  picture.readyState = HAVE_NOTHING
  starter.check()
  pass(START_BUFFER_SECONDS + OVERDUE_START_SECONDS)
  held.to = ON_AIR_AT + 4
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 4 - OVERDUE_BEHIND_SECONDS)
})

test('a device that holds more than the old figure is forced that much behind the edge, and its bound is that much later', () => {
  const raised = BUFFER_STEPS_SECONDS[4]
  const held = new Held(ON_AIR_AT + 3600, ON_AIR_AT + 0.5, ON_AIR_AT)
  const { picture, starter, pass } = bench(held, raised)

  assert.ok(raised > OVERDUE_BEHIND_SECONDS)

  starter.check()
  pass(OVERDUE_START_SECONDS)
  held.to = ON_AIR_AT + 3.7
  starter.check()

  assert.equal(picture.plays, 0)

  pass(raised)
  held.to = ON_AIR_AT + 5
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 5 - raised)
})

test('a start that comes in time is never the forced one: the bound is past every ordinary start', () => {
  for (const target of BUFFER_STEPS_SECONDS) {
    const held = new Held(ON_AIR_AT, ON_AIR_AT + 0.05, ON_AIR_AT - 0.9)
    const { picture, starter, pass } = bench(held, target)

    starter.check()
    pass(target + LATE_START_SECONDS)
    held.to = ON_AIR_AT + 0.1
    starter.check()

    assert.equal(picture.plays, 1, `${target} s wanted`)
    assert.equal(picture.currentTime, ON_AIR_AT, `${target} s wanted`)
  }
})

test('a forced start happens once, and a refusal of it is told once', async () => {
  const held = new Held(ON_AIR_AT + 3600, ON_AIR_AT + 4, ON_AIR_AT)
  const { picture, starter, pass, refusals } = bench(held)

  picture.refuses = true
  starter.check()
  pass(START_BUFFER_SECONDS + OVERDUE_START_SECONDS)
  starter.check()
  starter.check()
  await new Promise((settle) => setImmediate(settle))

  assert.equal(picture.plays, 1)
  assert.equal(refusals(), 1)
})
