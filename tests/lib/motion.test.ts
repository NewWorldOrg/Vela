import assert from 'node:assert/strict'
import { test } from 'node:test'

import { motionOf, movesNow } from '@/lib/motion'

test('the setting on the display screen wins over the system', () => {
  assert.equal(movesNow('still', false), false)
  assert.equal(movesNow('moves', true), true)
})

test('without a setting of its own, the screen follows the system', () => {
  assert.equal(movesNow(undefined, false), true)
  assert.equal(movesNow(undefined, true), false)
  assert.equal(movesNow('something else', true), false)
})

test('only the two words the switch writes are read back as a setting', () => {
  assert.equal(motionOf('moves'), 'moves')
  assert.equal(motionOf('still'), 'still')
  assert.equal(motionOf(undefined), undefined)
  assert.equal(motionOf(''), undefined)
  assert.equal(motionOf('Still'), undefined)
  assert.equal(motionOf('reduce'), undefined)
})

test('a setting read back from the cookie decides as the switch said it', () => {
  assert.equal(movesNow(motionOf('still'), false), false)
  assert.equal(movesNow(motionOf('moves'), true), true)
  assert.equal(movesNow(motionOf('reduce'), true), false)
  assert.equal(movesNow(motionOf('reduce'), false), true)
})
