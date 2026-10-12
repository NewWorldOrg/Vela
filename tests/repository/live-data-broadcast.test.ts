import assert from 'node:assert/strict'
import { test } from 'node:test'

import { modulePayload } from '@/lib/bml/resources'
import {
  fetchRelayed,
  liveDataBroadcastFetchHref,
  liveDataBroadcastReceiverIdHref,
  liveDataBroadcastTransmitHref,
  receiverIdRelayed,
  transmitAnswerOf,
  transmitRelayed,
} from '@/repository/live-data-broadcast'

test('the relay is asked for the channel watched live, and the URL fetched rides in the query', () => {
  assert.equal(
    liveDataBroadcastTransmitHref('32736-1024'),
    '/api/live/32736-1024/data-broadcast/transmit',
  )
  assert.equal(
    liveDataBroadcastFetchHref(
      '32736-1024',
      'http://example.test/a b.bml?x=1&y=2',
    ),
    '/api/live/32736-1024/data-broadcast/fetch?uri=http%3A%2F%2Fexample.test%2Fa+b.bml%3Fx%3D1%26y%3D2',
  )
})

test('a transmission answered is its result, status and body as the relay said them, a 4xx status included', () => {
  assert.deepEqual(
    transmitRelayed(200, {
      status: 'success',
      message: '',
      data: { result: 1, httpStatus: 404, body: 'not here' },
    }),
    { said: 'answered', answer: { result: 1, status: 404, body: 'not here' } },
  )

  const timedOut = transmitRelayed(200, {
    data: { result: -3, httpStatus: null, body: null },
  })

  assert.equal(timedOut.said, 'answered')
  assert.equal(timedOut.said === 'answered' && timedOut.answer.result, -3)
  assert.ok(
    timedOut.said === 'answered' && Number.isNaN(timedOut.answer.status),
  )
  assert.equal(timedOut.said === 'answered' && timedOut.answer.body, '')
})

test('the relay refusing with 403 is the setting off, and any other failure or shape is the server unreached', () => {
  assert.deepEqual(transmitRelayed(403, undefined), { said: 'off' })
  assert.deepEqual(transmitRelayed(500, undefined), { said: 'unreached' })
  assert.deepEqual(transmitRelayed(502, undefined), { said: 'unreached' })
  assert.deepEqual(transmitRelayed(200, { data: { result: 'x' } }), {
    said: 'unreached',
  })
  assert.deepEqual(transmitRelayed(200, null), { said: 'unreached' })

  const failed = transmitAnswerOf({ said: 'unreached' })

  assert.ok(Number.isNaN(failed.result))
  assert.ok(Number.isNaN(transmitAnswerOf({ said: 'off' }).result))
})

test('a fetch answered is the module the relay sent, and the setting off or anything else is not', () => {
  const carried = {
    tag: 0,
    id: 0,
    version: 0,
    resources: [
      { path: 'top.bml', kind: 'bml' as const, body: new Uint8Array([60, 98]) },
    ],
  }

  assert.deepEqual(fetchRelayed(200, modulePayload(carried)), {
    said: 'answered',
    answer: carried,
  })
  assert.deepEqual(fetchRelayed(403, null), { said: 'off' })
  assert.deepEqual(fetchRelayed(404, null), { said: 'unreached' })
  assert.deepEqual(fetchRelayed(200, new Uint8Array([9, 9])), {
    said: 'unreached',
  })
})

test('the receiver’s identifier is asked of Carina for the channel watched live', () => {
  assert.equal(
    liveDataBroadcastReceiverIdHref('32736-1024'),
    '/api/live/32736-1024/data-broadcast/receiver-id',
  )
})

test('the identifier Carina names is the card’s CA system and its twelve hexadecimal digits, and anything else names none', () => {
  const card = { caSystemId: 5, cardId: '0A0B0C0D0E0F' }

  assert.deepEqual(
    receiverIdRelayed(200, { status: 'success', data: card }),
    card,
  )
  assert.equal(receiverIdRelayed(403, { data: card }), null)
  assert.equal(receiverIdRelayed(404, { data: null }), null)
  assert.equal(receiverIdRelayed(200, { data: null }), null)
  assert.equal(receiverIdRelayed(200, null), null)
  assert.equal(
    receiverIdRelayed(200, { data: { caSystemId: 5, cardId: '0A0B0C' } }),
    null,
  )
  assert.equal(
    receiverIdRelayed(200, {
      data: { caSystemId: '5', cardId: '0A0B0C0D0E0F' },
    }),
    null,
  )
})
