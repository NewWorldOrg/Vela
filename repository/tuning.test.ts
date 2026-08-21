import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  channelLabel,
  measurementOf,
  promisedEndOf,
  receptionOf,
  tuningLabelOf,
} from './tuning.ts'

const MEASURED_AT = '2026-08-15T03:20:00Z'

const terrestrial = (physicalChannel: number) => ({
  system: 'isdbT' as const,
  physicalChannel,
  transportStreamId: null,
})

const bs = (physicalChannel: number, transportStreamId: number | null) => ({
  system: 'isdbSBs' as const,
  physicalChannel,
  transportStreamId,
})

const cs110 = (physicalChannel: number) => ({
  system: 'isdbSCs110' as const,
  physicalChannel,
  transportStreamId: null,
})

test('a terrestrial tuning is named by its physical channel alone', () => {
  assert.equal(channelLabel(terrestrial(57)), '57ch')
})

test('a satellite slot carries the stream that tells the twins apart', () => {
  assert.equal(channelLabel(bs(15, 50001)), 'BS15 / TS 50001')
})

test('a satellite slot with no stream named is still a slot', () => {
  assert.equal(channelLabel(bs(15, null)), 'BS15')
})

test('a CS110 tuning is named by its channel, which carries no stream', () => {
  assert.equal(channelLabel(cs110(24)), 'ND24')
})

test('the API may spell a channel as a string, and it still reads as one', () => {
  assert.equal(
    channelLabel({
      system: 'isdbT',
      physicalChannel: '57',
      transportStreamId: null,
    }),
    '57ch',
  )
})

test('reception is unread while nothing has been measured', () => {
  assert.equal(receptionOf(null), 'unread')
})

test('reception is locked when the frontend locked', () => {
  assert.equal(
    receptionOf({
      locked: true,
      cnrMilliDecibels: 31_200,
      measuredAt: MEASURED_AT,
      postViterbiErrorBits: null,
      postViterbiTotalBits: null,
    }),
    'locked',
  )
})

test('reception is unlocked when the frontend did not lock', () => {
  assert.equal(
    receptionOf({
      locked: false,
      cnrMilliDecibels: 8_200,
      measuredAt: MEASURED_AT,
      postViterbiErrorBits: null,
      postViterbiTotalBits: null,
    }),
    'unlocked',
  )
})

test('a locked reading with a figure becomes the figure the meter draws', () => {
  assert.deepEqual(
    measurementOf({
      locked: true,
      cnrMilliDecibels: 31_200,
      measuredAt: MEASURED_AT,
      postViterbiErrorBits: null,
      postViterbiTotalBits: null,
    }),
    { value: '31.2 dB', percent: 78, tone: 'ok' },
  )
})

test('a locked reading without a figure has no figure to draw', () => {
  assert.equal(
    measurementOf({
      locked: true,
      cnrMilliDecibels: null,
      measuredAt: MEASURED_AT,
      postViterbiErrorBits: null,
      postViterbiTotalBits: null,
    }),
    undefined,
  )
})

/**
 * An unlocked frontend still answers with a plausible-looking carrier-to-noise
 * figure, so the reading is only a reading once the lock says so. Drawing the
 * number anyway would present "could not be measured" as a measurement.
 */
test('an unlocked reading is not a figure, however much it looks like one', () => {
  assert.equal(
    measurementOf({
      locked: false,
      cnrMilliDecibels: 8_200,
      measuredAt: MEASURED_AT,
      postViterbiErrorBits: null,
      postViterbiTotalBits: null,
    }),
    undefined,
  )
})

test('nothing measured draws nothing', () => {
  assert.equal(measurementOf(null), undefined)
})

test('the meter tone falls with the figure', () => {
  const toneAt = (cnrMilliDecibels: number) =>
    measurementOf({
      locked: true,
      cnrMilliDecibels,
      measuredAt: MEASURED_AT,
      postViterbiErrorBits: null,
      postViterbiTotalBits: null,
    })?.tone

  assert.equal(toneAt(25_000), 'ok')
  assert.equal(toneAt(24_900), 'warn')
  assert.equal(toneAt(15_000), 'warn')
  assert.equal(toneAt(14_900), 'err')
})

test('the meter fills to its width and no further', () => {
  const percentAt = (cnrMilliDecibels: number) =>
    measurementOf({
      locked: true,
      cnrMilliDecibels,
      measuredAt: MEASURED_AT,
      postViterbiErrorBits: null,
      postViterbiTotalBits: null,
    })?.percent

  assert.equal(percentAt(40_000), 100)
  assert.equal(percentAt(48_000), 100)
  assert.equal(percentAt(-1_000), 0)
})

test('a session names the tuning it was started with', () => {
  assert.equal(tuningLabelOf(terrestrial(57)), '57ch')
  assert.equal(tuningLabelOf(bs(15, 50001)), 'BS15 / TS 50001')
  assert.equal(tuningLabelOf(cs110(24)), 'ND24')
})

test('a session holding no tuning names none', () => {
  assert.equal(tuningLabelOf(null), undefined)
})

/**
 * `unspecified` is the contract's way of carrying nothing, not a fourth
 * system. Reading it as one would put "0ch" on a row.
 */
test('the absent system is absence, not a system', () => {
  assert.equal(
    tuningLabelOf({
      system: 'unspecified',
      physicalChannel: 0,
      transportStreamId: null,
    }),
    undefined,
  )
})

const ENDS_AT = '2026-08-07T21:15:00+09:00'

test('a recording carries the end it was started with', () => {
  assert.equal(promisedEndOf('recording', ENDS_AT), ENDS_AT)
})

/**
 * Every other purpose is given the driver's own upper bound, which is where it
 * gets cut off rather than when it is expected to finish. Showing it as a
 * planned end would promise something nobody planned.
 */
test('a purpose with no end of its own promises none', () => {
  assert.equal(promisedEndOf('survey', ENDS_AT), undefined)
  assert.equal(promisedEndOf('surveyNow', ENDS_AT), undefined)
  assert.equal(promisedEndOf('live', ENDS_AT), undefined)
  assert.equal(promisedEndOf('scan', ENDS_AT), undefined)
  assert.equal(promisedEndOf('unspecified', ENDS_AT), undefined)
})

test('a recording the driver gave no end for promises none either', () => {
  assert.equal(promisedEndOf('recording', null), undefined)
})
