import assert from 'node:assert/strict'
import { test } from 'node:test'

import { TARGET_SECONDS } from '@/lib/live-latency'
import { LiveStart, LiveStill } from '@/lib/live-start'

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

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

type Heard = 'playing' | 'timeupdate'

class Screen {
  currentTime = 0

  readonly listening = new Map<Heard, Set<() => void>>()

  addEventListener(type: Heard, listener: () => void): void {
    const set = this.listening.get(type) ?? new Set()

    set.add(listener)
    this.listening.set(type, set)
  }

  removeEventListener(type: Heard, listener: () => void): void {
    this.listening.get(type)?.delete(listener)
  }

  says(type: Heard): void {
    for (const listener of this.listening.get(type) ?? []) {
      listener()
    }
  }

  listeners(): number {
    return [...this.listening.values()].reduce((sum, set) => sum + set.size, 0)
  }
}

class FramingScreen extends Screen {
  armed: (() => void) | null = null

  cancelled: number[] = []

  requestVideoFrameCallback(callback: () => void): number {
    this.armed = callback

    return 7
  }

  cancelVideoFrameCallback(handle: number): void {
    this.armed = null
    this.cancelled.push(handle)
  }

  presents(): void {
    const armed = this.armed

    this.armed = null
    armed?.()
  }
}

function stillOn(screen: Screen) {
  const shown: (string | null)[] = []
  const made: Uint8Array[] = []
  const freed: string[] = []
  const still = new LiveStill(screen, (href) => shown.push(href), {
    make: (jpeg) => {
      made.push(jpeg)

      return `blob:still-${made.length}`
    },
    free: (href) => freed.push(href),
  })

  return { still, shown, made, freed }
}

test('a still offered before the first picture is shown', () => {
  const { still, shown, made } = stillOn(new FramingScreen())

  still.offer(JPEG)

  assert.deepEqual(made, [JPEG])
  assert.deepEqual(shown, ['blob:still-1'])
})

test('the still is taken off and its address freed once the first picture is presented', () => {
  const screen = new FramingScreen()
  const { still, shown, freed } = stillOn(screen)

  still.offer(JPEG)
  screen.presents()

  assert.deepEqual(shown, ['blob:still-1', null])
  assert.deepEqual(freed, ['blob:still-1'])
})

test('a still that comes after the first picture was presented is not shown', () => {
  const screen = new FramingScreen()
  const { still, shown, made } = stillOn(screen)

  screen.presents()
  still.offer(JPEG)

  assert.deepEqual(made, [])
  assert.deepEqual(shown, [])
})

test('a second still does not replace the first', () => {
  const { still, shown, made } = stillOn(new FramingScreen())

  still.offer(JPEG)
  still.offer(JPEG)

  assert.equal(made.length, 1)
  assert.deepEqual(shown, ['blob:still-1'])
})

test('closing takes the still off, frees its address and stops waiting for a frame', () => {
  const screen = new FramingScreen()
  const { still, shown, freed } = stillOn(screen)

  still.offer(JPEG)
  still.close()

  assert.deepEqual(shown, ['blob:still-1', null])
  assert.deepEqual(freed, ['blob:still-1'])
  assert.equal(screen.armed, null)
  assert.deepEqual(screen.cancelled, [7])

  still.offer(JPEG)

  assert.equal(shown.length, 2)
})

test('closing with no still shown tells nothing', () => {
  const { still, shown, freed } = stillOn(new FramingScreen())

  still.close()

  assert.deepEqual(shown, [])
  assert.deepEqual(freed, [])
})

test('without frame callbacks, the still stays through playing until the playhead moves on', () => {
  const screen = new Screen()
  const { still, shown, freed } = stillOn(screen)

  screen.currentTime = ON_AIR_AT
  still.offer(JPEG)
  screen.says('timeupdate')
  screen.says('playing')
  screen.says('timeupdate')

  assert.deepEqual(shown, ['blob:still-1'])

  screen.currentTime = ON_AIR_AT + 0.04
  screen.says('timeupdate')

  assert.deepEqual(shown, ['blob:still-1', null])
  assert.deepEqual(freed, ['blob:still-1'])
})

test('a playhead set before playing does not count as the picture moving', () => {
  const screen = new Screen()
  const { still, shown } = stillOn(screen)

  still.offer(JPEG)
  screen.currentTime = ON_AIR_AT
  screen.says('timeupdate')

  assert.deepEqual(shown, ['blob:still-1'])
})

test('closing without frame callbacks stops listening to the picture', () => {
  const screen = new Screen()
  const { still } = stillOn(screen)

  still.close()

  assert.equal(screen.listeners(), 0)
})
