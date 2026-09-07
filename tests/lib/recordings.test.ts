import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Recording, RecordingDetail } from '@/repository/recordings'
import {
  isLeftScrambled,
  playsInBrowser,
  scrambledPercent,
} from '@/lib/recordings'

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

function row(over: Partial<Recording>) {
  return { outcome: 'complete', ...over } as Recording
}

/**
 * The library's way to the player is offered only where the player would have
 * something to show. Each of the four ways a recording can have nothing ends
 * the same in front of the element, and a row that led there would be leading
 * into a notice.
 */
test('a whole or cut-short recording with a file plays in the browser', () => {
  assert.equal(playsInBrowser(row({ outcome: 'complete' })), true)
  assert.equal(playsInBrowser(row({ outcome: 'truncated' })), true)
  assert.equal(
    playsInBrowser(row({ outcome: 'complete', scrambledShare: 0 })),
    true,
  )
})

test('a recording still being written, one that failed, or one whose file is gone does not', () => {
  assert.equal(playsInBrowser(row({ outcome: 'recording' })), false)
  assert.equal(playsInBrowser(row({ outcome: 'failed' })), false)
  assert.equal(playsInBrowser(row({ fileMissing: true })), false)
})

/** The recording the API grades 視聴不可の恐れ for its cipher, not for its drops. */
test('a recording that stayed scrambled does not, whatever its outcome says', () => {
  assert.equal(
    playsInBrowser(row({ scrambledShare: 5_042_768 / 5_302_549 })),
    false,
  )
})
