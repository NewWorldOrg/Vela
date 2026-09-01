import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { RecordingDetail } from '@/repository/recordings'
import { isLeftScrambled, scrambledPercent } from '@/lib/recordings'

function detail(scrambledShare?: number) {
  return { scrambledShare } as RecordingDetail
}

/**
 * A recording written before descrambling was in place carries its whole
 * stream as cipher, and nothing decodes it — not this browser, not a player
 * outside it, and not the same request made again in an hour. The reading is
 * what tells that apart from a transcoder that would not start, which does
 * come back on its own.
 */
test('a recording whose packets stayed scrambled is one that will not play', () => {
  assert.equal(isLeftScrambled(detail(5_042_768 / 5_302_549)), true)
  assert.equal(isLeftScrambled(detail(13_934_536 / 16_187_058)), true)
})

test('a recording that descrambled is not one of them', () => {
  assert.equal(isLeftScrambled(detail(0)), false)
  assert.equal(isLeftScrambled(detail()), false)
})

/** The share the API's own quality reading calls 視聴不可の恐れ. */
test('the line is the one the API grades at, and it is inclusive', () => {
  assert.equal(isLeftScrambled(detail(0.0099)), false)
  assert.equal(isLeftScrambled(detail(0.01)), true)
})

test('the share is spelled to one place, as the notice reads it', () => {
  assert.equal(scrambledPercent(detail(5_042_768 / 5_302_549)), '95.1')
  assert.equal(scrambledPercent(detail(0)), '0.0')
})
