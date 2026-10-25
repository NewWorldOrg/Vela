import assert from 'node:assert/strict'
import { mock, test, type TestContext } from 'node:test'

import type { CaptionPicture } from '@/lib/live-wire'
import { PLAIN_CAPTION_STYLE } from '@/lib/caption-style'
import { placedOn } from '@/lib/caption-placement'

interface Asked {
  picture: CaptionPicture
  finish: (made: unknown) => void
}

const asked: Asked[] = []

mock.module('@/components/recordings/caption-restyle', {
  namedExports: {
    restyledCaption: (picture: CaptionPicture) =>
      new Promise((resolve) => asked.push({ picture, finish: resolve })),
    broadcastCaption: async (picture: CaptionPicture) => ({
      image: { of: picture, broadcast: true },
      margin: { left: 0, top: 0, right: 0, bottom: 0 },
      close: () => {},
    }),
  },
})

const { CaptionSurface, decodeCaption } =
  await import('@/components/recordings/caption-surface')
const { CaptionBoard } = await import('@/components/recordings/caption-board')

class NoticesNothing {
  observe(): void {}

  disconnect(): void {}
}

Object.assign(globalThis, {
  MutationObserver: NoticesNothing,
  createImageBitmap: (blob: Blob) =>
    Promise.resolve({ decoded: blob.size, close: () => {} }),
  window: { devicePixelRatio: 1 },
})

function settled(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

function picture(width: number): CaptionPicture {
  return {
    left: 240,
    top: 900,
    width,
    height: 120,
    png: new Uint8Array(width),
  }
}

function bench(t: TestContext, style = PLAIN_CAPTION_STYLE) {
  mock.timers.enable({ apis: ['setInterval'] })

  const drawn: unknown[][] = []
  const context = {
    clearRect: () => {},
    drawImage: (...given: unknown[]) => drawn.push(given),
  }
  const canvas = {
    dataset: {} as Record<string, string>,
    clientWidth: 1280,
    clientHeight: 720,
    width: 0,
    height: 0,
    getContext: () => context,
    getAttribute: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
  } as unknown as HTMLCanvasElement
  const video = {
    videoWidth: 1920,
    videoHeight: 1080,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as HTMLVideoElement
  const board = new CaptionBoard(style)
  const surface = new CaptionSurface(canvas, video, () => {}, board)

  surface.canvasOf({ width: 1440, height: 1080 })
  asked.length = 0
  t.after(() => {
    surface.close()
    mock.timers.reset()
  })

  return { surface, board, drawn, last: () => drawn[drawn.length - 1] }
}

test('as broadcast, the picture decoded on arrival is drawn where the broadcast put it', async (t) => {
  const { surface, last } = bench(t)
  const caption = picture(960)

  surface.show(decodeCaption(caption))
  await settled()

  const place = placedOn(
    { left: 0, top: 0, width: 1280, height: 720 },
    { width: 1440, height: 1080 },
    caption,
  )

  assert.deepEqual(last(), [
    (last() as unknown[])[0],
    place.left,
    place.top,
    place.width,
    place.height,
  ])
  assert.equal(asked.length, 0)
})

test('while one caption is being restyled, only the newest of those that came meanwhile is made next', async (t) => {
  const { surface } = bench(t, { ...PLAIN_CAPTION_STYLE, background: 'none' })
  const [first, second, third] = [100, 200, 300].map(picture)

  surface.show(decodeCaption(first))
  surface.show(decodeCaption(second))
  surface.show(decodeCaption(third))
  await settled()

  assert.deepEqual(
    asked.map((one) => one.picture.width),
    [100],
  )

  asked[0].finish(null)
  await settled()

  assert.deepEqual(
    asked.map((one) => one.picture.width),
    [100, 300],
  )
})

test('a caption that cannot be restyled is drawn as it came, and the caption and the player go on', async (t) => {
  const { surface, last } = bench(t, {
    ...PLAIN_CAPTION_STYLE,
    colour: 'yellow',
  })

  surface.show(decodeCaption(picture(960)))
  await settled()
  asked[0].finish(null)
  await settled()

  assert.ok(last(), 'nothing was drawn')
  assert.equal(((last() as unknown[])[0] as { decoded: number }).decoded, 960)
})

test('a new style remakes the caption standing, and draws the old one until the new one is ready', async (t) => {
  const { surface, board, drawn, last } = bench(t)
  const caption = picture(960)

  surface.show(decodeCaption(caption))
  await settled()

  const before = (last() as unknown[])[0]

  board.restyle({ ...PLAIN_CAPTION_STYLE, edge: 'added' })
  await settled()

  assert.equal(asked.length, 1)
  assert.equal((last() as unknown[])[0], before)

  const restyled = { restyled: true }

  asked[0].finish({
    image: restyled,
    margin: { left: 3, top: 3, right: 3, bottom: 3 },
    close: () => {},
  })
  await settled()

  assert.equal((last() as unknown[])[0], restyled)
  assert.ok(drawn.length >= 2)
})

test('a size and a move change where the caption is drawn without remaking it', async (t) => {
  const { surface, board, last } = bench(t)

  surface.show(decodeCaption(picture(960)))
  await settled()

  const plain = last() as number[]

  board.restyle({
    ...PLAIN_CAPTION_STYLE,
    scale: '150',
    shift: { x: 0.1, y: 0 },
  })

  const moved = last() as number[]

  assert.equal(asked.length, 0)
  assert.ok(Math.abs(moved[3] - plain[3] * 1.5) < 1e-6)
  assert.ok(Math.abs(moved[2] + moved[4] - (plain[2] + plain[4])) < 1e-6)
})

test('on screen the caption is lifted clear of the control row, and a capture draws it moved and sized but never lifted', async (t) => {
  const { surface, board, last } = bench(t, {
    ...PLAIN_CAPTION_STYLE,
    shift: { x: 0, y: -0.1 },
  })
  const drawn: number[][] = []

  surface.show(decodeCaption(picture(960)))
  await settled()
  board.clearOf(() => [{ left: 0, top: 600, width: 1280, height: 120 }])

  assert.equal((last() as number[])[2], 528 - (608 + 6 - 600))

  surface.drawOn(
    {
      drawImage: (_: unknown, ...at: number[]) => drawn.push(at),
    } as unknown as CanvasRenderingContext2D,
    { width: 1280, height: 720 },
  )

  assert.equal(drawn.length, 1)
  assert.deepEqual(
    drawn[0].map((one) => Math.round(one * 1000) / 1000),
    [213.333, 528, 853.333, 80],
  )
})
