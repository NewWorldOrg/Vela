import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { LiveStartup } from './live-wire.ts'
import { startupRowsOf } from './live-startup.ts'

/** A channel as it came up on air: the lock landed after the transcoder. */
const ON_AIR: LiveStartup = {
  tunerSecured: 496,
  channelLocked: 751,
  transcoderStarted: 511,
  initReached: 4_966,
  firstPicture: 4_968,
}

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

test('each row reads what it took from what it waited for, so the lock landing after the transcoder is never negative', () => {
  const rows = startupRowsOf(ON_AIR, 9_000)

  assert.deepEqual(
    rows.map((row) => [row.segment, row.state, row.figure]),
    [
      ['tunerSecured', 'done', '0.5 秒'],
      ['channelLocked', 'done', '0.3 秒'],
      ['transcoderStarted', 'done', '0.0 秒'],
      ['firstPicture', 'done', '4.2 秒'],
    ],
  )

  for (const row of rows) {
    assert.doesNotMatch(row.figure, /-/, `${row.segment} reads ${row.figure}`)
  }
})

test('the lock and the transcoder run side by side: one done leaves the other underway, both counting from the tuner', () => {
  const rows = startupRowsOf({ tunerSecured: 496, transcoderStarted: 511 }, 900)

  assert.deepEqual(
    rows.map((row) => [row.label, row.state, row.figure]),
    [
      ['チューナー確保', 'done', '0.5 秒'],
      ['選局(lock)', 'now', '経過 0.4 秒'],
      ['トランスコーダ起動', 'done', '0.0 秒'],
      ['最初の絵', 'ahead', '—'],
    ],
  )
})

test('the picture waits for whichever of the two finished last', () => {
  const rows = startupRowsOf(
    { tunerSecured: 496, channelLocked: 751, transcoderStarted: 511 },
    1_200,
  )

  assert.deepEqual(
    rows.map((row) => [row.state, row.figure]),
    [
      ['done', '0.5 秒'],
      ['done', '0.3 秒'],
      ['done', '0.0 秒'],
      ['now', '経過 0.4 秒'],
    ],
  )
})

test('a segment waited for by a reached one is done, without a figure of its own', () => {
  const rows = startupRowsOf({ initReached: 4_966 }, 5_000)

  assert.deepEqual(
    rows.map((row) => [row.state, row.figure]),
    [
      ['done', '—'],
      ['done', '—'],
      ['done', '—'],
      ['now', '経過 5.0 秒'],
    ],
  )
})

test('the transcoder alone reached says nothing about the lock, which stays underway', () => {
  const rows = startupRowsOf({ transcoderStarted: 3_000 }, 3_400)

  assert.deepEqual(
    rows.map((row) => [row.state, row.figure]),
    [
      ['done', '—'],
      ['now', '経過 3.4 秒'],
      ['done', '3.0 秒'],
      ['ahead', '—'],
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
      ['transcoderStarted', 'done', '1.7 秒'],
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
