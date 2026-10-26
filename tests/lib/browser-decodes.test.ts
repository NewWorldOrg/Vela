import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  AV1_IN_MP4,
  DECODES_COOKIE,
  H265_IN_MP4,
  browserDecodes,
  decodesCookie,
  decodesOf,
  decodesWith,
  type DecodingProbe,
} from '@/lib/browser-decodes'

function probe(
  answer: string | ((type: string) => string),
  supported?: boolean | 'throws',
  asked: string[] = [],
): DecodingProbe {
  return {
    canPlayType: (type) => {
      asked.push(type)

      return typeof answer === 'string' ? answer : answer(type)
    },
    decodingInfo:
      supported === undefined
        ? undefined
        : async (configuration) => {
            asked.push(
              `${configuration.type} ${configuration.video.contentType}`,
            )

            if (supported === 'throws') {
              throw new TypeError('not a configuration this browser reads')
            }

            return { supported }
          },
  }
}

test('a browser whose element and media capabilities both say yes plays H.265', async () => {
  const asked: string[] = []

  assert.equal(await decodesWith(probe('probably', true, asked), 'h265'), true)
  assert.deepEqual(asked, [H265_IN_MP4, `file ${H265_IN_MP4}`])
})

test('the types asked about are H.265 tagged hvc1 and AV1', () => {
  assert.match(H265_IN_MP4, /^video\/mp4; codecs="hvc1\./)
  assert.match(AV1_IN_MP4, /^video\/mp4; codecs="av01\./)
})

test('an element that only says maybe, or nothing, is not taken as playing it', async () => {
  assert.equal(await decodesWith(probe('maybe', true), 'h265'), false)
  assert.equal(await decodesWith(probe('', true), 'av1'), false)
})

test('media capabilities that say no, or fail, outweigh an element that says yes', async () => {
  assert.equal(await decodesWith(probe('probably', false), 'h265'), false)
  assert.equal(await decodesWith(probe('probably', 'throws'), 'av1'), false)
})

test('a browser without media capabilities is judged by its element alone', async () => {
  assert.equal(await decodesWith(probe('probably'), 'h265'), true)
})

test('every coding the browser plays is told, H.265 before AV1', async () => {
  const asked: string[] = []

  assert.deepEqual(await browserDecodes(probe('probably', true, asked)), [
    'h265',
    'av1',
  ])
  assert.deepEqual(asked, [
    H265_IN_MP4,
    `file ${H265_IN_MP4}`,
    AV1_IN_MP4,
    `file ${AV1_IN_MP4}`,
  ])
  assert.deepEqual(
    await browserDecodes(
      probe((type) => (type === AV1_IN_MP4 ? 'probably' : ''), true),
    ),
    ['av1'],
  )
  assert.deepEqual(await browserDecodes(probe('', true)), [])
})

test('the cookie names what is played, joined by a dot, or none, and is read back as what to tell Carina', () => {
  assert.match(decodesCookie(['h265']), new RegExp(`^${DECODES_COOKIE}=h265;`))
  assert.match(
    decodesCookie(['h265', 'av1']),
    new RegExp(`^${DECODES_COOKIE}=h265\\.av1;`),
  )
  assert.match(decodesCookie([]), new RegExp(`^${DECODES_COOKIE}=none;`))
  assert.deepEqual(decodesOf('h265'), ['h265'])
  assert.deepEqual(decodesOf('h265.av1'), ['h265', 'av1'])
  assert.deepEqual(decodesOf('av1.h265.av1'), ['h265', 'av1'])
  assert.deepEqual(decodesOf('av1'), ['av1'])
  assert.deepEqual(decodesOf('none'), [])
  assert.deepEqual(decodesOf(undefined), [])
  assert.deepEqual(decodesOf('h264'), [])
})
