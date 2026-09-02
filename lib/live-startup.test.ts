import assert from 'node:assert/strict'
import { test } from 'node:test'

import { startupRowsOf } from './live-startup.ts'

test('nothing reached yet: the first row is underway and counts from the start', () => {
  assert.deepEqual(
    startupRowsOf({}, 1_240).map((row) => [row.state, row.figure]),
    [
      ['now', '経過 1.2 秒'],
      ['ahead', '—'],
      ['ahead', '—'],
      ['ahead', '—'],
    ],
  )
})

test('a row that is behind reads what it took, and the one underway counts from the last mark', () => {
  const rows = startupRowsOf({ tunerSecured: 612, channelLocked: 2_105 }, 8_505)

  assert.deepEqual(
    rows.map((row) => [row.label, row.state, row.figure]),
    [
      ['チューナー確保', 'done', '0.6 秒'],
      ['選局(lock)', 'done', '1.5 秒'],
      ['トランスコーダ起動', 'now', '経過 6.4 秒'],
      ['最初の絵', 'ahead', '—'],
    ],
  )
})

test('a segment behind a reached one is done, without a figure of its own', () => {
  const rows = startupRowsOf({ transcoderStarted: 3_000 }, 3_400)

  assert.deepEqual(
    rows.map((row) => [row.state, row.figure]),
    [
      ['done', '—'],
      ['done', '—'],
      ['done', '3.0 秒'],
      ['now', '経過 0.4 秒'],
    ],
  )
})

test('the header arriving is not a row of its own, and the picture closes the list', () => {
  const rows = startupRowsOf(
    {
      tunerSecured: 600,
      channelLocked: 2_100,
      transcoderStarted: 2_300,
      initReached: 4_000,
      firstPicture: 4_300,
    },
    9_000,
  )

  assert.deepEqual(
    rows.map((row) => [row.segment, row.state, row.figure]),
    [
      ['tunerSecured', 'done', '0.6 秒'],
      ['channelLocked', 'done', '1.5 秒'],
      ['transcoderStarted', 'done', '0.2 秒'],
      ['firstPicture', 'done', '2.0 秒'],
    ],
  )
})

test('the count underway never runs backwards past its own mark', () => {
  assert.equal(
    startupRowsOf({ tunerSecured: 900 }, 400)[1].figure,
    '経過 0.0 秒',
  )
})
