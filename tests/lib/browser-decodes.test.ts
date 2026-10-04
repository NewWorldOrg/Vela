import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DECODES_COOKIE,
  H265_IN_MP4,
  decodesCookie,
  decodesH265,
  decodesOf,
  type DecodingProbe,
} from '@/lib/browser-decodes'

function probe(
  answer: string,
  supported?: boolean | 'throws',
  asked: string[] = [],
): DecodingProbe {
  return {
    canPlayType: (type) => {
      asked.push(type)

      return answer
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

  assert.equal(await decodesH265(probe('probably', true, asked)), true)
  assert.deepEqual(asked, [H265_IN_MP4, `file ${H265_IN_MP4}`])
})

test('the type asked about is H.265 tagged hvc1', () => {
  assert.match(H265_IN_MP4, /^video\/mp4; codecs="hvc1\./)
})

test('an element that only says maybe, or nothing, is not taken as playing H.265', async () => {
  assert.equal(await decodesH265(probe('maybe', true)), false)
  assert.equal(await decodesH265(probe('', true)), false)
})

test('media capabilities that say no, or fail, outweigh an element that says yes', async () => {
  assert.equal(await decodesH265(probe('probably', false)), false)
  assert.equal(await decodesH265(probe('probably', 'throws')), false)
})

test('a browser without media capabilities is judged by its element alone', async () => {
  assert.equal(await decodesH265(probe('probably')), true)
})

test('the cookie says h265 or none, and is read back as what to tell Carina', () => {
  assert.match(decodesCookie(true), new RegExp(`^${DECODES_COOKIE}=h265;`))
  assert.match(decodesCookie(false), new RegExp(`^${DECODES_COOKIE}=none;`))
  assert.deepEqual(decodesOf('h265'), ['h265'])
  assert.deepEqual(decodesOf('none'), [])
  assert.deepEqual(decodesOf(undefined), [])
  assert.deepEqual(decodesOf('h264'), [])
})
