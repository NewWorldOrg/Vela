import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  HEADER_LENGTH,
  codecsOf,
  controlFrame,
  endingPayload,
  frameOf,
  LIVE_REFUSALS,
  LIVE_SUPPLY_ENDS,
  progressPayload,
  readControl,
  readFrame,
  refusalPayload,
  STARTUP_SEGMENTS,
} from './live-wire.ts'

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
    refusalPayload('tooManyAlready', { running: 4, atOnce: 4 }),
  )

  assert.deepEqual(full, {
    said: 'refusal',
    refusal: 'tooManyAlready',
    ceiling: { running: 4, atOnce: 4 },
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
    ],
  )

  for (const why of LIVE_SUPPLY_ENDS) {
    assert.deepEqual(readControl(endingPayload(why)), { said: 'ending', why })
  }

  assert.deepEqual(readControl(new Uint8Array([0xe1, 2])), { said: 'unknown' })
  assert.deepEqual(readControl(new Uint8Array([0xe0, 8])), { said: 'unknown' })
})

test('a control message of a length the wire never sends is unknown', () => {
  assert.deepEqual(readControl(new Uint8Array(3)), { said: 'unknown' })
  assert.deepEqual(readControl(new Uint8Array(0)), { said: 'unknown' })
})

/** A box: its size, its type and its payload. */
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

/** A header the way the API's muxer writes one: video and sound in one moov. */
function header(withSound: boolean): Uint8Array {
  const avcC = box('avcC', [1, 0x64, 0x00, 0x1f, 0xff])
  const avc1 = box('avc1', new Uint8Array(78), avcC)
  const mp4a = box('mp4a', new Uint8Array(28), box('esds', [0, 0, 0, 0]))
  const video = box(
    'trak',
    box(
      'mdia',
      box('minf', box('stbl', box('stsd', [0, 0, 0, 0, 0, 0, 0, 1], avc1))),
    ),
  )
  const sound = box(
    'trak',
    box(
      'mdia',
      box('minf', box('stbl', box('stsd', [0, 0, 0, 0, 0, 0, 0, 1], mp4a))),
    ),
  )
  const moov = withSound ? box('moov', video, sound) : box('moov', video)
  const ftyp = box('ftyp', [0x69, 0x73, 0x6f, 0x35])

  const bytes = new Uint8Array(ftyp.length + moov.length)
  bytes.set(ftyp)
  bytes.set(moov, ftyp.length)

  return bytes
}

test('the codecs are read off the header: the H.264 profile and level, and the sound when there is one', () => {
  assert.equal(codecsOf(header(true)), 'avc1.64001f, mp4a.40.2')
  assert.equal(codecsOf(header(false)), 'avc1.64001f')
})

test('a header with no H.264 in it answers nothing', () => {
  assert.equal(codecsOf(box('moov', box('trak'))), null)
  assert.equal(codecsOf(new Uint8Array([0, 0, 0])), null)
})
