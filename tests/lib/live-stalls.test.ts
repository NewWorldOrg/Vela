import assert from 'node:assert/strict'
import { test } from 'node:test'

import { SEEK_SETTLES_SECONDS, START_SETTLES_SECONDS } from '@/lib/live-buffer'
import { LiveStalls } from '@/lib/live-stalls'

class Picture {
  seeking = false

  private readonly heard = new Map<string, Set<() => void>>()

  addEventListener(type: string, heard: () => void): void {
    const listening = this.heard.get(type) ?? new Set()

    listening.add(heard)
    this.heard.set(type, listening)
  }

  removeEventListener(type: string, heard: () => void): void {
    this.heard.get(type)?.delete(heard)
  }

  says(type: string): void {
    for (const heard of this.heard.get(type) ?? []) {
      heard()
    }
  }

  listeners(): number {
    return [...this.heard.values()].reduce(
      (sum, listening) => sum + listening.size,
      0,
    )
  }
}

function bench() {
  const picture = new Picture()
  const clock = { ms: 0 }
  let stalls = 0
  const watch = new LiveStalls(
    picture,
    () => clock.ms,
    () => {
      stalls += 1
    },
  )

  const pass = (seconds: number) => {
    clock.ms += seconds * 1000
  }

  return {
    picture,
    watch,
    stalls: () => stalls,
    pass,
    plays: () => {
      picture.says('playing')
      pass(START_SETTLES_SECONDS)
    },
  }
}

test('a wait while the picture is playing is a stall', () => {
  const { picture, stalls, plays } = bench()

  plays()
  picture.says('waiting')

  assert.equal(stalls(), 1)
})

test('the wait before the picture first plays is not a stall', () => {
  const { picture, stalls } = bench()

  picture.says('waiting')

  assert.equal(stalls(), 0)
})

test('a wait in the first seconds of a play is part of starting, not a stall', () => {
  const { picture, stalls, pass } = bench()

  picture.says('playing')
  picture.says('waiting')
  picture.says('playing')
  pass(START_SETTLES_SECONDS - 0.1)
  picture.says('waiting')

  assert.equal(stalls(), 0)
})

test('the first seconds are counted from the first time the picture plays, and a wait after them is a stall', () => {
  const { picture, stalls, pass } = bench()

  picture.says('waiting')
  pass(30)
  picture.says('playing')
  pass(START_SETTLES_SECONDS - 0.1)
  picture.says('waiting')

  assert.equal(stalls(), 0)

  picture.says('playing')
  pass(0.1)
  picture.says('waiting')

  assert.equal(stalls(), 1)
})

test('one wait is one stall until the picture plays again', () => {
  const { picture, stalls, plays } = bench()

  plays()
  picture.says('waiting')
  picture.says('waiting')

  assert.equal(stalls(), 1)

  picture.says('playing')
  picture.says('waiting')

  assert.equal(stalls(), 2)
})

test('a wait while the picture is seeking is not a stall', () => {
  const { picture, stalls, plays } = bench()

  plays()
  picture.seeking = true
  picture.says('seeking')
  picture.says('waiting')

  assert.equal(stalls(), 0)
})

test('a wait just after a seek has finished is not a stall', () => {
  const { picture, stalls, pass, plays } = bench()

  plays()
  picture.says('seeking')
  pass(SEEK_SETTLES_SECONDS - 0.1)
  picture.says('waiting')

  assert.equal(stalls(), 0)
})

test('a wait after the seek has settled is a stall', () => {
  const { picture, stalls, pass, plays } = bench()

  plays()
  picture.says('seeking')
  picture.says('waiting')
  picture.says('playing')
  pass(SEEK_SETTLES_SECONDS)
  picture.says('waiting')

  assert.equal(stalls(), 1)
})

test('a wait after a pause is not a stall until the picture plays again', () => {
  const { picture, stalls, plays } = bench()

  plays()
  picture.says('pause')
  picture.says('waiting')

  assert.equal(stalls(), 0)

  picture.says('playing')
  picture.says('waiting')

  assert.equal(stalls(), 1)
})

test('it says whether the picture is playing, which is what a calm stretch is counted over', () => {
  const { picture, watch } = bench()

  assert.equal(watch.playing, false)

  picture.says('playing')

  assert.equal(watch.playing, true)

  picture.says('waiting')

  assert.equal(watch.playing, false)

  picture.says('playing')
  picture.says('pause')

  assert.equal(watch.playing, false)
})

test('a channel change leaves the picture, and what it says afterwards is not heard', () => {
  const { picture, watch, stalls } = bench()

  picture.says('playing')
  watch.leave()

  assert.equal(picture.listeners(), 0)

  picture.says('waiting')

  assert.equal(stalls(), 0)
  assert.equal(watch.playing, false)
})

test('the wait a new channel opens with is not a stall', () => {
  const picture = new Picture()
  let stalls = 0
  const count = () => {
    stalls += 1
  }
  const before = new LiveStalls(picture, () => 0, count)

  picture.says('playing')
  before.leave()

  new LiveStalls(picture, () => 0, count)
  picture.says('waiting')

  assert.equal(stalls, 0)
})
