import assert from 'node:assert/strict'
import { test } from 'node:test'

import { TARGET_SECONDS } from '@/lib/live-latency'
import { LiveStart } from '@/components/live/live-start'

const ON_AIR_AT = 43_210.5

class Picture {
  currentTime = 0

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

  constructor(from?: number, to?: number) {
    this.from = from
    this.to = to
  }

  start(): number | undefined {
    return this.from
  }

  end(): number | undefined {
    return this.to
  }
}

function bench(held: Held) {
  const picture = new Picture()
  let refusals = 0
  const starter = new LiveStart(picture, held, () => {
    refusals += 1
  })

  return { picture, starter, refusals: () => refusals }
}

test('with nothing buffered, nothing is played', () => {
  const { picture, starter } = bench(new Held())

  starter.check()

  assert.equal(picture.plays, 0)
  assert.equal(picture.currentTime, 0)
  assert.equal(starter.started, false)
})

test('short of the target, nothing is played', () => {
  const { picture, starter } = bench(
    new Held(ON_AIR_AT, ON_AIR_AT + TARGET_SECONDS - 0.05),
  )

  starter.check()

  assert.equal(picture.plays, 0)
  assert.equal(starter.started, false)
})

test('the check that finds the target held puts the playhead the target behind the edge and plays', () => {
  const { picture, starter } = bench(new Held(ON_AIR_AT, ON_AIR_AT + 1.5))

  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 1.5 - TARGET_SECONDS)
  assert.equal(starter.started, true)
})

test('it starts once, and later checks leave the playhead to the latency steering', () => {
  const held = new Held(ON_AIR_AT, ON_AIR_AT + 1)
  const { picture, starter } = bench(held)

  starter.check()
  held.to = ON_AIR_AT + 3
  starter.check()

  assert.equal(picture.plays, 1)
  assert.equal(picture.currentTime, ON_AIR_AT + 1 - TARGET_SECONDS)
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
