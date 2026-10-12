import assert from 'node:assert/strict'
import { test } from 'node:test'

import { NO_LINE, liveLine } from '@/lib/data-broadcast-line'
import type { LineRelay } from '@/repository/live-data-broadcast'

const RELAY: LineRelay = {
  transmit: async () => ({ said: 'unreached' }),
  fetch: async () => ({ said: 'unreached' }),
}

const CARD = 'a1b2c3d4e5f6'

test('live, the line is used only when the viewer allows it', () => {
  assert.equal(liveLine(true, false, CARD, RELAY).state, 'on')
  assert.equal(liveLine(false, false, CARD, RELAY).state, 'off')
  assert.equal(liveLine(false, true, CARD, RELAY).state, 'off')
})

test('the card’s ID is handed over only when both the line and the ID are allowed', () => {
  assert.equal(liveLine(true, true, CARD, RELAY).receiverId, CARD)
  assert.equal(liveLine(true, false, CARD, RELAY).receiverId, null)
  assert.equal(liveLine(false, true, CARD, RELAY).receiverId, null)
  assert.equal(liveLine(true, true, null, RELAY).receiverId, null)
})

test('a recording has no line and no ID', () => {
  assert.deepEqual(NO_LINE, { state: 'none', receiverId: null, relay: null })
})
