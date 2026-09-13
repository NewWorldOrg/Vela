import assert from 'node:assert/strict'
import { test } from 'node:test'

import { keepReading, type ReadingClock } from '@/hooks/useReadAgain'

const A_MINUTE = 60_000

class HandTurnedClock implements ReadingClock {
  private at = 1_000_000

  private shown = true

  private timers = new Map<
    number,
    { due: number; every?: number; run: () => void }
  >()

  private watchers = new Set<() => void>()

  private nth = 0

  now = () => this.at

  visible = () => this.shown

  after = (run: () => void, ms: number) => this.arm({ due: this.at + ms, run })

  every = (run: () => void, ms: number) =>
    this.arm({ due: this.at + ms, every: ms, run })

  whenVisibilityChanges = (run: () => void) => {
    this.watchers.add(run)

    return () => {
      this.watchers.delete(run)
    }
  }

  get armed(): number {
    return this.timers.size + this.watchers.size
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

      if (one.every === undefined) {
        this.timers.delete(id)
      } else {
        one.due = this.at + one.every
      }

      one.run()
    }

    this.at = until
  }

  goAway(): void {
    this.shown = false
    this.tellTheWatchers()
  }

  comeBack(): void {
    this.shown = true
    this.tellTheWatchers()
  }

  private arm(timer: { due: number; every?: number; run: () => void }) {
    const id = (this.nth += 1)

    this.timers.set(id, timer)

    return () => {
      this.timers.delete(id)
    }
  }

  private tellTheWatchers(): void {
    for (const watcher of [...this.watchers]) {
      watcher()
    }
  }
}

function counting() {
  const reads: number[] = []

  return { reads, read: () => reads.push(reads.length) }
}

test('the mark the programme changes at is read once, when it arrives', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(clock.now() + A_MINUTE, undefined, read, clock)

  clock.goForward(A_MINUTE - 1)
  assert.equal(reads.length, 0)

  clock.goForward(1)
  assert.equal(reads.length, 1)

  clock.goForward(A_MINUTE * 10)
  assert.equal(reads.length, 1)
})

test('a mark that has already gone by is never read for', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(clock.now() - A_MINUTE, undefined, read, clock)

  clock.goForward(A_MINUTE * 10)
  assert.equal(reads.length, 0)
})

test('a mark that is exactly now is not in the future, so it is not waited for', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(clock.now(), undefined, read, clock)

  clock.goForward(A_MINUTE * 10)
  assert.equal(reads.length, 0)
})

test('the poll reads every period while the page is being looked at', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(undefined, A_MINUTE, read, clock)

  clock.goForward(A_MINUTE * 3)
  assert.equal(reads.length, 3)
})

test('the poll stops while the page is hidden, and is not caught up period by period', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(undefined, A_MINUTE, read, clock)

  clock.goAway()
  clock.goForward(A_MINUTE * 30)

  assert.equal(reads.length, 0)
})

test('coming back after longer than a period is worth exactly one read', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(undefined, A_MINUTE, read, clock)

  clock.goAway()
  clock.goForward(A_MINUTE * 30)
  clock.comeBack()

  assert.equal(reads.length, 1)
})

test('coming back before a period has passed is worth no read at all', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(undefined, A_MINUTE, read, clock)

  clock.goAway()
  clock.goForward(A_MINUTE / 2)
  clock.comeBack()

  assert.equal(reads.length, 0)
})

test('the poll runs again once the page is back', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(undefined, A_MINUTE, read, clock)

  clock.goAway()
  clock.goForward(A_MINUTE * 30)
  clock.comeBack()
  clock.goForward(A_MINUTE * 2)

  assert.equal(reads.length, 3)
})

test('going away and back twice does not leave two polls running', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(undefined, A_MINUTE, read, clock)

  clock.goAway()
  clock.comeBack()
  clock.goAway()
  clock.comeBack()
  clock.goForward(A_MINUTE)

  assert.equal(reads.length, 1)
})

test('a mark that arrives while the page is hidden is read for once on the way back', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(clock.now() + A_MINUTE, undefined, read, clock)

  clock.goAway()
  clock.goForward(A_MINUTE * 2)
  assert.equal(reads.length, 0)

  clock.comeBack()
  assert.equal(reads.length, 1)

  clock.comeBack()
  assert.equal(reads.length, 1)
})

test('the mark and the poll together are still worth one read on the way back', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  keepReading(clock.now() + A_MINUTE, A_MINUTE, read, clock)

  clock.goAway()
  clock.goForward(A_MINUTE * 30)
  clock.comeBack()

  assert.equal(reads.length, 1)
})

test('giving up leaves no timer, no poll and no watcher behind', () => {
  const clock = new HandTurnedClock()
  const { reads, read } = counting()

  const stop = keepReading(clock.now() + A_MINUTE, A_MINUTE, read, clock)

  assert.notEqual(clock.armed, 0)

  stop()

  assert.equal(clock.armed, 0)

  clock.goForward(A_MINUTE * 10)
  clock.comeBack()

  assert.equal(reads.length, 0)
})
