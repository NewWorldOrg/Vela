import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  FOLD_LAST_STEP,
  FOLD_STEP_MS,
  foldBand,
  foldBandDelay,
  foldColumn,
  type FoldMotion,
  type FoldPhase,
} from './live-fold.ts'

function running(phase: FoldPhase, staggered = true): FoldMotion {
  return { shown: true, phase, staggered, onSettle: () => {} }
}

const STILL = running('still')
const OPENING = running('opening')
const CLOSING = running('closing')

function delays(motion: FoldMotion, bands: number): (string | undefined)[] {
  return Array.from({ length: bands }, (_, index) =>
    foldBandDelay(index, motion),
  )
}

function msOf(delay: string | undefined): number {
  assert.ok(delay !== undefined, 'the band was given no delay')

  return Number(delay.replace('ms', ''))
}

test('a remembered fold is drawn, not played', () => {
  assert.equal(foldBand(undefined), 'translate-x-0')
  assert.equal(foldBand(STILL), 'translate-x-0')
  assert.equal(foldBandDelay(0, undefined), undefined)
  assert.equal(foldBandDelay(3, STILL), undefined)
  assert.equal(foldColumn(false, undefined), 'w-[344px]')
  assert.equal(foldColumn(true, STILL), 'w-11')
})

test('a band arrives from the fold side and leaves the same way', () => {
  assert.match(foldBand(OPENING), /starting:translate-x-\[min\(100%,344px\)\]/)
  assert.match(foldBand(OPENING), /(^|\s)translate-x-0(\s|$)/)
  assert.match(
    foldBand(CLOSING),
    /(^|\s)translate-x-\[min\(100%,344px\)\](\s|$)/,
  )
  assert.doesNotMatch(foldBand(CLOSING), /starting:/)
})

test('nothing but transform moves, and nothing moves at all when less is asked for', () => {
  for (const classes of [foldBand(OPENING), foldBand(CLOSING)]) {
    assert.match(classes, /transition-\[translate\]/)
    assert.match(classes, /duration-300/)
    assert.match(classes, /ease-fold/)
    assert.match(classes, /motion-reduce:transition-none/)
    assert.doesNotMatch(classes, /opacity/)
  }
})

test('opening walks down the bands and closing walks back up them', () => {
  assert.deepEqual(delays(OPENING, 5), ['0ms', '22ms', '44ms', '66ms', '88ms'])
  assert.deepEqual(
    delays(CLOSING, 5).map(msOf),
    delays(OPENING, 5)
      .map(msOf)
      .map((ms) => FOLD_LAST_STEP * FOLD_STEP_MS - ms),
  )
})

test('the procession stops after the cap, however many channels there are', () => {
  const nine = delays(OPENING, FOLD_LAST_STEP + 1).at(-1)

  assert.equal(nine, '220ms')
  assert.equal(foldBandDelay(FOLD_LAST_STEP + 1, OPENING), nine)
  assert.equal(foldBandDelay(400, OPENING), nine)
  assert.equal(foldBandDelay(400, CLOSING), '0ms')
})

test('a fold turned round mid-flight moves every band at once', () => {
  const turned = running('closing', false)

  assert.deepEqual(delays(turned, 6), Array(6).fill(undefined))
  assert.equal(foldBand(turned), foldBand(CLOSING))
})

test('the column opens with the first band and closes behind the last one', () => {
  assert.match(foldColumn(false, OPENING), /(^|\s)w-\[344px\](\s|$)/)
  assert.doesNotMatch(foldColumn(false, OPENING), /delay-/)
  assert.match(foldColumn(true, CLOSING), /(^|\s)w-11(\s|$)/)
  assert.match(foldColumn(true, CLOSING), /delay-220/)
  assert.equal(msOf(foldBandDelay(0, CLOSING)), 220)
})

test('a column turned round mid-flight does not wait for a stagger it dropped', () => {
  assert.doesNotMatch(foldColumn(true, running('closing', false)), /delay-/)
})

test('the column runs the length the bands run, on the one curve', () => {
  for (const classes of [
    foldColumn(false, OPENING),
    foldColumn(true, CLOSING),
  ]) {
    assert.match(classes, /transition-\[width\]/)
    assert.match(classes, /duration-300/)
    assert.match(classes, /ease-fold/)
    assert.match(classes, /motion-reduce:transition-none/)
  }
})
