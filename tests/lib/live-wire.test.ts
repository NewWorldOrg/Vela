import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CAPTION_PLACEMENT_LENGTH,
  HEADER_LENGTH,
  captionCanvasPayload,
  captionPayload,
  codecsOf,
  controlFrame,
  endingPayload,
  frameOf,
  LIVE_REFUSALS,
  LIVE_SUPPLY_ENDS,
  progressPayload,
  readCaption,
  readCaptionCanvas,
  readControl,
  readFrame,
  refusalPayload,
  STARTUP_SEGMENTS,
} from '@/lib/live-wire'

test('a frame is a channel byte, a 90 kHz clock and the payload', () => {
  const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
  const frame = readFrame(frameOf('picture', 4_503_599_627, payload))

  assert.deepEqual(frame, { channel: 'picture', pts: 4_503_599_627, payload })
})

test('the clock is read big-endian across all eight bytes', () => {
  const bytes = new Uint8Array(HEADER_LENGTH)
  bytes[0] = 0x00
  bytes.set([0, 0, 0, 1, 0, 0, 0, 2], 1)

  assert.equal(readFrame(bytes)?.pts, 2 ** 32 + 2)
})

test('nothing shorter than a header is a frame', () => {
  assert.equal(readFrame(new Uint8Array(HEADER_LENGTH - 1)), null)
})

test('a channel the wire never set aside is not a frame', () => {
  const bytes = new Uint8Array(HEADER_LENGTH + 1)
  bytes[0] = 0x50

  assert.equal(readFrame(bytes), null)
})

test('a viewer says pong and leaving as one byte on the control channel', () => {
  for (const [said, byte] of [
    ['pong', 0x02],
    ['leaving', 0x03],
  ] as const) {
    const frame = readFrame(controlFrame(said))

    assert.equal(frame?.channel, 'control')
    assert.deepEqual([...(frame?.payload ?? [])], [byte])
    assert.deepEqual(readControl(frame!.payload), { said })
  }
})

test('a ping is the one-byte message the server sends', () => {
  assert.deepEqual(readControl(new Uint8Array([0x01])), { said: 'ping' })
  assert.deepEqual(readControl(new Uint8Array([0x09])), { said: 'unknown' })
})

test('a progress report is five marks of a state byte and a big-endian millisecond count', () => {
  const startup = { tunerSecured: 612, channelLocked: 2_105 }
  const payload = progressPayload(startup)

  assert.equal(payload.length, 25)
  assert.deepEqual(
    [...payload.subarray(0, 10)],
    [1, 0, 0, 2, 100, 1, 0, 0, 8, 57],
  )
  assert.deepEqual(readControl(payload), { said: 'progress', startup })
})

test('the segments are read in the order the startup runs through them', () => {
  assert.deepEqual(STARTUP_SEGMENTS, [
    'tunerSecured',
    'channelLocked',
    'transcoderStarted',
    'initReached',
    'firstPicture',
  ])

  const everything = Object.fromEntries(
    STARTUP_SEGMENTS.map((segment, index) => [segment, (index + 1) * 1000]),
  )

  assert.deepEqual(readControl(progressPayload(everything)), {
    said: 'progress',
    startup: everything,
  })
})

test('a refusal names its reason, and a full budget carries its ceiling', () => {
  for (const refusal of LIVE_REFUSALS) {
    const read = readControl(refusalPayload(refusal))

    assert.equal(read.said, 'refusal')
    assert.equal(read.said === 'refusal' && read.refusal, refusal)
  }

  const full = readControl(
    refusalPayload('tooManyAlready', { ceiling: { running: 4, atOnce: 4 } }),
  )

  assert.deepEqual(full, {
    said: 'refusal',
    refusal: 'tooManyAlready',
    ceiling: { running: 4, atOnce: 4 },
  })
})

