import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  captionWindowRead,
  videoCaptionsHref,
} from '@/repository/video-captions'

const PNG = btoa(String.fromCharCode(137, 80, 78, 71))

function answered(data: unknown) {
  return { status: true, message: '', data } as Parameters<
    typeof captionWindowRead
  >[1]
}

test('the captions are asked for from the second on screen, on the source being played', () => {
  assert.equal(
    videoCaptionsHref('1266', 1234.56789, 'recording'),
    '/api/videos/1266/captions?from=1234.567&source=recording',
  )
  assert.equal(
    videoCaptionsHref('1266', 0, 'artefact'),
    '/api/videos/1266/captions?from=0&source=artefact',
  )
})

test('with no source named, the captions are asked for the way the plan was', () => {
  assert.equal(
    videoCaptionsHref('1266', 600),
    '/api/videos/1266/captions?from=600',
  )
})

test('a second that is not one asks from the beginning', () => {
  assert.equal(
    videoCaptionsHref('1266', Number.NaN),
    '/api/videos/1266/captions?from=0',
  )
  assert.equal(
    videoCaptionsHref('1266', -3),
    '/api/videos/1266/captions?from=0',
  )
})

test('the ten minutes come back with their canvas, their end and every cue in order of arrival', () => {
  const read = captionWindowRead(
    200,
    answered({
      canvas: { width: '1440', height: 1080 },
      untilSec: '1800.5',
      cues: [
        {
          atSec: 1199.2,
          picture: {
            left: 360,
            top: '940',
            width: 720,
            height: 88,
            png: PNG,
          },
        },
        { atSec: '1203.75', picture: null },
      ],
    }),
  )

  assert.deepEqual(read, {
    state: 'read',
    window: {
      canvas: { width: 1440, height: 1080 },
      untilSec: 1800.5,
      cues: [
        {
          atSec: 1199.2,
          picture: {
            left: 360,
            top: 940,
            width: 720,
            height: 88,
            png: new Uint8Array([137, 80, 78, 71]),
          },
        },
        { atSec: 1203.75, picture: null },
      ],
    },
  })
})

test('ten minutes with no caption in them are an empty list, not a recording without captions', () => {
  assert.deepEqual(
    captionWindowRead(
      200,
      answered({
        canvas: { width: 1440, height: 1080 },
        untilSec: 600,
        cues: [],
      }),
    ),
    {
      state: 'read',
      window: {
        canvas: { width: 1440, height: 1080 },
        untilSec: 600,
        cues: [],
      },
    },
  )
})

test('captions still being taken from the recording are coming', () => {
  assert.deepEqual(captionWindowRead(409, answered(null)), { state: 'coming' })
})

test('a recording with no captions to draw over that source has none', () => {
  assert.deepEqual(captionWindowRead(404, answered(null)), { state: 'none' })
})

test('any other refusal is a read that failed', () => {
  for (const status of [400, 401, 500, 502]) {
    assert.deepEqual(captionWindowRead(status, undefined), { state: 'failed' })
  }
})

test('a picture that cannot be read fails the read rather than drawing something else', (t) => {
  t.mock.method(console, 'warn', () => {})

  assert.deepEqual(
    captionWindowRead(
      200,
      answered({
        canvas: { width: 1440, height: 1080 },
        untilSec: 600,
        cues: [
          {
            atSec: 1,
            picture: { left: 0, top: 0, width: 1, height: 1, png: '%%%' },
          },
        ],
      }),
    ),
    { state: 'failed' },
  )
})
