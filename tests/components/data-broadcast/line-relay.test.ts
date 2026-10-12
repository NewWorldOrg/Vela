import assert from 'node:assert/strict'
import { test } from 'node:test'

import { modulePayload } from '@/lib/bml/resources'
import { liveLineRelay } from '@/components/data-broadcast/line-relay'

interface Asked {
  input: string
  init: RequestInit
}

function relayAnswering(answer: () => Response | Promise<Response>) {
  const asked: Asked[] = []
  const relay = liveLineRelay('32736-1024', async (input, init) => {
    asked.push({ input, init })

    return answer()
  })

  return { relay, asked }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

test('a transmission is posted to the relay of the channel with the URL, the text and the character set, and its answer handed back', async () => {
  const { relay, asked } = relayAnswering(() =>
    json(200, { data: { result: 1, httpStatus: 200, body: 'ok' } }),
  )

  assert.deepEqual(
    await relay.transmit('http://example.test/a', 'x=1', 'EUC-JP'),
    { said: 'answered', answer: { result: 1, status: 200, body: 'ok' } },
  )
  assert.equal(asked[0].input, '/api/live/32736-1024/data-broadcast/transmit')
  assert.equal(asked[0].init.method, 'POST')
  assert.equal(asked[0].init.credentials, 'same-origin')
  assert.deepEqual(JSON.parse(String(asked[0].init.body)), {
    uri: 'http://example.test/a',
    text: 'x=1',
    charset: 'EUC-JP',
  })
})

test('the relay refusing with 403 is the setting off, and one that fails or cannot be reached is the server unreached', async () => {
  assert.deepEqual(
    await relayAnswering(() => json(403, {})).relay.transmit(
      'http://example.test/',
      '',
      'EUC-JP',
    ),
    { said: 'off' },
  )
  assert.deepEqual(
    await relayAnswering(() => json(503, {})).relay.transmit(
      'http://example.test/',
      '',
      'EUC-JP',
    ),
    { said: 'unreached' },
  )
  assert.deepEqual(
    await relayAnswering(() => {
      throw new TypeError('failed to fetch')
    }).relay.transmit('http://example.test/', '', 'EUC-JP'),
    { said: 'unreached' },
  )
  assert.deepEqual(
    await relayAnswering(() => json(403, {})).relay.fetch(
      'http://example.test/',
    ),
    { said: 'off' },
  )
  assert.deepEqual(
    await relayAnswering(() => {
      throw new TypeError('failed to fetch')
    }).relay.fetch('http://example.test/'),
    { said: 'unreached' },
  )
})

test('a document is fetched through the relay of the channel and read as a module', async () => {
  const carried = {
    tag: 0,
    id: 0,
    version: 0,
    resources: [
      { path: 'top.bml', kind: 'bml' as const, body: new Uint8Array([60]) },
    ],
  }
  const { relay, asked } = relayAnswering(
    () =>
      new Response(modulePayload(carried).slice().buffer as ArrayBuffer, {
        status: 200,
      }),
  )

  assert.deepEqual(await relay.fetch('http://example.test/top.bml'), {
    said: 'answered',
    answer: carried,
  })
  assert.equal(
    asked[0].input,
    '/api/live/32736-1024/data-broadcast/fetch?uri=http%3A%2F%2Fexample.test%2Ftop.bml',
  )
  assert.equal(asked[0].init.method, undefined)
})