test('a refusal detail is read against the reason beside it', () => {
  assert.deepEqual(
    readControl(
      refusalPayload('wouldNotTune', {
        detail: { of: 'tuneFailure', failure: 'noLock' },
      }),
    ),
    {
      said: 'refusal',
      refusal: 'wouldNotTune',
      detail: { of: 'tuneFailure', failure: 'noLock' },
    },
  )

  assert.deepEqual(
    readControl(
      refusalPayload('noTunerFree', {
        detail: { of: 'heldBy', holder: 'aRecording' },
      }),
    ),
    {
      said: 'refusal',
      refusal: 'noTunerFree',
      detail: { of: 'heldBy', holder: 'aRecording' },
    },
  )

  assert.deepEqual(
    readControl(
      refusalPayload('noTunerFree', {
        detail: { of: 'heldBy', holder: 'anotherViewer' },
      }),
    ),
    {
      said: 'refusal',
      refusal: 'noTunerFree',
      detail: { of: 'heldBy', holder: 'anotherViewer' },
    },
  )
})

test('the bytes the API was measured sending are read as what was measured', () => {
  assert.deepEqual(readControl(new Uint8Array([3, 1, 0, 0, 0])), {
    said: 'refusal',
    refusal: 'wouldNotTune',
    detail: { of: 'tuneFailure', failure: 'noLock' },
  })
  assert.deepEqual(readControl(new Uint8Array([2, 1, 0, 0, 0])), {
    said: 'refusal',
    refusal: 'noTunerFree',
    detail: { of: 'heldBy', holder: 'aRecording' },
  })
  assert.deepEqual(readControl(new Uint8Array([2, 2, 0, 0, 0])), {
    said: 'refusal',
    refusal: 'noTunerFree',
    detail: { of: 'heldBy', holder: 'anotherViewer' },
  })
})

test('a detail the reason has no meaning for is not read as one it does', () => {
  assert.deepEqual(readControl(new Uint8Array([4, 1, 0, 0, 0])), {
    said: 'refusal',
    refusal: 'driverUnavailable',
  })

  assert.deepEqual(readControl(refusalPayload('wouldNotTune')), {
    said: 'refusal',
    refusal: 'wouldNotTune',
  })

  assert.deepEqual(readControl(new Uint8Array([2, 9, 0, 0, 0])), {
    said: 'refusal',
    refusal: 'noTunerFree',
  })
})

test('the refusal numbers are the API’s own', () => {
  assert.deepEqual(
    LIVE_REFUSALS.map((refusal) => refusalPayload(refusal)[0]),
    [1, 2, 3, 4, 5, 6],
  )
  assert.deepEqual(readControl(new Uint8Array([7, 0, 0, 0, 0])), {
    said: 'unknown',
  })

  assert.deepEqual(
    (['noLock', 'noData', 'incompletePsi', 'streamMismatch'] as const).map(
      (failure) =>
        refusalPayload('wouldNotTune', {
          detail: { of: 'tuneFailure', failure },
        })[1],
    ),
    [1, 2, 3, 4],
  )
  assert.deepEqual(
    (['aRecording', 'anotherViewer'] as const).map(
      (holder) =>
        refusalPayload('noTunerFree', { detail: { of: 'heldBy', holder } })[1],
    ),
    [1, 2],
  )
})

test('an ending report is the mark and the reason', () => {
  assert.deepEqual(
    LIVE_SUPPLY_ENDS.map((why) => [...endingPayload(why)]),
    [
      [0xe0, 1],
      [0xe0, 2],
      [0xe0, 3],
      [0xe0, 4],
      [0xe0, 5],
      [0xe0, 6],
      [0xe0, 7],
      [0xe0, 8],
      [0xe0, 9],
    ],
  )

  for (const why of LIVE_SUPPLY_ENDS) {
    assert.deepEqual(readControl(endingPayload(why)), { said: 'ending', why })
  }

  assert.deepEqual(readControl(new Uint8Array([0xe1, 2])), { said: 'unknown' })
  assert.deepEqual(readControl(new Uint8Array([0xe0, 10])), { said: 'unknown' })
})

test('a control message of a length the wire never sends is unknown', () => {
  assert.deepEqual(readControl(new Uint8Array(3)), { said: 'unknown' })
  assert.deepEqual(readControl(new Uint8Array(0)), { said: 'unknown' })
})

function box(type: string, ...payload: (Uint8Array | number[])[]): Uint8Array {
  const parts = payload.map((part) =>
    part instanceof Uint8Array ? part : new Uint8Array(part),
  )
  const size = 8 + parts.reduce((sum, part) => sum + part.length, 0)
  const bytes = new Uint8Array(size)
  const view = new DataView(bytes.buffer)

  view.setUint32(0, size)
  bytes.set(
    [...type].map((char) => char.charCodeAt(0)),
    4,
  )

  let at = 8

  for (const part of parts) {
    bytes.set(part, at)
    at += part.length
  }

  return bytes
}

