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

test('a recording whose packets stayed scrambled is one that will not play', () => {
  assert.equal(isLeftScrambled(detail(5_042_768 / 5_302_549)), true)
  assert.equal(isLeftScrambled(detail(13_934_536 / 16_187_058)), true)
})

test('a recording that descrambled is not one of them', () => {
  assert.equal(isLeftScrambled(detail(0)), false)
  assert.equal(isLeftScrambled(detail()), false)
})

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

test('a recording that stayed scrambled does not, whatever its outcome says', () => {
  assert.equal(
    playsInBrowser(row({ scrambledShare: 5_042_768 / 5_302_549 })),
    false,
  )
})
