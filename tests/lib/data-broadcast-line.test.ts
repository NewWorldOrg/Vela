import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { ReceiverId } from '@/lib/bml/line'
import type { RuntimeMessage } from '@/lib/bml/messages'
import {
  NO_LINE,
  applicationStarter,
  liveLine,
  takenFromTheDocuments,
  type LineSettings,
} from '@/lib/data-broadcast-line'
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

test('an application is started through the relay only while Hybridcast is allowed', () => {
  const allowed = liveLine(allowing(true, false, true), null, RELAY)

  assert.equal(applicationStarter(allowed), RELAY.startApplication)
  assert.equal(
    applicationStarter(liveLine(allowing(true, false, false), null, RELAY)),
    null,
  )
  assert.equal(
    applicationStarter(liveLine(allowing(false, false, true), null, RELAY)),
    null,
  )
  assert.equal(
    applicationStarter(liveLine(allowing(true, false, true), null, null)),
    null,
  )
  assert.equal(applicationStarter(NO_LINE), null)
})

test('a start the documents ask for is taken only while Hybridcast is allowed, and everything else they say as before', () => {
  const start: RuntimeMessage = {
    kind: 'startApp',
    start: { ait: 'http://hc.example.test/a.ait', orgId: 16, appId: 1 },
    greg: Array.from({ length: 64 }, () => ''),
  }
  const allowed = liveLine(allowing(true, false, true), null, RELAY)
  const refused = liveLine(allowing(true, false, false), null, RELAY)

  assert.equal(takenFromTheDocuments(start, allowed), true)
  assert.equal(takenFromTheDocuments(start, refused), false)
  assert.equal(takenFromTheDocuments(start, NO_LINE), false)
  assert.equal(takenFromTheDocuments({ kind: 'unopened' }, refused), true)
  assert.equal(takenFromTheDocuments({ kind: 'exit' }, NO_LINE), true)
})
