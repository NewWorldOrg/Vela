import assert from 'node:assert/strict'
import { test } from 'node:test'

import { movesNow } from '@/lib/motion'

test('the setting on the display screen wins over the system', () => {
  assert.equal(movesNow('still', false), false)
  assert.equal(movesNow('moves', true), true)
})

test('without a setting of its own, the screen follows the system', () => {
  assert.equal(movesNow(undefined, false), true)
  assert.equal(movesNow(undefined, true), false)
  assert.equal(movesNow('something else', true), false)
})
