import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  QualityLevel,
  Recording,
  RecordingDetail,
} from '@/repository/recordings'
import { NOT_YET_IN_THIS_BUILD } from '@/lib/not-yet-in-this-build'
import {
  inProgressFirst,
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

function listed(id: string, outcome: Recording['outcome']) {
  return { id, outcome }
}

test('recordings still being written come first, and each side keeps the order it came in', () => {
  const rows = [
    listed('a1', 'complete'),
    listed('a2', 'recording'),
    listed('a3', 'failed'),
    listed('a4', 'truncated'),
    listed('a5', 'recording'),
  ]

  assert.deepEqual(
    inProgressFirst(rows).map((one) => one.id),
    ['a2', 'a5', 'a1', 'a3', 'a4'],
  )
  assert.deepEqual(
    rows.map((one) => one.id),
    ['a1', 'a2', 'a3', 'a4', 'a5'],
  )
})

test('a list with nothing being written keeps its order', () => {
  const rows = [listed('a1', 'complete'), listed('a2', 'failed')]

  assert.deepEqual(
    inProgressFirst(rows).map((one) => one.id),
    ['a1', 'a2'],
  )
  assert.deepEqual(inProgressFirst([]), [])
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

function detail(over: Partial<RecordingDetail> = {}) {
  return over as RecordingDetail
}

test('a recording the API graded as scrambled beyond watching is one that will not play', () => {
  assert.equal(
    isLeftScrambled(detail({ scrambleQuality: 'mayNotBeWatchable' })),
    true,
  )
})

test('a scramble level below that, unmeasured, unknown or absent is not one of them', () => {
  for (const level of [
    'good',
    'warning',
    'unmeasured',
    'unreachable' as RecordingDetail['scrambleQuality'],
    undefined,
  ] as const) {
    assert.equal(isLeftScrambled(detail({ scrambleQuality: level })), false)
  }
})

test('the share of scrambled packets is never the judge, however large it is', () => {
  assert.equal(
    isLeftScrambled(
      detail({
        scrambledShare: 5_042_768 / 5_302_549,
        scrambleQuality: 'good',
      }),
    ),
    false,
  )
})

test('the share is spelled to one place, as the notice reads it', () => {
  assert.equal(
    scrambledPercent(detail({ scrambledShare: 5_042_768 / 5_302_549 })),
    '95.1',
  )
  assert.equal(scrambledPercent(detail({ scrambledShare: 0 })), '0.0')
})

function row(over: Partial<Recording>) {
  return { outcome: 'complete', ...over } as Recording
}

test('a whole or cut-short recording with a file plays in the browser', () => {
  assert.equal(playsInBrowser(row({ outcome: 'complete' })), true)
  assert.equal(playsInBrowser(row({ outcome: 'truncated' })), true)
  assert.equal(
    playsInBrowser(row({ outcome: 'complete', scrambleQuality: 'good' })),
    true,
  )
})

test('a recording still being written, one that failed, or one whose file is gone does not', () => {
  assert.equal(playsInBrowser(row({ outcome: 'recording' })), false)
  assert.equal(playsInBrowser(row({ outcome: 'failed' })), false)
  assert.equal(playsInBrowser(row({ fileMissing: true })), false)
})

test('a recording whose scramble level may not be watchable does not, whatever its outcome says', () => {
  assert.equal(
    playsInBrowser(
      row({
        scrambleQuality: 'mayNotBeWatchable',
        quality: { measured: true, level: 'mayNotBeWatchable' },
      }),
    ),
    false,
  )
})

test('a recording graded unwatchable by its drops alone still plays', () => {
  assert.equal(
    playsInBrowser(
      row({
        scrambleQuality: 'good',
        quality: { measured: true, level: 'mayNotBeWatchable' },
        scrambledShare: 0,
      }),
    ),
    true,
  )
})

test('a scramble level not measured, or one this build has no name for, does not stop playback', () => {
  assert.equal(playsInBrowser(row({ scrambleQuality: 'unmeasured' })), true)
  assert.equal(
    playsInBrowser(
      row({
        scrambleQuality: 'unreachable' as Recording['scrambleQuality'],
        scrambledShare: 5_042_768 / 5_302_549,
      }),
    ),
    true,
  )
  assert.equal(playsInBrowser(row({})), true)
})
