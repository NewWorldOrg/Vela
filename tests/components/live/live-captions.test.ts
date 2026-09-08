import assert from 'node:assert/strict'
import { mock, test, type TestContext } from 'node:test'

import { CaptionLayer } from '@/components/live/live-captions'
import { PTS_HERTZ, type CaptionPicture } from '@/lib/live-wire'

const READ_MS = 100

const DUE_AT_SECONDS = 2

const PICTURE: CaptionPicture = {
  left: 0,
  top: 0,
  width: 960,
  height: 120,
  png: new Uint8Array([137, 80, 78, 71]),
}

class NoticesNothing {
  observe(): void {}

  disconnect(): void {}
}

Object.assign(globalThis, {
  MutationObserver: NoticesNothing,
  createImageBitmap: () => Promise.resolve({ close: () => {} }),
  window: { devicePixelRatio: 1 },
})

function settled(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function bench({ reports = true } = {}) {
  const context = { clearRect: () => {}, drawImage: () => {} }
  const canvas = {
    dataset: {} as Record<string, string>,
    clientWidth: 960,
    clientHeight: 540,
    width: 0,
    height: 0,
    getContext: () => context,
    getAttribute: () => null,
  }

  let ticks = 0
  let seconds = 0
  let armed: (() => void) | null = null

  const reporting = {
    requestVideoFrameCallback: (given: () => void) => {
      armed = given

      return 1
    },
    cancelVideoFrameCallback: () => {
      armed = null
    },
  }
  const video = {
    get currentTime() {
      ticks += 1

      return seconds
    },
    videoWidth: 1920,
    videoHeight: 1080,
    buffered: { length: 1, end: () => seconds + 0.6 },
    addEventListener: () => {},
    removeEventListener: () => {},
    ...(reports ? reporting : {}),
  }

  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    video: video as unknown as HTMLVideoElement,
    said: () => canvas.dataset.caption,
    ticks: () => ticks,
    at: (given: number) => {
      seconds = given
    },
    frame: () => {
      const given = armed

      armed = null
      given?.()
    },
  }
}

function playing(t: TestContext, { reports = true } = {}) {
  mock.timers.enable({ apis: ['setInterval'] })

  const stand = bench({ reports })
  const layer = new CaptionLayer(stand.canvas, stand.video)

  t.after(() => {
    layer.close()
    mock.timers.reset()
  })

  return { stand, layer }
}

test('with nothing reporting frames, the captions are still carried on', async (t) => {
  const { stand, layer } = playing(t)

  layer.canvasOf({ width: 960, height: 540 })
  layer.offer(PICTURE, PTS_HERTZ * DUE_AT_SECONDS)
  assert.equal(stand.said(), 'none')

  stand.at(DUE_AT_SECONDS + 1)
  mock.timers.tick(READ_MS)
  await settled()

  assert.equal(stand.said(), 'shown')
})

test('with the frames arriving, the captions come up as they always did', async (t) => {
  const { stand, layer } = playing(t)

  layer.canvasOf({ width: 960, height: 540 })
  layer.offer(PICTURE, PTS_HERTZ * DUE_AT_SECONDS)
  assert.equal(stand.said(), 'none')

  stand.at(DUE_AT_SECONDS + 1)
  stand.frame()
  await settled()

  assert.equal(stand.said(), 'shown')
})

test('while the frames keep arriving, the timer does not drive the captions as well', (t) => {
  const { stand } = playing(t)

  for (let step = 0; step < 20; step += 1) {
    stand.frame()
    mock.timers.tick(READ_MS)
  }

  assert.equal(stand.ticks(), 20)
})

test('when the frames stop the timer carries the captions, and stands down when they come back', (t) => {
  const { stand } = playing(t)

  stand.frame()
  mock.timers.tick(READ_MS)
  assert.equal(stand.ticks(), 1)

  mock.timers.tick(READ_MS)
  mock.timers.tick(READ_MS)
  assert.equal(stand.ticks(), 3)

  stand.frame()
  mock.timers.tick(READ_MS)
  assert.equal(stand.ticks(), 4)
})

test('a video that cannot report frames at all is carried by the timer alone', (t) => {
  const { stand } = playing(t, { reports: false })

  mock.timers.tick(READ_MS * 3)

  assert.equal(stand.ticks(), 3)
})

test('closing stops the frames and the timer both', (t) => {
  const { stand, layer } = playing(t)

  layer.close()
  mock.timers.tick(READ_MS * 5)
  stand.frame()

  assert.equal(stand.ticks(), 0)
})
