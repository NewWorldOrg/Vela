import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  BLIND_START_SECONDS,
  BUFFER_CEILING_SECONDS,
  BUFFER_STEPS_SECONDS,
  LATE_START_SECONDS,
  OVERDUE_START_SECONDS,
  START_BUFFER_SECONDS,
} from '@/lib/live-buffer'
import { CATCH_UP_RATE, TOLERANCE_SECONDS, holdOf } from '@/lib/live-latency'
import { LiveStart } from '@/lib/live-start'

const ON_AIR_AT = 43_210.5

const SOUND_FROM = ON_AIR_AT - 0.9

const HAVE_NOTHING = 0

const HAVE_METADATA = 1

class Picture {
  readyState = HAVE_METADATA

  plays = 0

  refuses = false

  readonly put: number[] = []

  get currentTime(): number {
    return this.put.at(-1) ?? 0
  }

  set currentTime(at: number) {
    this.put.push(at)
  }

  play(): Promise<void> {
    this.plays += 1

    return this.refuses
      ? Promise.reject(new Error('the browser wants a gesture first'))
      : Promise.resolve()
  }
}

class Held {
  oldest?: number

  from?: number

  to?: number

  constructor(oldest?: number, from?: number, to?: number) {
    this.oldest = oldest
    this.from = from
    this.to = to
  }

  start(): number | undefined {
    return this.oldest
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
  assert.deepEqual(picture.put, [])
  assert.equal(starter.started, false)
})

test('sound held from before the first picture moves nothing and plays nothing', () => {
  const held = new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT - 0.04)
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(LATE_START_SECONDS + START_BUFFER_SECONDS + 0.5)
  starter.check()

  assert.equal(picture.plays, 0)
  assert.deepEqual(picture.put, [])
  assert.equal(starter.started, false)
})

test('the check that finds the first picture held plays from that picture, with no wait for any amount', () => {
  const held = new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT - 0.04)
  const { picture, starter } = bench(held)

  starter.check()
  held.to = ON_AIR_AT + 0.01
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT])
  assert.equal(starter.started, true)
})

test('whatever little is held past the first picture, the playhead is put on that picture and nowhere else', () => {
  for (const ahead of [0.001, 0.02, 0.05, 0.19, 0.2, 0.3, 0.6]) {
    const { picture, starter } = bench(
      new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT + ahead),
    )

    starter.check()

    assert.equal(picture.plays, 1, `${ahead} s held`)
    assert.deepEqual(picture.put, [ON_AIR_AT], `${ahead} s held`)
  }
})

test('picture and sound that begin together are played from where they begin, at the first check', () => {
  const { picture, starter } = bench(
    new Held(ON_AIR_AT, ON_AIR_AT, ON_AIR_AT + 0.03),
  )

  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT])
})

test('a viewer who joins a stream that is already flowing, with more held than the steering lets stand, starts the figure behind the edge', () => {
  const joined = START_BUFFER_SECONDS + TOLERANCE_SECONDS + 0.9
  const { picture, starter } = bench(
    new Held(ON_AIR_AT, ON_AIR_AT, ON_AIR_AT + joined),
  )

  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT + joined - START_BUFFER_SECONDS])
})

test('as much as the steering lets stand is played from the first picture, so nothing is quickened or moved straight after', () => {
  const { picture, starter } = bench(
    new Held(
      ON_AIR_AT,
      ON_AIR_AT,
      ON_AIR_AT + START_BUFFER_SECONDS + TOLERANCE_SECONDS,
    ),
  )

  starter.check()

  assert.deepEqual(picture.put, [ON_AIR_AT])
})

test('straight after the start the steering finds the playhead where it would keep it: it moves nothing and quickens nothing', () => {
  for (const target of BUFFER_STEPS_SECONDS) {
    for (let step = 1; step <= 120; step += 1) {
      const end = ON_AIR_AT + step / 20
      const { picture, starter, pass } = bench(
        new Held(SOUND_FROM, ON_AIR_AT, end),
        target,
      )

      starter.check()
      pass(target + LATE_START_SECONDS)
      starter.check()

      const hold = holdOf({
        rate: 1,
        at: picture.currentTime,
        edge: end,
        reach: end,
        from: ON_AIR_AT,
        target,
      })

      assert.equal(picture.plays, 1)
      assert.equal(picture.put.length, 1)
      assert.equal(hold.seekTo, undefined, `${step / 20} s held, ${target} s`)
      assert.notEqual(
        hold.rate,
        CATCH_UP_RATE,
        `${step / 20} s held, ${target} s`,
      )
    }
  }
})

