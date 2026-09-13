import assert from 'node:assert/strict'
import { test } from 'node:test'

import { keepTicking, type TickingClock } from '@/hooks/useNow'

const HALF_A_MINUTE = 30_000

class HandTurnedClock implements TickingClock {
  private at: number

  private timers = new Map<number, { due: number; run: () => void }>()

  private nth = 0

  constructor(from: number) {
    this.at = from
  }

  now = () => this.at

  after = (run: () => void, ms: number) => {
    const id = (this.nth += 1)

    this.timers.set(id, { due: this.at + ms, run })

    return () => {
      this.timers.delete(id)
    }
  }

  get armed(): number {
    return this.timers.size
  }

  goForward(ms: number): void {
    const until = this.at + ms

    for (;;) {
      const next = [...this.timers.entries()]
        .filter(([, one]) => one.due <= until)
        .sort(([, left], [, right]) => left.due - right.due)[0]

      if (next === undefined) {
        break
      }

      const [id, one] = next

      this.at = one.due
      this.timers.delete(id)
      one.run()
    }

    this.at = until
  }
}

function told(clock: TickingClock, everyMs: number) {
  const heard: number[] = []
  const stop = keepTicking(everyMs, (at) => heard.push(at.getTime()), clock)

  return { heard, stop }
}

test('the time is told straight away, before any waiting', () => {
  const clock = new HandTurnedClock(1_000_000)
  const { heard } = told(clock, HALF_A_MINUTE)

  assert.deepEqual(heard, [1_000_000])
})

test('the next telling lands on the boundary of the period, not a period after the mount', () => {
  const clock = new HandTurnedClock(1_000_000 + 7_000)
  const { heard } = told(clock, HALF_A_MINUTE)

  clock.goForward(HALF_A_MINUTE)

  assert.deepEqual(heard, [1_007_000, 1_020_000])
})

test('the tellings after that keep to the boundary', () => {
  const clock = new HandTurnedClock(1_000_000 + 7_000)
  const { heard } = told(clock, HALF_A_MINUTE)

  clock.goForward(HALF_A_MINUTE * 3)

  assert.deepEqual(heard, [1_007_000, 1_020_000, 1_050_000, 1_080_000])
})

test('a mount that is already exactly on the boundary waits a whole period', () => {
  const clock = new HandTurnedClock(1_020_000)
  const { heard } = told(clock, HALF_A_MINUTE)

  clock.goForward(HALF_A_MINUTE - 1)
  assert.deepEqual(heard, [1_020_000])

  clock.goForward(1)
  assert.deepEqual(heard, [1_020_000, 1_050_000])
})

test('giving up leaves nothing waiting and nothing is told again', () => {
  const clock = new HandTurnedClock(1_000_000)
  const { heard, stop } = told(clock, HALF_A_MINUTE)

  stop()

  assert.equal(clock.armed, 0)

  clock.goForward(HALF_A_MINUTE * 10)

  assert.deepEqual(heard, [1_000_000])
})

test('giving up after several tellings still leaves nothing waiting', () => {
  const clock = new HandTurnedClock(1_000_000)
  const { heard, stop } = told(clock, HALF_A_MINUTE)

  clock.goForward(HALF_A_MINUTE * 3)
  stop()

  assert.equal(clock.armed, 0)

  clock.goForward(HALF_A_MINUTE * 10)

  assert.equal(heard.length, 4)
})
