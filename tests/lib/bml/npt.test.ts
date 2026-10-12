import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  NPT_MILLISECONDS_MODULUS,
  NPT_MODULUS,
  nptAt,
  nptMilliseconds,
  nptReadingAt,
  nptReadingOf,
} from '@/lib/bml/npt'

const REFERENCE = {
  tag: 0x40,
  stc: 900_000,
  npt: 90_000,
  numerator: 1,
  denominator: 1,
}

test('the NPT at a moment runs on from the reference at the rate of its scale, before the moment it names as after it', () => {
  assert.equal(nptAt(REFERENCE, 990_000), 180_000)
  assert.equal(nptAt(REFERENCE, 810_000), 0)
  assert.equal(
    nptAt({ ...REFERENCE, numerator: 1, denominator: 2 }, 1_080_000),
    180_000,
  )
})

test('the NPT stays inside thirty-three bits as it comes around', () => {
  assert.equal(nptAt({ ...REFERENCE, npt: NPT_MODULUS - 10 }, 900_020), 10)
  assert.equal(nptAt({ ...REFERENCE, npt: 5 }, 899_990), NPT_MODULUS - 5)
})

test('a reading is the NPT in whole milliseconds at a second of the clock, with the rate', () => {
  assert.deepEqual(
    nptReadingAt({ ...REFERENCE, numerator: 3, denominator: 2 }, 11),
    {
      tag: 0x40,
      milliseconds: 2_500,
      rate: 1.5,
    },
  )
})

test('a reading comes on at its rate and comes around with the NPT', () => {
  const reading = { tag: 0x40, milliseconds: 1_000, rate: 0.5 }

  assert.equal(nptMilliseconds(reading, 0), 1_000)
  assert.equal(nptMilliseconds(reading, 999), 1_499)
  assert.equal(
    nptMilliseconds(
      {
        ...reading,
        milliseconds: Math.floor(NPT_MILLISECONDS_MODULUS) - 1,
        rate: 1,
      },
      2,
    ),
    0,
  )
})

test('a reading of the wrong shape is not taken', () => {
  const reading = { tag: 0x40, milliseconds: 0, rate: 1 }

  assert.deepEqual(nptReadingOf(reading), reading)

  for (const bad of [
    null,
    { ...reading, tag: 256 },
    { ...reading, tag: 1.5 },
    { ...reading, milliseconds: -1 },
    { ...reading, milliseconds: 0.5 },
    { ...reading, rate: 0 },
    { ...reading, rate: Infinity },
    { ...reading, rate: '1' },
  ]) {
    assert.equal(nptReadingOf(bad), null)
  }
})