function stsd(entry: Uint8Array): Uint8Array {
  return box(
    'trak',
    box(
      'mdia',
      box('minf', box('stbl', box('stsd', [0, 0, 0, 0, 0, 0, 0, 1], entry))),
    ),
  )
}

function header(
  picture: Uint8Array,
  withSound: boolean,
  entry = 'avc1',
): Uint8Array {
  const video = stsd(box(entry, new Uint8Array(78), picture))
  const sound = stsd(box('mp4a', new Uint8Array(28), box('esds', [0, 0, 0, 0])))
  const moov = withSound ? box('moov', video, sound) : box('moov', video)
  const ftyp = box('ftyp', [0x69, 0x73, 0x6f, 0x35])

  const bytes = new Uint8Array(ftyp.length + moov.length)
  bytes.set(ftyp)
  bytes.set(moov, ftyp.length)

  return bytes
}

function bytesOf(hex: string): Uint8Array {
  return new Uint8Array(
    hex.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? [],
  )
}

/** What libx264 wrote for High, level 4.1, 1280x720 at 30 frames. */
const AVC_HIGH_41 = bytesOf(
  '01640029ffe1001a67640029acd9405005bb0110000003001000000303c0f183196001000668ebe3cb22c0fdf8f800',
)

/** What libx265 wrote for Main, Main tier, level 4.1, 1920x1080 at 60 frames. */
const HEVC_MAIN_41 = bytesOf(
  '0101600000009000000000007bf000fcfdf8f800000f03a00001001840010c01ffff01600000030090000003000003007b959809a10001002a42010101600000030090000003000003007ba003c08010e596566924caf0168080000003008000001e04a2000100074401c172b42240',
)

/** What libx265 wrote for Main, High tier, level 4.1, 1280x720 at 30 frames. */
const HEVC_MAIN_HIGH_TIER_41 = bytesOf(
  '0121600000009000000000007bf000fcfdf8f800000f03a00001001840010c01ffff21600000030090000003000003007b959809a10001002b42010121600000030090000003000003007ba00280802d165959a4932bc05a020000030002000003003c10a2000100074401c172b42240',
)

/** What libx265 wrote for Main 10, Main tier, level 3.1, 1280x720 at 30 frames. */
const HEVC_MAIN10_31 = bytesOf(
  '0102200000009000000000005df000fcfdfafa00000f03a00001001840010c01ffff02200000030090000003000003005d959809a10001002b42010102200000030090000003000003005da00280802d1365959a4932bc05a020000003002000000303c1a2000100074401c172b42240',
)

/** What SVT-AV1 wrote for Main, level 4.1, 8 bits, 1920x1080 at 60 frames. */
const AV1_MAIN_41_8BIT = bytesOf('81090c000a0b0000004aabbfc3700be001')

/** What SVT-AV1 wrote for Main, level 3.1, 10 bits, 1280x720 at 30 frames. */
const AV1_MAIN_31_10BIT = bytesOf('81054c000a0b0000002d4cffb3c02f8404')

test('the codecs are read off the header: the H.264 profile and level, and the sound when there is one', () => {
  assert.equal(
    codecsOf(header(box('avcC', AVC_HIGH_41), true)),
    'avc1.640029, mp4a.40.2',
  )
  assert.equal(codecsOf(header(box('avcC', AVC_HIGH_41), false)), 'avc1.640029')
})

test('H.265 is named by its sample entry, profile, compatibility, tier and level, and the constraints up to the last that is set', () => {
  assert.equal(
    codecsOf(header(box('hvcC', HEVC_MAIN_41), true, 'hvc1')),
    'hvc1.1.6.L123.90, mp4a.40.2',
  )
  assert.equal(
    codecsOf(header(box('hvcC', HEVC_MAIN_HIGH_TIER_41), false, 'hvc1')),
    'hvc1.1.6.H123.90',
  )
  assert.equal(
    codecsOf(header(box('hvcC', HEVC_MAIN10_31), false, 'hvc1')),
    'hvc1.2.4.L93.90',
  )
  assert.equal(
    codecsOf(header(box('hvcC', HEVC_MAIN_41), false, 'hev1')),
    'hev1.1.6.L123.90',
  )
})

