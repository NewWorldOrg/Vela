import assert from 'node:assert/strict'
import { test } from 'node:test'

import { LivePictures } from '@/lib/live-pictures'
import {
  RUN_FLAGS,
  fragment,
  header,
  headerAsSent,
} from '@/tests/lib/live-fragments'

const PICTURE = { id: 1, handler: 'vide', timescale: 90_000 } as const

const SOUND = { id: 2, handler: 'soun', timescale: 48_000 } as const

const SENT_PICTURE = {
  id: 1,
  handler: 'vide',
  timescale: 60_000,
  mediaVersion: 1,
  edit: 3003,
} as const

const SENT_SOUND = {
  id: 2,
  handler: 'soun',
  timescale: 48_000,
  mediaVersion: 1,
  edit: 0,
} as const

const DECODED_AT = 2_400_000_000

const SOUND_AT = 1_919_964_480

const PICTURE_RUN =
  RUN_FLAGS.DATA_OFFSET | RUN_FLAGS.SAMPLE_SIZE | RUN_FLAGS.SAMPLE_OFFSET

test('pictures read out of order from one fragment to the next leave picture and sound beginning at the earliest of them', () => {
  const pictures = new LivePictures()

  pictures.header(headerAsSent(SENT_PICTURE, SENT_SOUND))

  for (const [nth, offsets] of [
    [3003],
    [7007, 3003, 3003],
    [3003, 7007, 3003],
    [3003, 3003, 9009],
  ].entries()) {
    pictures.fragment(
      fragment({
        track: 1,
        at: DECODED_AT + nth * 3003,
        offsets,
        version: 1,
        flags: PICTURE_RUN,
        defaults: true,
      }),
      nth === 0 ? undefined : SOUND_AT / 48_000,
    )
  }

  assert.equal(
    pictures.fromOf([
      { from: SOUND_AT / 48_000, to: (DECODED_AT + 12_012) / 60_000 },
    ]),
    DECODED_AT / 60_000,
  )
})

test('a header that names another timescale than the browser counts in puts every picture far from what is held, and where picture and sound begin is not known', () => {
  const pictures = new LivePictures()
  const held = { from: SOUND_AT / 48_000, to: (DECODED_AT + 12_012) / 60_000 }

  pictures.header(
    headerAsSent({ ...SENT_PICTURE, timescale: 30_000 }, SENT_SOUND),
  )
  pictures.fragment(
    fragment({ track: 1, at: DECODED_AT, offset: 3003, version: 1 }),
    undefined,
  )

  assert.equal(pictures.fromOf([held]), undefined)

  const slower = new LivePictures()

  slower.header(
    headerAsSent({ ...SENT_PICTURE, timescale: 120_000 }, SENT_SOUND),
  )
  slower.fragment(
    fragment({ track: 1, at: DECODED_AT, offset: 3003, version: 1 }),
    undefined,
  )

  assert.equal(slower.fromOf([held]), undefined)
})

function watching(...tracks: Parameters<typeof header>) {
  const pictures = new LivePictures()

  pictures.header(header(...tracks))

  return pictures
}

test('with nothing held there is nowhere picture and sound begin', () => {
  assert.equal(watching(PICTURE, SOUND).fromOf([]), undefined)
})

test('sound that starts before the picture is held from its own start, and picture and sound begin at the first picture', () => {
  const pictures = watching(PICTURE, SOUND)

  pictures.fragment(
    fragment({ track: 1, at: 900_000 }, { track: 2, at: 436_800, samples: 42 }),
    undefined,
  )

  assert.equal(pictures.fromOf([{ from: 9.1, to: 9.96 }]), 10)
})

test('picture and sound that start together begin where the run begins', () => {
  const pictures = watching(PICTURE, SOUND)

  pictures.fragment(
    fragment({ track: 1, at: 900_000 }, { track: 2, at: 480_000 }),
    undefined,
  )
  pictures.fragment(
    fragment({ track: 1, at: 904_500 }, { track: 2, at: 482_400 }),
    undefined,
  )

  assert.equal(pictures.fromOf([{ from: 10, to: 10.1 }]), 10)
})

test('after a break, picture and sound begin at the first picture that came after it, in the run that reaches the edge', () => {
  const pictures = watching(PICTURE, SOUND)

  pictures.fragment(fragment({ track: 1, at: 900_000 }), undefined)
  pictures.fragment(fragment({ track: 1, at: 904_500 }), 10)
  pictures.fragment(fragment({ track: 1, at: 1_800_000 }), 10)
  pictures.fragment(fragment({ track: 1, at: 1_804_500 }), 10)

  assert.equal(
    pictures.fromOf([
      { from: 10, to: 10.1 },
      { from: 19.3, to: 20.1 },
    ]),
    20,
  )
})

test('a header that cannot be read leaves where picture and sound begin unknown', () => {
  const pictures = new LivePictures()

  pictures.header(new Uint8Array([1, 2, 3]))
  pictures.fragment(fragment({ track: 1, at: 900_000 }), undefined)

  assert.equal(pictures.fromOf([{ from: 9.1, to: 9.96 }]), undefined)
})

test('the first header is the one that names the picture track', () => {
  const pictures = watching(PICTURE, SOUND)

  pictures.header(header({ id: 5, handler: 'vide', timescale: 1000 }))
  pictures.fragment(fragment({ track: 1, at: 900_000 }), undefined)

  assert.equal(pictures.fromOf([{ from: 9.1, to: 9.96 }]), 10)
})

test('pictures older than what is held are let go, and what is held still begins where it should', () => {
  const pictures = watching(PICTURE, SOUND)

  for (let nth = 0; nth < 4000; nth += 1) {
    const oldest = nth < 1200 ? 10 : 10 + (nth - 1200) * 0.05

    pictures.fragment(
      fragment({ track: 1, at: 900_000 + nth * 4500 }),
      nth === 0 ? undefined : oldest,
    )
  }

  assert.ok(pictures.kept <= 1300)
  assert.equal(pictures.fromOf([{ from: 150, to: 210 }]), 150)
})