test('a picture that is not ready to be moved is neither moved nor played yet, and is once it is', () => {
  const { picture, starter } = bench(
    new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT + 0.05),
  )

  picture.readyState = HAVE_NOTHING
  starter.check()

  assert.equal(picture.plays, 0)
  assert.deepEqual(picture.put, [])
  assert.equal(starter.started, false)

  picture.readyState = HAVE_METADATA
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT])
})

test('a device that has raised its figure is shown the first picture at once, and played when its figure is held from there', () => {
  const raised = BUFFER_STEPS_SECONDS[2]
  const held = new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT + 0.03)
  const { picture, starter } = bench(held, raised)

  starter.check()

  assert.deepEqual(picture.put, [ON_AIR_AT])
  assert.equal(picture.plays, 0)
  assert.equal(starter.started, false)

  held.to = ON_AIR_AT + raised - 0.1
  starter.check()

  assert.equal(picture.plays, 0)

  held.to = ON_AIR_AT + raised
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT])
  assert.equal(starter.started, true)
})

test('a raised figure that the supply is slow to fill is waited for a second past the figure and no longer', () => {
  const raised = BUFFER_STEPS_SECONDS[3]
  const held = new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT + 0.05)
  const { picture, starter, pass } = bench(held, raised)

  starter.check()
  pass(raised)
  held.to = ON_AIR_AT + 0.4
  starter.check()

  assert.equal(picture.plays, 0)

  pass(LATE_START_SECONDS)
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT])
})

test('the wait for a raised figure is counted from the first picture held, not from the sound before it', () => {
  const raised = BUFFER_STEPS_SECONDS[1]
  const held = new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT - 0.04)
  const { picture, starter, pass } = bench(held, raised)

  starter.check()
  pass(raised + LATE_START_SECONDS - 0.5)
  held.to = ON_AIR_AT + 0.05
  starter.check()
  pass(0.5)
  starter.check()

  assert.equal(picture.plays, 0)

  pass(raised + LATE_START_SECONDS - 0.5)
  starter.check()

  assert.equal(picture.plays, 1)
})

test('a device at the ceiling that joins a flowing stream far ahead of its figure starts its figure behind the edge, at once', () => {
  const joined = BUFFER_CEILING_SECONDS + TOLERANCE_SECONDS + 1
  const { picture, starter } = bench(
    new Held(ON_AIR_AT, ON_AIR_AT, ON_AIR_AT + joined),
    BUFFER_CEILING_SECONDS,
  )

  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT + joined - BUFFER_CEILING_SECONDS])
})

test('the figure is read at each check, so a raise before the play is honoured', () => {
  const held = new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT - 0.04)
  const { picture, starter, device } = bench(held)

  starter.check()
  device.target = BUFFER_STEPS_SECONDS[1]
  held.to = ON_AIR_AT + 0.1
  starter.check()

  assert.equal(picture.plays, 0)

  held.to = ON_AIR_AT + BUFFER_STEPS_SECONDS[1]
  starter.check()

  assert.equal(picture.plays, 1)
})

test('it starts once, and later checks leave the playhead to the latency steering', () => {
  const held = new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT + 0.05)
  const { picture, starter } = bench(held)

  starter.check()
  held.to = ON_AIR_AT + 3
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT])
})

test('a play the browser refuses is told once', async () => {
  const { picture, starter, refusals } = bench(
    new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT + 0.05),
  )

  picture.refuses = true
  starter.check()
  starter.check()
  await new Promise((settle) => setImmediate(settle))

  assert.equal(refusals(), 1)
  assert.equal(picture.plays, 1)
})

test('a span with nothing in it is never played, however long it has been', () => {
  const { picture, starter, pass } = bench(
    new Held(ON_AIR_AT, ON_AIR_AT, ON_AIR_AT),
  )

  starter.check()
  pass(60)
  starter.check()

  assert.equal(picture.plays, 0)
  assert.equal(starter.started, false)
})

