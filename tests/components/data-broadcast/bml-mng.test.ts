import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  MOST_UPDATES_AT_ONCE,
  MngPlayer,
  type MngHost,
} from '@/components/data-broadcast/bml-mng'
import { FOREVER, readMng, type MngAnimation } from '@/lib/bml/mng'
import {
  FakeBitmap,
  FakeCanvas,
  FakeDocument,
  FakeTimers,
} from '@/tests/components/data-broadcast/frame-fakes'
import {
  MEND,
  defi,
  fram,
  loop,
  endl,
  mhdr,
  mng,
  picture,
  term,
} from '@/tests/lib/bml/mng-files'

function animationOf(bytes: Uint8Array): MngAnimation {
  const reading = readMng(bytes)

  assert.equal(reading.read, 'mng')

  return (reading as { mng: MngAnimation }).mng
}

const THREE = animationOf(
  mng(
    mhdr(40, 30, 100),
    fram({ mode: 1, delay: 10, lasting: true }),
    picture(40, 30),
    fram({ delay: 50 }),
    defi(5, -3),
    picture(10, 10),
    fram({ delay: 25 }),
    picture(40, 30),
    MEND,
  ),
)

const ENDLESS = animationOf(
  mng(
    mhdr(40, 30, 100),
    term(3, 0, 0, FOREVER),
    fram({ mode: 1, delay: 10, lasting: true }),
    picture(40, 30),
    picture(40, 30),
    MEND,
  ),
)

function stage(animation: MngAnimation, options: { fails?: number[] } = {}) {
  const document = new FakeDocument()
  const root = document.createElement('div')
  const canvas = document.createElement('canvas') as FakeCanvas
  const timers = new FakeTimers()
  const warnings: string[] = []
  const bitmaps: FakeBitmap[] = []

  document.root = root
  root.append(canvas)

  const host: MngHost<FakeBitmap> = {
    decode: async () => {
      const bitmap = new FakeBitmap(`#${bitmaps.length}`)

      bitmaps.push(bitmap)

      if (options.fails?.includes(bitmaps.length - 1)) {
        throw new Error('not a picture')
      }

      return bitmap
    },
    setTimeout: (run, ms) => timers.setTimeout(run, ms),
    clearTimeout: (id) => timers.clearTimeout(id),
    warn: (message) => warnings.push(message),
  }
  const player = new MngPlayer(canvas, animation, host)

  return {
    canvas,
    timers,
    warnings,
    bitmaps,
    player,
    drawn: canvas.surface.drawn,
  }
}

const decoded = () => new Promise((resolve) => setImmediate(resolve))

test('the canvas takes the size of the frame, and each frame is drawn at its place for as long as its delay', async () => {
  const { canvas, timers, bitmaps, player, drawn } = stage(THREE)

  player.play()
  await decoded()

  assert.equal(canvas.width, 40)
  assert.equal(canvas.height, 30)
  assert.deepEqual(drawn, ['clear 0,0,40,30', '#0 at 0,0 in 0,0,40,30'])

  timers.tick(99)
  assert.equal(drawn.length, 2)

  timers.tick(1)
  assert.deepEqual(drawn.slice(2), ['#1 at 5,-3 in 0,0,40,30'])

  timers.tick(499)
  assert.equal(drawn.length, 3)

  timers.tick(1)
  assert.deepEqual(drawn.slice(3), ['#2 at 0,0 in 0,0,40,30'])
  assert.equal(
    bitmaps.some((bitmap) => bitmap.closed),
    false,
  )

  timers.tick(250)
  assert.equal(drawn.length, 4)
  assert.equal(
    bitmaps.every((bitmap) => bitmap.closed),
    true,
  )
  assert.equal(timers.waiting, 0)
  assert.equal(player.playing, false)
})

test('one that repeats for ever goes round until it is stopped, and stopping lets its pictures go', async () => {
  const { timers, bitmaps, player, drawn } = stage(ENDLESS)

  player.play()
  await decoded()

  for (let at = 0; at < 5; at += 1) {
    timers.tick(100)
  }

  assert.deepEqual(drawn, [
    'clear 0,0,40,30',
    '#0 at 0,0 in 0,0,40,30',
    '#1 at 0,0 in 0,0,40,30',
    'clear 0,0,40,30',
    '#0 at 0,0 in 0,0,40,30',
    '#1 at 0,0 in 0,0,40,30',
    'clear 0,0,40,30',
    '#0 at 0,0 in 0,0,40,30',
    '#1 at 0,0 in 0,0,40,30',
  ])

  player.stop()
  timers.tick(100)

  assert.equal(drawn.length, 9)
  assert.equal(
    bitmaps.every((bitmap) => bitmap.closed),
    true,
  )
  assert.equal(timers.waiting, 0)
})

test('it stops and lets its pictures go once its canvas has left the document', async () => {
  const { canvas, timers, bitmaps, player, drawn } = stage(ENDLESS)

  player.play()
  await decoded()
  canvas.remove()
  timers.tick(100)

  assert.equal(drawn.length, 2)
  assert.equal(
    bitmaps.every((bitmap) => bitmap.closed),
    true,
  )
  assert.equal(player.playing, false)
  assert.equal(timers.waiting, 0)
})

test('a picture that does not decode stops it with a warning and lets go of those that did', async () => {
  const { warnings, bitmaps, player, drawn } = stage(THREE, { fails: [1] })

  player.play()
  await decoded()

  assert.deepEqual(drawn, [])
  assert.deepEqual(warnings, ['an MNG image that does not decode'])
  assert.equal(bitmaps[0].closed, true)
  assert.equal(bitmaps[2].closed, true)
  assert.equal(player.playing, false)
})

test('stopped before its pictures are decoded, it draws nothing and lets them go when they come', async () => {
  const { bitmaps, player, drawn, warnings, timers } = stage(THREE)

  player.play()
  player.stop()
  await decoded()

  assert.deepEqual(drawn, [])
  assert.deepEqual(warnings, [])
  assert.equal(bitmaps.length, 3)
  assert.equal(
    bitmaps.every((bitmap) => bitmap.closed),
    true,
  )
  assert.equal(timers.waiting, 0)
})

test('frames of no delay are drawn together, a bounded number at once, before the page is let through', async () => {
  const { timers, player, drawn } = stage(
    animationOf(
      mng(
        mhdr(40, 30, 100),
        fram({ mode: 1, delay: 0, lasting: true }),
        loop(0, FOREVER),
        picture(40, 30),
        endl(0),
        MEND,
      ),
    ),
  )

  player.play()
  await decoded()

  assert.equal(
    drawn.filter((line) => line.startsWith('#')).length,
    MOST_UPDATES_AT_ONCE,
  )
  assert.equal(timers.waiting, 1)

  player.stop()
})

test('a canvas without a 2D context is a warning and nothing more', async () => {
  const { canvas, player, warnings, bitmaps } = stage(THREE)

  canvas.getContext = () => null
  player.play()
  await decoded()

  assert.deepEqual(warnings, ['no canvas to draw an MNG on'])
  assert.equal(bitmaps.length, 0)
  assert.equal(player.playing, false)
})