test('an H.265 profile space is a letter, and constraints that are all unset are left out', () => {
  const spaced = HEVC_MAIN_41.slice()

  spaced[1] = 0b0100_0001
  spaced.fill(0, 6, 12)

  assert.equal(
    codecsOf(header(box('hvcC', spaced), false, 'hvc1')),
    'hvc1.A1.6.L123',
  )

  spaced[6] = 0xb0
  spaced[8] = 0x01

  assert.equal(
    codecsOf(header(box('hvcC', spaced), false, 'hvc1')),
    'hvc1.A1.6.L123.B0.00.01',
  )
})

test('AV1 is named by its profile, level, tier and bit depth', () => {
  assert.equal(
    codecsOf(header(box('av1C', AV1_MAIN_41_8BIT), true, 'av01')),
    'av01.0.09M.08, mp4a.40.2',
  )
  assert.equal(
    codecsOf(header(box('av1C', AV1_MAIN_31_10BIT), false, 'av01')),
    'av01.0.05M.10',
  )
})

test('an AV1 high tier and a Professional twelve bits are read from their flags', () => {
  assert.equal(
    codecsOf(header(box('av1C', [0x81, 0x4d, 0xe0, 0x00]), false, 'av01')),
    'av01.2.13H.12',
  )
})

test('a header with no picture codec it can name answers nothing', () => {
  assert.equal(codecsOf(box('moov', box('trak'))), null)
  assert.equal(codecsOf(new Uint8Array([0, 0, 0])), null)
  assert.equal(
    codecsOf(header(box('hvcC', HEVC_MAIN_41.slice(0, 12)), false, 'hvc1')),
    null,
  )
  assert.equal(
    codecsOf(header(box('av1C', [0x01, 0x09, 0x0c, 0x00]), false, 'av01')),
    null,
  )
})

test('a caption header is the canvas, two big-endian bytes a side', () => {
  const payload = captionCanvasPayload({ width: 1440, height: 1080 })

  assert.deepEqual([...payload], [0x05, 0xa0, 0x04, 0x38])
  assert.deepEqual(readCaptionCanvas(payload), { width: 1440, height: 1080 })
})

test('a canvas with a side of nothing, or of any other length, is not one', () => {
  assert.equal(readCaptionCanvas(new Uint8Array([0, 0, 4, 0x38])), null)
  assert.equal(readCaptionCanvas(new Uint8Array([5, 0xa0, 0, 0])), null)
  assert.equal(readCaptionCanvas(new Uint8Array(3)), null)
  assert.equal(readCaptionCanvas(new Uint8Array(5)), null)
})

test('a caption is placed and measured in two bytes each, and then the PNG', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
  const picture = { left: 240, top: 900, width: 960, height: 120, png }
  const payload = captionPayload(picture)

  assert.deepEqual(
    [...payload.subarray(0, CAPTION_PLACEMENT_LENGTH)],
    [0, 240, 3, 132, 3, 192, 0, 120],
  )

  const read = readCaption(payload)

  assert.equal(read.said, 'shown')

  if (read.said === 'shown') {
    assert.deepEqual(
      { ...read.picture, png: [...read.picture.png] },
      { ...picture, png: [...png] },
    )
  }
})

test('an empty caption frame takes the caption off', () => {
  assert.deepEqual(readCaption(new Uint8Array(0)), { said: 'cleared' })
})

test('a placement with no picture behind it, or one that measures nothing, is unknown', () => {
  assert.deepEqual(readCaption(new Uint8Array(CAPTION_PLACEMENT_LENGTH)), {
    said: 'unknown',
  })

  const flat = captionPayload({
    left: 0,
    top: 0,
    width: 0,
    height: 120,
    png: new Uint8Array([1]),
  })

  assert.deepEqual(readCaption(flat), { said: 'unknown' })
})

test('the caption frames ride the channels the API set aside for them', () => {
  const header = readFrame(
    frameOf('captionHeader', 0, captionCanvasPayload({ width: 1, height: 1 })),
  )
  const shown = readFrame(frameOf('caption', 4_500_000, new Uint8Array(0)))

  assert.equal(header?.channel, 'captionHeader')
  assert.equal(shown?.channel, 'caption')
  assert.equal(shown?.pts, 4_500_000)
})
