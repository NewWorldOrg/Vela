import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  SETTLE_WHILE_THE_BAR_SIZES_THE_BOARD,
  fitOf,
  wideRowWidth,
} from '@/lib/player-fit'

const RECORDING = { glyphs: 8, time: true }
const WITH_EVERYTHING = { glyphs: 11, time: true, chapters: true }
const LIVE = { glyphs: 7, latency: 'plain' as const }

test('the wide row is as wide as what it holds', () => {
  assert.equal(wideRowWidth(RECORDING), 616)
  assert.equal(wideRowWidth({ ...RECORDING, chapters: true }), 762)
  assert.equal(wideRowWidth(WITH_EVERYTHING), 894)
  assert.equal(wideRowWidth(LIVE), 572)
  assert.equal(wideRowWidth({ ...LIVE, latency: 'catching up' }), 680)
})

test('a board on a phone takes the compact layout, whatever its row holds', () => {
  assert.equal(fitOf(328, wideRowWidth(RECORDING)), 'compact')
  assert.equal(fitOf(398, wideRowWidth(LIVE)), 'compact')
  assert.equal(fitOf(599.5, 0), 'compact')
})

test('a board too narrow for its wide row keeps one row by moving the rarer controls into the gear', () => {
  assert.equal(fitOf(728, wideRowWidth(WITH_EVERYTHING)), 'tight')
  assert.equal(
    fitOf(780, wideRowWidth({ glyphs: 9, time: true, chapters: true })),
    'tight',
  )
  assert.equal(fitOf(693, wideRowWidth(WITH_EVERYTHING)), 'tight')
})

test('a board wide enough for its wide row keeps the one row of everything', () => {
  assert.equal(
    fitOf(871, wideRowWidth({ ...RECORDING, chapters: true })),
    'wide',
  )
  assert.equal(fitOf(728, wideRowWidth(RECORDING)), 'wide')
  assert.equal(fitOf(693, wideRowWidth(LIVE)), 'wide')
  assert.equal(fitOf(1535, wideRowWidth(WITH_EVERYTHING)), 'wide')
})

test('a board not yet laid out is drawn as on a desk', () => {
  assert.equal(fitOf(0, wideRowWidth(WITH_EVERYTHING)), 'wide')
})

test('while the bar sizes the board, a narrower layout holds until the board is well past its edge', () => {
  const needs = wideRowWidth(WITH_EVERYTHING)
  const settle = SETTLE_WHILE_THE_BAR_SIZES_THE_BOARD

  assert.equal(fitOf(needs + 80, needs, 'tight', settle), 'tight')
  assert.equal(fitOf(needs + settle, needs, 'tight', settle), 'wide')
  assert.equal(fitOf(needs + 80, needs, 'wide', settle), 'wide')
  assert.equal(fitOf(650, needs, 'compact', settle), 'compact')
  assert.equal(fitOf(720, needs, 'compact', settle), 'tight')
})

test('a board sized by the window alone moves between the layouts at their edges', () => {
  const needs = wideRowWidth(RECORDING)

  assert.equal(fitOf(needs, needs, 'tight'), 'wide')
  assert.equal(fitOf(600, needs, 'compact'), 'tight')
})
