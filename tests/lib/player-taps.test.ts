import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  SECOND_TAP_WITHIN,
  TAPS_RUN_ON_FOR,
  tapZone,
  whatTheTapDoes,
  type TapRun,
  type TapZone,
} from '@/lib/player-taps'

function tapping(taps: [TapZone, number][]) {
  let run: TapRun | null = null

  return taps.map(([zone, at]) => {
    const said = whatTheTapDoes(run, zone, at)

    run = said.run

    return said.answer
  })
}

test('the picture is split into thirds across its width', () => {
  assert.equal(tapZone(0, 900), 'back')
  assert.equal(tapZone(299, 900), 'back')
  assert.equal(tapZone(300, 900), 'middle')
  assert.equal(tapZone(450, 900), 'middle')
  assert.equal(tapZone(600, 900), 'middle')
  assert.equal(tapZone(601, 900), 'forward')
  assert.equal(tapZone(899, 900), 'forward')
})

test('a picture with no width is all middle', () => {
  assert.equal(tapZone(10, 0), 'middle')
  assert.equal(tapZone(Number.NaN, 900), 'middle')
})

test('a tap in the middle plays or pauses at once, every time', () => {
  assert.deepEqual(
    tapping([
      ['middle', 0],
      ['middle', 100],
    ]),
    ['toggle', 'toggle'],
  )
})

test('a tap on either side waits for a second one before playing or pausing', () => {
  assert.deepEqual(tapping([['back', 0]]), ['wait'])
  assert.deepEqual(tapping([['forward', 0]]), ['wait'])
})

test('a second tap on the same side soon enough steps that way instead', () => {
  assert.deepEqual(
    tapping([
      ['back', 0],
      ['back', SECOND_TAP_WITHIN],
    ]),
    ['wait', 'back'],
  )
  assert.deepEqual(
    tapping([
      ['forward', 0],
      ['forward', 120],
    ]),
    ['wait', 'forward'],
  )
})

test('a second tap that comes too late is a new first tap', () => {
  assert.deepEqual(
    tapping([
      ['forward', 0],
      ['forward', SECOND_TAP_WITHIN + 1],
    ]),
    ['wait', 'wait'],
  )
})

test('once stepping, every further tap on a side steps again', () => {
  assert.deepEqual(
    tapping([
      ['forward', 0],
      ['forward', 200],
      ['forward', 600],
      ['forward', 600 + TAPS_RUN_ON_FOR],
    ]),
    ['wait', 'forward', 'forward', 'forward'],
  )
})

test('while stepping, a tap on the other side steps the other way', () => {
  assert.deepEqual(
    tapping([
      ['forward', 0],
      ['forward', 200],
      ['back', 500],
    ]),
    ['wait', 'forward', 'back'],
  )
})

test('a pause after stepping ends the run', () => {
  assert.deepEqual(
    tapping([
      ['back', 0],
      ['back', 200],
      ['back', 200 + TAPS_RUN_ON_FOR + 1],
    ]),
    ['wait', 'back', 'wait'],
  )
})

test('a first tap on the other side is not the second of a pair', () => {
  assert.deepEqual(
    tapping([
      ['back', 0],
      ['forward', 100],
    ]),
    ['wait', 'wait'],
  )
})

test('the middle ends a run of steps and plays or pauses at once', () => {
  assert.deepEqual(
    tapping([
      ['forward', 0],
      ['forward', 200],
      ['middle', 400],
      ['forward', 500],
    ]),
    ['wait', 'forward', 'toggle', 'wait'],
  )
})
