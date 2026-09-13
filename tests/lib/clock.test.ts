import assert from 'node:assert/strict'
import { test } from 'node:test'

import { untilTheNextTick } from '@/lib/clock'

const A_MINUTE = 60_000

test('a tick partway through a minute waits only for the rest of it', () => {
  assert.equal(
    untilTheNextTick(Date.parse('2026-08-08T12:04:17Z'), A_MINUTE),
    43_000,
  )
})

test('a tick landing on the minute waits a whole one rather than firing twice', () => {
  assert.equal(
    untilTheNextTick(Date.parse('2026-08-08T12:04:00Z'), A_MINUTE),
    A_MINUTE,
  )
})

test('a tick fired a hair early waits the hair out, so the minute is not skipped', () => {
  assert.equal(
    untilTheNextTick(Date.parse('2026-08-08T12:04:00Z') - 3, A_MINUTE),
    3,
  )
})

test('the wait is never nought and never longer than the interval asked for', () => {
  for (let past = 0; past < A_MINUTE; past += 997) {
    const waited = untilTheNextTick(
      Date.parse('2026-08-08T12:00:00Z') + past,
      A_MINUTE,
    )

    assert.ok(waited > 0 && waited <= A_MINUTE, `${past} waited ${waited}`)
  }
})

test('a half minute lands on the minute as well as halfway through it', () => {
  assert.equal(
    untilTheNextTick(Date.parse('2026-08-08T12:04:10Z'), 30_000),
    20_000,
  )
  assert.equal(
    untilTheNextTick(Date.parse('2026-08-08T12:04:40Z'), 30_000),
    20_000,
  )
})
