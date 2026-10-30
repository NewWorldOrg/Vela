import assert from 'node:assert/strict'
import { test } from 'node:test'

import { conflictLineOf, whatIsLost } from '@/lib/conflict-line'

const NEWS = { startAt: '2026-10-30T12:00:00Z', endAt: '2026-10-30T13:00:00Z' }
const DRAMA = { startAt: '2026-10-30T12:30:00Z', endAt: '2026-10-30T13:24:00Z' }

test('the line runs on half hours from the first start to the last end, and marks the overlap', () => {
  const line = conflictLineOf([NEWS], DRAMA)

  assert.deepEqual(
    line.ticks.map((one) => one.label),
    ['21:00', '21:30', '22:00', '22:30'],
  )
  assert.deepEqual(line.kept, [{ left: 0, width: 2 / 3 }])
  assert.equal(line.lost.left, 1 / 3)
  assert.deepEqual(line.overlap, { left: 1 / 3, width: 1 / 3 })
})

test('the programme that loses the tuner says which part of it goes', () => {
  assert.equal(whatIsLost([NEWS], DRAMA), '頭 30 分が欠ける')
  assert.equal(whatIsLost([DRAMA], NEWS), '終わり 30 分が欠ける')
  assert.equal(
    whatIsLost([NEWS], {
      startAt: '2026-10-30T12:10:00Z',
      endAt: '2026-10-30T12:40:00Z',
    }),
    '全部が欠ける',
  )
  assert.equal(
    whatIsLost(
      [{ startAt: '2026-10-30T12:20:00Z', endAt: '2026-10-30T12:40:00Z' }],
      NEWS,
    ),
    '途中 20 分が欠ける',
  )
  assert.equal(
    whatIsLost([NEWS], {
      startAt: '2026-10-30T13:00:00Z',
      endAt: '2026-10-30T13:30:00Z',
    }),
    undefined,
  )
})
