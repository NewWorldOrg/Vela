import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { ReceiverId } from '@/lib/bml/line'
import { NO_LINE, liveLine, type LineSettings } from '@/lib/data-broadcast-line'
import type { LineRelay } from '@/repository/live-data-broadcast'

const RELAY: LineRelay = {
  transmit: async () => ({ said: 'unreached' }),
  fetch: async () => ({ said: 'unreached' }),
  receiverId: async () => null,
  ait: async () => ({ said: 'unreached' }),
  startApplication: async () => ({ said: 'unreached' }),
}

const CARD: ReceiverId = { caSystemId: 5, cardId: 'a1b2c3d4e5f6' }

function allowing(
  allowsTheLine: boolean,
  handsTheReceiverId: boolean,
  allowsHybridcast = false,
): LineSettings {
  return { allowsTheLine, handsTheReceiverId, allowsHybridcast }
}

test('live, the line is used only when the viewer allows it', () => {
  assert.equal(liveLine(allowing(true, false), CARD, RELAY).state, 'on')
  assert.equal(liveLine(allowing(false, false), CARD, RELAY).state, 'off')
  assert.equal(liveLine(allowing(false, true), CARD, RELAY).state, 'off')
})

test('the card’s ID is handed over only when both the line and the ID are allowed', () => {
  assert.equal(liveLine(allowing(true, true), CARD, RELAY).receiverId, CARD)
  assert.equal(liveLine(allowing(true, false), CARD, RELAY).receiverId, null)
  assert.equal(liveLine(allowing(false, true), CARD, RELAY).receiverId, null)
  assert.equal(liveLine(allowing(true, true), null, RELAY).receiverId, null)
})

test('Hybridcast is allowed only when both the line and Hybridcast are', () => {
  assert.equal(
    liveLine(allowing(true, false, true), CARD, RELAY).hybridcast,
    true,
  )
  assert.equal(
    liveLine(allowing(false, false, true), CARD, RELAY).hybridcast,
    false,
  )
  assert.equal(
    liveLine(allowing(true, true, false), CARD, RELAY).hybridcast,
    false,
  )
})

test('a recording has no line, no ID and no Hybridcast', () => {
  assert.deepEqual(NO_LINE, {
    state: 'none',
    receiverId: null,
    hybridcast: false,
    relay: null,
  })
})
