import assert from 'node:assert/strict'
import { test } from 'node:test'

import { firstPictureAt, pictureTrackOf } from '@/lib/live-fragment'
import {
  EMPTY_EDIT,
  RUN_FLAGS,
  box,
  fragment,
  header,
  headerAsSent,
  joined,
} from '@/tests/lib/live-fragments'

const PICTURE = { id: 1, handler: 'vide', timescale: 90_000 } as const

const SOUND = { id: 2, handler: 'soun', timescale: 48_000 } as const

const TRACK = { id: 1, timescale: 90_000, edit: 0 }

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
    { id: 9, timescale: 60_000, edit: 0 },
  )
})

test('a track written with the long times is read where the long times put it', () => {
  assert.deepEqual(
    pictureTrackOf(header({ ...PICTURE, id: 3, version: 1 }, SOUND)),
    { id: 3, timescale: 90_000, edit: 0 },
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

const SENT_TRACK = { id: 1, timescale: 60_000, edit: 3003 }

const DECODED_AT = 2_400_000_000

const SOUND_AT = 1_919_964_480

const KEY_FRAME_RUN =
  RUN_FLAGS.DATA_OFFSET | RUN_FLAGS.FIRST_SAMPLE_FLAGS | RUN_FLAGS.SAMPLE_OFFSET

const PICTURE_RUN =
  RUN_FLAGS.DATA_OFFSET | RUN_FLAGS.SAMPLE_SIZE | RUN_FLAGS.SAMPLE_OFFSET

const FIRST_SOUND_RUN =
  RUN_FLAGS.DATA_OFFSET | RUN_FLAGS.SAMPLE_DURATION | RUN_FLAGS.SAMPLE_SIZE

const SOUND_RUN = RUN_FLAGS.DATA_OFFSET | RUN_FLAGS.SAMPLE_SIZE

test('the header as the transcoder sends it, with its edit lists, long media times, track defaults and user data, names the picture track', () => {
  assert.deepEqual(
    pictureTrackOf(headerAsSent(SENT_PICTURE, SENT_SOUND)),
    SENT_TRACK,
  )
  assert.deepEqual(
    pictureTrackOf(
      headerAsSent({ ...SENT_PICTURE, mediaVersion: 0, timescale: 30_000 }),
    ),
    { id: 1, timescale: 30_000, edit: 3003 },
  )
})

test('the first fragment as it is sent, one key frame and a long head of sound, at times tens of thousands of seconds in, is read where the edit list has the key frame shown', () => {
  assert.equal(
    firstPictureAt(
      fragment(
        {
          track: 1,
          at: DECODED_AT,
          offset: 3003,
          version: 1,
          flags: KEY_FRAME_RUN,
          defaults: true,
        },
        {
          track: 2,
          at: SOUND_AT,
          samples: 31,
          version: 1,
          flags: FIRST_SOUND_RUN,
          defaults: true,
        },
      ),
      SENT_TRACK,
    ),
    DECODED_AT / 60_000,
  )
})

test('a later fragment as it is sent, whose pictures are decoded in another order than they are shown, is read at the picture decoded first', () => {
  assert.equal(
    firstPictureAt(
      fragment(
        {
          track: 1,
          at: DECODED_AT + 1001,
          offsets: [7007, 3003, 3003],
          version: 1,
          flags: PICTURE_RUN,
          defaults: true,
        },
        {
          track: 2,
          at: SOUND_AT + 30_720,
          samples: 3,
          version: 1,
          flags: SOUND_RUN,
          defaults: true,
        },
      ),
      SENT_TRACK,
    ),
    (DECODED_AT + 1001 + 7007 - 3003) / 60_000,
  )
})

test('a picture track with no edit list shows each picture where its fragment says', () => {
  const track = pictureTrackOf(header(PICTURE, SOUND))

  assert.deepEqual(track, { id: 1, timescale: 90_000, edit: 0 })
  assert.equal(
    firstPictureAt(fragment({ track: 1, at: 900_000, offset: 6006 }), track!),
    (900_000 + 6006) / 90_000,
  )
})

test('a picture track whose edit list starts the show a few pictures in shows each picture that much earlier', () => {
  for (const editVersion of [0, 1] as const) {
    const track = pictureTrackOf(
      header({ ...PICTURE, edit: 6006, editVersion }, { ...SOUND, edit: 0 }),
    )

    assert.deepEqual(track, { id: 1, timescale: 90_000, edit: 6006 })
    assert.equal(
      firstPictureAt(fragment({ track: 1, at: 900_000, offset: 6006 }), track!),
      10,
      `version ${editVersion}`,
    )
    assert.equal(
      firstPictureAt(
        fragment({ track: 1, at: 903_003, offsets: [9009, 3003] }),
        track!,
      ),
      (903_003 + 9009 - 6006) / 90_000,
      `version ${editVersion}`,
    )
  }
})

test('an empty edit at the head of the list is passed over, and the edit after it is the one that counts', () => {
  for (const editVersion of [0, 1] as const) {
    const track = pictureTrackOf(
      header({ ...PICTURE, edits: [EMPTY_EDIT, 6006], editVersion }, SOUND),
    )

    assert.deepEqual(
      track,
      { id: 1, timescale: 90_000, edit: 6006 },
      `version ${editVersion}`,
    )
    assert.equal(
      firstPictureAt(fragment({ track: 1, at: 900_000, offset: 6006 }), track!),
      10,
    )
  }
})

test('an edit list of empty edits only moves nothing', () => {
  for (const editVersion of [0, 1] as const) {
    assert.deepEqual(
      pictureTrackOf(
        header({ ...PICTURE, edits: [EMPTY_EDIT], editVersion }, SOUND),
      ),
      { id: 1, timescale: 90_000, edit: 0 },
    )
  }
})

test('of several edits the first that is not empty is the one that counts', () => {
  assert.deepEqual(
    pictureTrackOf(header({ ...PICTURE, edits: [3003, 9009] }, SOUND)),
    { id: 1, timescale: 90_000, edit: 3003 },
  )
})

test('the edit list of the sound track is not the one the picture track is read by', () => {
  assert.deepEqual(pictureTrackOf(header(PICTURE, { ...SOUND, edit: 1024 })), {
    id: 1,
    timescale: 90_000,
    edit: 0,
  })
  assert.deepEqual(
    pictureTrackOf(
      header({ ...SOUND, edit: 1024 }, { ...PICTURE, id: 2, edit: 3003 }),
    ),
    { id: 2, timescale: 90_000, edit: 3003 },
  )
})

test('a long edit past what 32 bits hold is read whole', () => {
  assert.deepEqual(
    pictureTrackOf(
      header({ ...PICTURE, edits: [2 ** 33 + 3003], editVersion: 1 }, SOUND),
    ),
    { id: 1, timescale: 90_000, edit: 2 ** 33 + 3003 },
  )
})

test('an edit list cut short is read as far as it goes and no further', () => {
  const whole = header({ ...PICTURE, edits: [EMPTY_EDIT, 6006] }, SOUND)
  const at = whole.findIndex(
    (_, index) =>
      String.fromCharCode(...whole.subarray(index, index + 4)) === 'elst',
  )

  for (const said of [0, 1, 2, 3, 0xffffffff]) {
    const cut = whole.slice()

    new DataView(cut.buffer).setUint32(at + 8, said)

    const track = pictureTrackOf(cut)

    assert.equal(track?.id, 1)
    assert.ok(track?.edit === 0 || track?.edit === 6006, `${said} edits said`)
  }
})
