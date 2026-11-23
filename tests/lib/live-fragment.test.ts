import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  LivePictures,
  firstPictureAt,
  pictureTrackOf,
} from '@/lib/live-fragment'
import {
  RUN_FLAGS,
  box,
  fragment,
  header,
  joined,
} from '@/tests/lib/live-fragments'

const PICTURE = { id: 1, handler: 'vide', timescale: 90_000 } as const

const SOUND = { id: 2, handler: 'soun', timescale: 48_000 } as const

const TRACK = { id: 1, timescale: 90_000 }

test('the picture track is the one whose handler is a picture, with the timescale its times are counted in', () => {
  assert.deepEqual(pictureTrackOf(header(PICTURE, SOUND)), TRACK)
})

test('the picture track is found wherever it sits among the tracks', () => {
  assert.deepEqual(
    pictureTrackOf(
      header(
        { id: 7, handler: 'soun', timescale: 48_000 },
        { id: 9, handler: 'vide', timescale: 60_000 },
      ),
    ),
    { id: 9, timescale: 60_000 },
  )
})

test('a track written with the long times is read where the long times put it', () => {
  assert.deepEqual(
    pictureTrackOf(header({ ...PICTURE, id: 3, version: 1 }, SOUND)),
    { id: 3, timescale: 90_000 },
  )
})

test('a header with sound only, or with nothing that can be read, has no picture track', () => {
  assert.equal(pictureTrackOf(header(SOUND)), null)
  assert.equal(pictureTrackOf(new Uint8Array(0)), null)
  assert.equal(pictureTrackOf(new Uint8Array([0, 0, 0, 3, 1, 2, 3])), null)
  assert.equal(pictureTrackOf(box('moov', box('trak', box('mdia')))), null)
})

test('a picture track that counts its times in nothing is not one a time can be read from', () => {
  assert.equal(pictureTrackOf(header({ ...PICTURE, timescale: 0 })), null)
})

test('the first picture of a fragment is where its picture run says decoding starts', () => {
  assert.equal(
    firstPictureAt(
      fragment(
        { track: 1, at: 900_000, samples: 3 },
        { track: 2, at: 452_544, samples: 25 },
      ),
      TRACK,
    ),
    10,
  )
})

test('the sound of a fragment may start long before its picture, and is not what is read', () => {
  assert.equal(
    firstPictureAt(
      fragment(
        { track: 2, at: 436_800, samples: 42 },
        { track: 1, at: 900_000 },
      ),
      TRACK,
    ),
    10,
  )
})

test('a first picture shown later than it is decoded is read where it is shown', () => {
  assert.equal(
    firstPictureAt(fragment({ track: 1, at: 900_000, offset: 6006 }), TRACK),
    (900_000 + 6006) / 90_000,
  )
})

test('a first picture shown earlier than it is decoded is read where it is shown', () => {
  assert.equal(
    firstPictureAt(
      fragment({ track: 1, at: 900_000, offset: -3003, version: 1 }),
      TRACK,
    ),
    (900_000 - 3003) / 90_000,
  )
})

test('a time past what 32 bits hold is read whole', () => {
  const at = 2 ** 33 + 90_000

  assert.equal(
    firstPictureAt(fragment({ track: 1, at, version: 1 }), TRACK),
    at / 90_000,
  )
})

test('the first picture is read whichever of its optional fields the run carries', () => {
  const {
    DATA_OFFSET,
    FIRST_SAMPLE_FLAGS,
    SAMPLE_DURATION,
    SAMPLE_SIZE,
    SAMPLE_FLAGS,
  } = RUN_FLAGS
  const optional = [
    DATA_OFFSET,
    FIRST_SAMPLE_FLAGS,
    SAMPLE_DURATION,
    SAMPLE_SIZE,
    SAMPLE_FLAGS,
  ]

  for (let chosen = 0; chosen < 2 ** optional.length; chosen += 1) {
    const flags = optional.reduce(
      (sum, flag, index) => (chosen & (1 << index) ? sum | flag : sum),
      0,
    )

    assert.equal(
      firstPictureAt(
        fragment({ track: 1, at: 900_000, offset: 3003, flags }),
        TRACK,
      ),
      (900_000 + 3003) / 90_000,
      `flags ${flags.toString(16)}`,
    )
    assert.equal(
      firstPictureAt(fragment({ track: 1, at: 900_000, flags }), TRACK),
      10,
      `flags ${flags.toString(16)}`,
    )
  }
})

test('a fragment that carries sound only has no first picture', () => {
  assert.equal(
    firstPictureAt(fragment({ track: 2, at: 436_800, samples: 42 }), TRACK),
    undefined,
  )
})

test('a picture run with no samples in it has no first picture, and the next run that has one is read', () => {
  assert.equal(
    firstPictureAt(fragment({ track: 1, at: 900_000, samples: 0 }), TRACK),
    undefined,
  )
  assert.equal(
    firstPictureAt(
      joined(
        fragment({ track: 1, at: 900_000, samples: 0 }),
        fragment({ track: 1, at: 904_500, samples: 3 }),
      ),
      TRACK,
    ),
    904_500 / 90_000,
  )
})

test('a picture run that does not say where it starts is not guessed at', () => {
  assert.equal(firstPictureAt(fragment({ track: 1 }), TRACK), undefined)
})

test('bytes that are no fragment, or one cut short, have no first picture and are not read past their end', () => {
  const whole = fragment({ track: 1, at: 900_000, offset: 3003 })

  assert.equal(firstPictureAt(new Uint8Array(0), TRACK), undefined)
  assert.equal(firstPictureAt(box('moof'), TRACK), undefined)
  assert.equal(
    firstPictureAt(box('mdat', new Uint8Array(64)), TRACK),
    undefined,
  )

  for (let cut = 0; cut < whole.length; cut += 1) {
    const read = firstPictureAt(whole.subarray(0, cut), TRACK)

    assert.ok(read === undefined || read === (900_000 + 3003) / 90_000)
  }
})

test('a fragment read out of the middle of a larger buffer is read from its own first byte', () => {
  const whole = fragment({ track: 1, at: 900_000 })
  const padded = joined(new Uint8Array(13), whole, new Uint8Array(5))

  assert.equal(
    firstPictureAt(padded.subarray(13, 13 + whole.length), TRACK),
    10,
  )
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

test('a header that cannot be read leaves the run to begin where the browser says it does', () => {
  const pictures = new LivePictures()

  pictures.header(new Uint8Array([1, 2, 3]))
  pictures.fragment(fragment({ track: 1, at: 900_000 }), undefined)

  assert.equal(pictures.fromOf([{ from: 9.1, to: 9.96 }]), 9.1)
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
