import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { TickingClock } from '@/hooks/useNow'
import {
  keepPositionWhilePlaying,
  type PositionKeeping,
} from '@/hooks/useKeptPosition'
import { KEPT_EVERY_MS } from '@/lib/playback-resume'

class HandTurnedClock implements TickingClock {
  private at = 0

  private timers = new Map<number, { due: number; run: () => void }>()

  private nth = 0

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

function watching(from: number) {
  const reached = { at: from }
  const kept: number[] = []
  const clock = new HandTurnedClock()
  const keeping: PositionKeeping = {
    reading: () => reached.at,
    sent: {},
    keep: (second) => kept.push(second),
  }

  const stop = keepPositionWhilePlaying(KEPT_EVERY_MS, keeping, clock)

  return { reached, kept, clock, stop }
}

test('the period this build keeps to is the one it says it keeps to', () => {
  assert.equal(KEPT_EVERY_MS, 15_000)
})

test('nothing is sent before a whole period has passed', () => {
  const { kept, clock } = watching(600)

  clock.goForward(KEPT_EVERY_MS - 1)

  assert.deepEqual(kept, [])
})

test('the position is sent once the period has passed', () => {
  const { kept, clock } = watching(600)

  clock.goForward(KEPT_EVERY_MS)

  assert.deepEqual(kept, [600])
})

test('each period sends where the recording has got to by then', () => {
  const { reached, kept, clock } = watching(600)

  clock.goForward(KEPT_EVERY_MS)
  reached.at = 615
  clock.goForward(KEPT_EVERY_MS)
  reached.at = 630
  clock.goForward(KEPT_EVERY_MS)

  assert.deepEqual(kept, [600, 615, 630])
})

test('a position that has not moved on is not sent again, however long it stands', () => {
  const { kept, clock } = watching(600)

  clock.goForward(KEPT_EVERY_MS * 8)

  assert.deepEqual(kept, [600])
})

test('a fraction of a second is sent as the whole second it is in', () => {
  const { reached, kept, clock } = watching(0)

  reached.at = 612.9
  clock.goForward(KEPT_EVERY_MS)

  assert.deepEqual(kept, [612])
})

test('stopping sends where the recording got to, without waiting for the period', () => {
  const { reached, kept, clock, stop } = watching(600)

  clock.goForward(KEPT_EVERY_MS)
  reached.at = 607
  clock.goForward(KEPT_EVERY_MS - 1)
  stop()

  assert.deepEqual(kept, [600, 607])
})

test('stopping on a second already sent adds nothing', () => {
  const { kept, clock, stop } = watching(600)

  clock.goForward(KEPT_EVERY_MS)
  stop()

  assert.deepEqual(kept, [600])
})

test('stopping before a single period has passed still sends where it got to', () => {
  const { kept, stop } = watching(600)

  stop()

  assert.deepEqual(kept, [600])
})

test('stopping leaves nothing waiting, and nothing is sent after it', () => {
  const { reached, kept, clock, stop } = watching(600)

  clock.goForward(KEPT_EVERY_MS)
  stop()

  assert.equal(clock.armed, 0)

  reached.at = 900
  clock.goForward(KEPT_EVERY_MS * 10)

  assert.deepEqual(kept, [600])
})

test('a run taken up again does not send a second that was already sent', () => {
  const reached = { at: 600 }
  const kept: number[] = []
  const sent: { at?: number } = {}
  const keeping: PositionKeeping = {
    reading: () => reached.at,
    sent,
    keep: (second) => kept.push(second),
  }

  const first = new HandTurnedClock()
  keepPositionWhilePlaying(KEPT_EVERY_MS, keeping, first)()

  const second = new HandTurnedClock()
  keepPositionWhilePlaying(KEPT_EVERY_MS, keeping, second)()

  assert.deepEqual(kept, [600])
})
