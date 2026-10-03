import assert from 'node:assert/strict'
import { mock, test, type TestContext } from 'node:test'

import {
  RecordingCaptions,
  RESTS_AFTER_A_REFUSAL_MS,
} from '@/components/recordings/recording-captions'
import type { CaptionWindow, TimedCaption } from '@/lib/recording-captions'
import type { CaptionWindowRead } from '@/repository/video-captions'

const READ_MS = 100

class NoticesNothing {
  observe(): void {}

  disconnect(): void {}
}

Object.assign(globalThis, {
  MutationObserver: NoticesNothing,
  createImageBitmap: async (blob: Blob) => ({
    tag: new Uint8Array(await blob.arrayBuffer())[0],
    close: () => {},
  }),
  window: { devicePixelRatio: 1 },
})

function settled(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

async function settledTwice(): Promise<void> {
  await settled()
  await settled()
}

function said(atSec: number, tag: number): TimedCaption {
  return {
    atSec,
    picture: {
      left: 360,
      top: 940,
      width: 720,
      height: 88,
      png: new Uint8Array([tag]),
    },
  }
}

function cleared(atSec: number): TimedCaption {
  return { atSec, picture: null }
}

function windowOf(untilSec: number, cues: TimedCaption[]): CaptionWindow {
  return { canvas: { width: 1440, height: 1080 }, untilSec, cues }
}

interface Asked {
  fromSec: number
  signal: AbortSignal
  answer: (read: CaptionWindowRead) => void
}

function bench() {
  const drawn: number[] = []
  const context = {
    clearRect: () => {},
    drawImage: (bitmap: { tag: number }) => drawn.push(bitmap.tag),
  }
  const canvas = {
    dataset: {} as Record<string, string>,
    clientWidth: 960,
    clientHeight: 540,
    width: 0,
    height: 0,
    getContext: () => context,
    getAttribute: (): string | null => canvasDrawn,
  }
  let canvasDrawn: string | null = 'yes'
  let seconds: number | null = null
  const video = {
    videoWidth: 1920,
    videoHeight: 1080,
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  const asked: Asked[] = []

  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    video: video as unknown as HTMLVideoElement,
    clock: () => seconds,
    read: (fromSec: number, signal: AbortSignal) =>
      new Promise<CaptionWindowRead>((answer) => {
        asked.push({ fromSec, signal, answer })
      }),
    asked,
    said: () => canvas.dataset.caption,
    lastDrawn: () => drawn.at(-1),
    at: (given: number | null) => {
      seconds = given
    },
    hide: () => {
      canvasDrawn = 'no'
    },
  }
}

function playing(t: TestContext) {
  mock.timers.enable({ apis: ['setInterval', 'Date'] })

  const stand = bench()
  const layer = new RecordingCaptions(
    stand.canvas,
    stand.video,
    stand.clock,
    stand.read,
  )

  t.after(() => {
    layer.close()
    mock.timers.reset()
  })

  const tick = async (at: number | null) => {
    stand.at(at)
    mock.timers.tick(READ_MS)
    await settledTwice()
  }

  return { stand, layer, tick }
}

const OPENING = windowOf(600, [
  said(0, 1),
  cleared(4),
  said(10, 2),
  cleared(14),
])

test('nothing is asked for until a picture is on screen', async (t) => {
  const { stand, tick } = playing(t)

  await tick(null)

  assert.equal(stand.asked.length, 0)
})

test('the caption drawn is the one the second on screen calls for', async (t) => {
  const { stand, tick } = playing(t)

  await tick(0)
  assert.equal(stand.asked[0].fromSec, 0)
  stand.asked[0].answer({ state: 'read', window: OPENING })
  await settledTwice()

  await tick(1)
  assert.equal(stand.said(), 'shown')
  assert.equal(stand.lastDrawn(), 1)

  await tick(5)
  assert.equal(stand.said(), 'none')

  await tick(10)
  assert.equal(stand.said(), 'shown')
  assert.equal(stand.lastDrawn(), 2)
})

test('played faster, the captions change as much faster as the seconds do', async (t) => {
  const { stand, tick } = playing(t)

  await tick(0)
  stand.asked[0].answer({ state: 'read', window: OPENING })
  await settledTwice()

  const seen: (string | undefined)[] = []

  for (let second = 0; second < 15; second += 1.5) {
    await tick(second)
    seen.push(stand.said())
  }

  assert.deepEqual(seen, [
    'shown',
    'shown',
    'shown',
    'none',
    'none',
    'none',
    'none',
    'shown',
    'shown',
    'shown',
  ])
})

test('with no second to read, the caption that was showing stays with the picture that is held', async (t) => {
  const { stand, tick } = playing(t)

  await tick(1)
  stand.asked[0].answer({ state: 'read', window: OPENING })
  await settledTwice()
  assert.equal(stand.said(), 'shown')

  await tick(null)
  assert.equal(stand.said(), 'shown')
  assert.equal(stand.asked.length, 1)
})

test('two minutes from the end of what is held, the next ten minutes are read and joined on', async (t) => {
  const { stand, tick } = playing(t)

  await tick(0)
  stand.asked[0].answer({ state: 'read', window: OPENING })
  await settledTwice()

  await tick(470)
  assert.equal(stand.asked.length, 1)

  await tick(481)
  assert.equal(stand.asked.length, 2)
  assert.equal(stand.asked[1].fromSec, 600)

  await tick(482)
  assert.equal(stand.asked.length, 2)

  stand.asked[1].answer({
    state: 'read',
    window: windowOf(1200, [cleared(14), said(601, 3)]),
  })
  await settledTwice()

  await tick(600.5)
  assert.equal(stand.said(), 'none')
  await tick(602)
  assert.equal(stand.said(), 'shown')
  assert.equal(stand.lastDrawn(), 3)
  assert.equal(stand.asked.length, 2)
})

test('a jump past what is held draws nothing until that second has been read', async (t) => {
  const { stand, tick } = playing(t)

  await tick(1)
  stand.asked[0].answer({ state: 'read', window: OPENING })
  await settledTwice()
  assert.equal(stand.said(), 'shown')

  await tick(2401)
  assert.equal(stand.said(), 'none')
  assert.equal(stand.asked.at(-1)?.fromSec, 2401)

  await tick(2401.5)
  assert.equal(stand.asked.length, 2)

  stand.asked[1].answer({
    state: 'read',
    window: windowOf(3001, [said(2399, 4)]),
  })
  await settledTwice()
  await tick(2402)
  assert.equal(stand.lastDrawn(), 4)
})

test('a jump back into what is held needs no read, and the read on its way is dropped', async (t) => {
  const { stand, tick } = playing(t)

  await tick(1)
  stand.asked[0].answer({ state: 'read', window: OPENING })
  await settledTwice()

  await tick(2401)
  const far = stand.asked[1]

  await tick(11)
  assert.equal(far.signal.aborted, true)
  assert.equal(stand.lastDrawn(), 2)

  far.answer({ state: 'read', window: windowOf(3001, [said(2399, 4)]) })
  await settledTwice()
  await tick(12)
  assert.equal(stand.lastDrawn(), 2)
  assert.equal(stand.asked.length, 2)
})

test('captions still being taken are asked for again after a rest', async (t) => {
  const { stand, tick } = playing(t)

  await tick(0)
  stand.asked[0].answer({ state: 'coming' })
  await settledTwice()

  await tick(1)
  assert.equal(stand.asked.length, 1)

  mock.timers.tick(RESTS_AFTER_A_REFUSAL_MS)
  await tick(2)
  assert.equal(stand.asked.length, 2)
})

test('a recording found to have no captions is not asked again', async (t) => {
  const { stand, tick } = playing(t)

  await tick(0)
  stand.asked[0].answer({ state: 'none' })
  await settledTwice()

  mock.timers.tick(RESTS_AFTER_A_REFUSAL_MS)
  await tick(700)

  assert.equal(stand.asked.length, 1)
  assert.equal(stand.said(), 'none')
})

test('switched off, the caption is followed but not drawn', async (t) => {
  const { stand, tick } = playing(t)

  stand.hide()
  await tick(1)
  stand.asked[0].answer({ state: 'read', window: OPENING })
  await settledTwice()
  await tick(2)

  assert.equal(stand.said(), 'off')
})

test('closing drops the read on its way', async (t) => {
  const { stand, layer, tick } = playing(t)

  await tick(0)
  layer.close()

  assert.equal(stand.asked[0].signal.aborted, true)
})