test('where the first picture is cannot be told: the start is the one from before the figure came down, behind the edge of what the browser holds', () => {
  const held = new Held(SOUND_FROM, undefined, SOUND_FROM + 0.3)
  const { picture, starter } = bench(held)

  starter.check()

  assert.equal(picture.plays, 0)
  assert.deepEqual(picture.put, [])

  held.to = SOUND_FROM + BLIND_START_SECONDS + 0.2
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [held.to - BLIND_START_SECONDS])
  assert.ok(held.to - BLIND_START_SECONDS > SOUND_FROM)
})

test('where the first picture is cannot be told, on a device that holds more than the old figure: it waits for its own figure', () => {
  const raised = BUFFER_STEPS_SECONDS[4]
  const held = new Held(SOUND_FROM, undefined, SOUND_FROM + 1)
  const { picture, starter } = bench(held, raised)

  assert.ok(raised > BLIND_START_SECONDS)

  starter.check()

  assert.equal(picture.plays, 0)

  held.to = SOUND_FROM + raised + 0.5
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [held.to - raised])
})

test('a first picture that never comes into what is held does not keep the start waiting for ever: past the bound it starts the way it did before', () => {
  const held = new Held(SOUND_FROM, ON_AIR_AT + 3600, SOUND_FROM + 0.5)
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(OVERDUE_START_SECONDS)
  held.to = SOUND_FROM + 3.6
  starter.check()

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS)
  held.to = SOUND_FROM + 3.7
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(starter.started, true)
  assert.deepEqual(picture.put, [SOUND_FROM + 3.7 - BLIND_START_SECONDS])
})

test('a forced start is counted from the first thing the browser holds, not from before anything came', () => {
  const held = new Held()
  const { picture, starter, pass } = bench(held)

  starter.check()
  pass(60)
  starter.check()

  assert.equal(picture.plays, 0)

  held.oldest = SOUND_FROM
  held.from = ON_AIR_AT + 3600
  held.to = SOUND_FROM + 0.3
  starter.check()
  pass(OVERDUE_START_SECONDS)
  starter.check()

  assert.equal(picture.plays, 0)

  pass(START_BUFFER_SECONDS)
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [SOUND_FROM])
})

test('a forced start does not wait for the picture to say it is ready, as the start before did not', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT, ON_AIR_AT + 1)
  const { picture, starter, pass } = bench(held)

  picture.readyState = HAVE_NOTHING
  starter.check()
  pass(START_BUFFER_SECONDS + OVERDUE_START_SECONDS)
  held.to = ON_AIR_AT + 4
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [ON_AIR_AT + 4 - BLIND_START_SECONDS])
})

test('a device that holds more than the old figure is forced that much behind the edge, and its bound is that much later', () => {
  const raised = BUFFER_STEPS_SECONDS[4]
  const held = new Held(SOUND_FROM, ON_AIR_AT + 3600, SOUND_FROM + 0.5)
  const { picture, starter, pass } = bench(held, raised)

  starter.check()
  pass(OVERDUE_START_SECONDS)
  held.to = SOUND_FROM + 3.7
  starter.check()

  assert.equal(picture.plays, 0)

  pass(raised)
  held.to = SOUND_FROM + 5
  starter.check()

  assert.equal(picture.plays, 1)
  assert.deepEqual(picture.put, [SOUND_FROM + 5 - raised])
})

test('a start that comes in time is never the forced one: the bound is past every ordinary start', () => {
  for (const target of BUFFER_STEPS_SECONDS) {
    const held = new Held(SOUND_FROM, ON_AIR_AT, ON_AIR_AT + 0.05)
    const { picture, starter, pass } = bench(held, target)

    starter.check()
    pass(target + LATE_START_SECONDS)
    held.to = ON_AIR_AT + 0.1
    starter.check()

    assert.equal(picture.plays, 1, `${target} s wanted`)
    assert.deepEqual(picture.put, [ON_AIR_AT], `${target} s wanted`)
  }
})

test('a forced start happens once, and a refusal of it is told once', async () => {
  const held = new Held(SOUND_FROM, ON_AIR_AT + 3600, SOUND_FROM + 4)
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
