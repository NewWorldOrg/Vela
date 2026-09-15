import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  QualityLevel,
  Recording,
  RecordingDetail,
} from '@/repository/recordings'
import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import {
  isLeftScrambled,
  minutesMovedLater,
  playsInBrowser,
  recordingQualityShapeOf,
  scrambledPercent,
} from '@/lib/recordings'

test('each level the API grades a recording at has its own badge', () => {
  assert.deepEqual(recordingQualityShapeOf('good'), {
    variant: 'ok',
    label: '良好',
  })
  assert.deepEqual(recordingQualityShapeOf('warning'), {
    variant: 'warn',
    label: '警告水準',
  })
  assert.deepEqual(recordingQualityShapeOf('mayNotBeWatchable'), {
    variant: 'err',
    label: '視聴不可の恐れ',
  })
})

test('a level this build has no name for is not read as the worst one', () => {
  for (const level of ['unreachable' as QualityLevel, undefined]) {
    assert.deepEqual(recordingQualityShapeOf(level), {
      variant: 'mute',
      label: NOT_YET_IN_THIS_BUILD,
    })
  }
})

test('an end the follower moved later is counted in whole minutes, rounded up', () => {
  assert.equal(
    minutesMovedLater('2026-08-09T14:30:00Z', '2026-08-09T14:40:00Z'),
    10,
  )
  assert.equal(
    minutesMovedLater('2026-08-09T14:30:00Z', '2026-08-09T14:30:20Z'),
    1,
  )
})

test('an end that did not move, or moved earlier, has moved nowhere', () => {
  assert.equal(
    minutesMovedLater('2026-08-09T14:30:00Z', '2026-08-09T14:30:00Z'),
    undefined,
  )
  assert.equal(
    minutesMovedLater('2026-08-09T14:30:00Z', '2026-08-09T14:20:00Z'),
    undefined,
  )
})

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
