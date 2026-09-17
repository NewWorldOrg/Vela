import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  ALREADY_AT_THE_BEGINNING_SEC,
  AS_GOOD_AS_WATCHED_THROUGH_SEC,
  hasMovedOn,
  howThePlayerOpens,
  whereToPickUp,
  wholeSecond,
} from '@/lib/playback-resume'

const AN_HOUR = 3600

test('the thresholds are the ones this build says it keeps to', () => {
  assert.equal(ALREADY_AT_THE_BEGINNING_SEC, 30)
  assert.equal(AS_GOOD_AS_WATCHED_THROUGH_SEC, 60)
})

test('a recording nobody has watched is opened at the beginning', () => {
  assert.equal(whereToPickUp(undefined, AN_HOUR), undefined)
})

test('a position in the opening seconds is not a place to be carried back to', () => {
  assert.equal(whereToPickUp(0, AN_HOUR), undefined)
  assert.equal(
    whereToPickUp(ALREADY_AT_THE_BEGINNING_SEC - 1, AN_HOUR),
    undefined,
  )
})

test('the first second past the opening is carried back to', () => {
  assert.equal(
    whereToPickUp(ALREADY_AT_THE_BEGINNING_SEC, AN_HOUR),
    ALREADY_AT_THE_BEGINNING_SEC,
  )
})

test('a recording watched through to the closing seconds is not offered as a continuation', () => {
  assert.equal(
    whereToPickUp(AN_HOUR - AS_GOOD_AS_WATCHED_THROUGH_SEC + 1, AN_HOUR),
    undefined,
  )
  assert.equal(whereToPickUp(AN_HOUR, AN_HOUR), undefined)
})

test('the last second before the closing stretch is still a continuation', () => {
  assert.equal(
    whereToPickUp(AN_HOUR - AS_GOOD_AS_WATCHED_THROUGH_SEC, AN_HOUR),
    AN_HOUR - AS_GOOD_AS_WATCHED_THROUGH_SEC,
  )
})

test('a position past the end of the recording is not carried back to', () => {
  assert.equal(whereToPickUp(AN_HOUR + 500, AN_HOUR), undefined)
})

test('a recording shorter than both thresholds is never a continuation', () => {
  assert.equal(whereToPickUp(45, 80), undefined)
})

test('a recording of unknown length is judged by the opening alone', () => {
  assert.equal(whereToPickUp(600, undefined), 600)
  assert.equal(whereToPickUp(600, 0), 600)
  assert.equal(whereToPickUp(10, undefined), undefined)
})

test('a fraction of a second is carried back to as the whole second it is in', () => {
  assert.equal(whereToPickUp(612.9, AN_HOUR), 612)
})

test('a position that is no number at all is not carried back to', () => {
  assert.equal(whereToPickUp(Number.NaN, AN_HOUR), undefined)
  assert.equal(whereToPickUp(Number.POSITIVE_INFINITY, AN_HOUR), undefined)
})

test('a second named on the address wins over the position that was remembered, and plays', () => {
  assert.deepEqual(howThePlayerOpens(90, 600, AN_HOUR), {
    at: 90,
    playing: true,
  })
})

test('the beginning named on the address is not mistaken for naming nothing', () => {
  assert.deepEqual(howThePlayerOpens(0, 600, AN_HOUR), {
    at: 0,
    playing: true,
  })
})

test('a second named on the address is honoured even where the remembered position would be refused', () => {
  assert.deepEqual(howThePlayerOpens(5, AN_HOUR - 1, AN_HOUR), {
    at: 5,
    playing: true,
  })
})

test('the remembered position opens the recording without playing it', () => {
  assert.deepEqual(howThePlayerOpens(undefined, 600, AN_HOUR), {
    at: 600,
    playing: false,
  })
})

test('nothing named and nothing remembered opens the recording at nothing at all, and plays nothing', () => {
  assert.deepEqual(howThePlayerOpens(undefined, undefined, AN_HOUR), {
    at: undefined,
    playing: false,
  })
})

test('a remembered position the thresholds refuse leaves the recording at the beginning, still not playing', () => {
  assert.deepEqual(howThePlayerOpens(undefined, 10, AN_HOUR), {
    at: undefined,
    playing: false,
  })
})

test('a whole second is what a reading of the position becomes', () => {
  assert.equal(wholeSecond(612.9), 612)
  assert.equal(wholeSecond(0), 0)
  assert.equal(wholeSecond(-5), 0)
  assert.equal(wholeSecond(Number.NaN), 0)
})

test('a second that has not moved on is not worth sending again', () => {
  assert.equal(hasMovedOn(612, 612), false)
})

test('a second nothing has been sent for yet is worth sending', () => {
  assert.equal(hasMovedOn(undefined, 0), true)
})

test('a second that has moved, forwards or back, is worth sending', () => {
  assert.equal(hasMovedOn(612, 613), true)
  assert.equal(hasMovedOn(612, 90), true)
})
