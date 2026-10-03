import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ALWAYS_READS_WITHIN_SECONDS,
  LONGEST_HEADER,
  QUEUED_AT_MOST,
  READS_AHEAD_SECONDS,
  readHeader,
  readsOn,
} from '@/lib/recording-stream'

function box(type: string, ...payload: (Uint8Array | number[])[]): Uint8Array {
  const parts = payload.map((part) =>
    part instanceof Uint8Array ? part : new Uint8Array(part),
  )
  const size = 8 + parts.reduce((sum, part) => sum + part.length, 0)
  const bytes = new Uint8Array(size)

  new DataView(bytes.buffer).setUint32(0, size)
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

function joined(...parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(
    parts.reduce((sum, part) => sum + part.length, 0),
  )
  let at = 0

  for (const part of parts) {
    bytes.set(part, at)
    at += part.length
  }

  return bytes
}

function track(entry: Uint8Array): Uint8Array {
  return box(
    'trak',
    box(
      'mdia',
      box('minf', box('stbl', box('stsd', [0, 0, 0, 0, 0, 0, 0, 1], entry))),
    ),
  )
}

const FTYP = box('ftyp', [0x69, 0x73, 0x6f, 0x35])
const PICTURE = track(
  box('avc1', new Uint8Array(78), box('avcC', [1, 0x64, 0x00, 0x28, 0xff])),
)
const SOUND = track(box('mp4a', new Uint8Array(28), box('esds', [0, 0, 0, 0])))
const FRAGMENTED = box('moov', box('mvhd', [0]), PICTURE, SOUND, box('mvex'))
const WHOLE = box('moov', box('mvhd', [0]), PICTURE, SOUND)
const FRAGMENT = joined(box('moof', [1, 2, 3]), box('mdat', [4, 5, 6, 7]))

test('the header of a fragmented MP4 is the boxes up to the end of the movie, with the codecs it names', () => {
  const header = joined(FTYP, FRAGMENTED)

  assert.deepEqual(readHeader(joined(header, FRAGMENT)), {
    state: 'read',
    length: header.length,
    mime: 'video/mp4; codecs="avc1.640028, mp4a.40.2"',
  })
})

test('a header that has not all arrived asks for more', () => {
  const header = joined(FTYP, FRAGMENTED)

  assert.deepEqual(readHeader(new Uint8Array(0)), { state: 'short' })
  assert.deepEqual(readHeader(FTYP.subarray(0, 5)), { state: 'short' })
  assert.deepEqual(readHeader(FTYP), { state: 'short' })
  assert.deepEqual(readHeader(header.subarray(0, header.length - 1)), {
    state: 'short',
  })
})

test('a movie that is not fragmented cannot be fed', () => {
  assert.deepEqual(readHeader(joined(FTYP, WHOLE)), { state: 'unfit' })
})

test('fragments or media before any movie cannot be fed', () => {
  assert.deepEqual(readHeader(joined(FTYP, FRAGMENT)), { state: 'unfit' })
})

test('a movie that names no H.264 picture cannot be fed', () => {
  assert.deepEqual(readHeader(joined(FTYP, box('moov', SOUND, box('mvex')))), {
    state: 'unfit',
  })
})

test('a header that grows past the longest one there is cannot be fed', () => {
  assert.deepEqual(readHeader(new Uint8Array(LONGEST_HEADER)), {
    state: 'unfit',
  })

  const huge = new Uint8Array(16)

  new DataView(huge.buffer).setUint32(0, LONGEST_HEADER + 1)
  huge.set([0x6d, 0x6f, 0x6f, 0x76], 4)

  assert.deepEqual(readHeader(huge), { state: 'unfit' })
})

const ROOM = { ahead: 0, queued: 0, managed: false, streaming: false }

test('reading goes on while little is held ahead, whatever the browser says', () => {
  assert.equal(readsOn(ROOM), true)
  assert.equal(
    readsOn({
      ...ROOM,
      ahead: ALWAYS_READS_WITHIN_SECONDS - 1,
      managed: true,
    }),
    true,
  )
})

test('reading stops once enough is held ahead', () => {
  assert.equal(readsOn({ ...ROOM, ahead: READS_AHEAD_SECONDS - 1 }), true)
  assert.equal(readsOn({ ...ROOM, ahead: READS_AHEAD_SECONDS }), false)
})

test('a managed source is read only while it asks to be streamed', () => {
  const held = {
    ...ROOM,
    ahead: ALWAYS_READS_WITHIN_SECONDS + 1,
    managed: true,
  }

  assert.equal(readsOn({ ...held, streaming: true }), true)
  assert.equal(readsOn({ ...held, streaming: false }), false)
  assert.equal(
    readsOn({ ...held, streaming: true, ahead: READS_AHEAD_SECONDS }),
    false,
  )
})

test('reading waits while the appends have not caught up', () => {
  assert.equal(readsOn({ ...ROOM, queued: QUEUED_AT_MOST }), false)
})
