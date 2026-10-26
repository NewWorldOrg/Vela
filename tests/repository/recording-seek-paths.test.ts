import assert from 'node:assert/strict'
import { test } from 'node:test'

import { recordingSeeksHref, seekBody } from '@/repository/recording-seek-paths'

test('a seek is taken under the recording it was made in, beside the skips', () => {
  assert.equal(
    recordingSeeksHref('0123456789abcdef0123456789abcdef'),
    '/api/recordings/0123456789abcdef0123456789abcdef/seeks',
  )
  assert.equal(recordingSeeksHref('a/b'), '/api/recordings/a%2Fb/seeks')
})

test('a seek is sent as what it was, how it was made and its two moments, and nothing else', () => {
  assert.deepEqual(
    seekBody({ event: 'forward', means: 'key', fromSec: 600, toSec: 690 }),
    { event: 'forward', means: 'key', fromSec: 600, toSec: 690 },
  )
})
