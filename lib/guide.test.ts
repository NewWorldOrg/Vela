import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  broadcastDateOf,
  nowMinOf,
  openingScrollTopOf,
  windowStartOf,
} from './guide.ts'

/** The height the grid gives an hour, which the guide's own metrics set. */
const HOUR_PX = 96

/**
 * One in the morning on the 21st: past midnight, and so still inside the
 * broadcast day the 20th named. Written as the instant it is, because that is
 * all the API ever hands over.
 */
const AFTER_MIDNIGHT = new Date('2026-08-20T16:00:00Z')

test('an hour past midnight still belongs to the day before', () => {
  assert.equal(broadcastDateOf(AFTER_MIDNIGHT), '2026-08-20')
})

test('the last minute before four still belongs to the day before', () => {
  assert.equal(broadcastDateOf(new Date('2026-08-20T18:59:59Z')), '2026-08-20')
})

test('four in the morning is where the next day starts', () => {
  assert.equal(broadcastDateOf(new Date('2026-08-20T19:00:00Z')), '2026-08-21')
})

test('a broadcast day opens at four in the morning, Japan time', () => {
  assert.equal(
    windowStartOf('2026-08-20').toISOString(),
    '2026-08-19T19:00:00.000Z',
  )
})

test('an hour past midnight sits twenty-one hours into its broadcast day', () => {
  assert.equal(
    nowMinOf(AFTER_MIDNIGHT, windowStartOf(broadcastDateOf(AFTER_MIDNIGHT))),
    21 * 60,
  )
})

test('a window that does not hold now is given no now at all', () => {
  assert.equal(nowMinOf(AFTER_MIDNIGHT, windowStartOf('2026-08-21')), undefined)
  assert.equal(nowMinOf(AFTER_MIDNIGHT, windowStartOf('2026-08-19')), undefined)
})

test('the guide opens half an hour above the line', () => {
  assert.equal(openingScrollTopOf(600, HOUR_PX), (570 / 60) * HOUR_PX)
})

test('it opens half an hour above the line an hour past midnight too', () => {
  const nowMin = nowMinOf(
    AFTER_MIDNIGHT,
    windowStartOf(broadcastDateOf(AFTER_MIDNIGHT)),
  )

  assert.equal(nowMin, 1260)
  assert.equal(
    openingScrollTopOf(nowMin, HOUR_PX),
    ((nowMin as number) / 60) * HOUR_PX - HOUR_PX / 2,
  )
})

test('a day the present is not in opens at the top', () => {
  assert.equal(openingScrollTopOf(undefined, HOUR_PX), 0)
})

test('the first half hour of a day opens at the top, not above it', () => {
  assert.equal(openingScrollTopOf(0, HOUR_PX), 0)
  assert.equal(openingScrollTopOf(29, HOUR_PX), 0)
})

test('a minute past the lead opens a minute in', () => {
  assert.equal(openingScrollTopOf(31, HOUR_PX), HOUR_PX / 60)
})
