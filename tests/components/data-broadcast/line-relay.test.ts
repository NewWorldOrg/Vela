import assert from 'node:assert/strict'
import { test } from 'node:test'

import { modulePayload } from '@/lib/bml/resources'
import {
  HYBRIDCAST_RECEIVER_SCRIPT,
  liveLineRelay,
} from '@/components/data-broadcast/line-relay'

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

test('the receiver’s identifier is asked of Carina for the channel, and handed back only when it names one', async () => {
  const card = { caSystemId: 5, cardId: '0A0B0C0D0E0F' }
  const { relay, asked } = relayAnswering(() =>
    json(200, { status: 'success', data: card }),
  )

  assert.deepEqual(await relay.receiverId(), card)
  assert.equal(
    asked[0].input,
    '/api/live/32736-1024/data-broadcast/receiver-id',
  )
  assert.equal(asked[0].init.method, undefined)
  assert.equal(asked[0].init.credentials, 'same-origin')
  assert.equal(asked[0].init.cache, 'no-store')
})

test('an identifier kept back, missing or unreachable is none', async () => {
  assert.equal(
    await relayAnswering(() => json(403, { data: null })).relay.receiverId(),
    null,
  )
  assert.equal(
    await relayAnswering(() => json(404, { data: null })).relay.receiverId(),
    null,
  )
  assert.equal(
    await relayAnswering(() => {
      throw new TypeError('failed to fetch')
    }).relay.receiverId(),
    null,
  )
})

const AIT = 'http://hc.example.test/p/a.ait'

const APPLICATION = {
  orgId: 16,
  appId: 1,
  controlCode: 1,
  entryUrl: 'http://hc.example.test/p/index.html',
  profile: 1,
  boundary: [
    { permissionBitmap: 0x1fff, managedUrls: ['http://example.test'] },
  ],
}

test('an AIT is read through the relay of the channel and its applications handed back', async () => {
  const { relay, asked } = relayAnswering(() =>
    json(200, {
      status: true,
      message: '',
      data: { applications: [APPLICATION] },
    }),
  )

  assert.deepEqual(await relay.ait(AIT), {
    said: 'answered',
    answer: [
      {
        orgId: 16,
        appId: 1,
        controlCode: 1,
        entryUrl: 'http://hc.example.test/p/index.html',
      },
    ],
  })
  assert.equal(
    asked[0].input,
    '/api/live/32736-1024/data-broadcast/ait?uri=http%3A%2F%2Fhc.example.test%2Fp%2Fa.ait',
  )
  assert.equal(asked[0].init.method, undefined)
  assert.equal(asked[0].init.credentials, 'same-origin')
})

test('an AIT refused by the setting, not read, or answered in another shape is not handed back', async () => {
  assert.deepEqual(await relayAnswering(() => json(403, {})).relay.ait(AIT), {
    said: 'off',
  })

  for (const answer of [
    () => json(502, { data: { result: -3, httpStatus: null } }),
    () => json(200, { data: { applications: [{ ...APPLICATION, orgId: 0 }] } }),
    () => json(200, { data: null }),
    () => {
      throw new TypeError('failed to fetch')
    },
  ]) {
    assert.deepEqual(await relayAnswering(answer).relay.ait(AIT), {
      said: 'unreached',
    })
  }
})

test('an application is started by posting the AIT, both identifiers and the receiver script, and the address its frame opens is handed back', async () => {
  const ticket = {
    inTheClear: 'secret',
    lapsesAt: '2026-10-13T00:00:00Z',
    entryUrl: 'http://hc.example.test/p/index.html',
    address:
      '/api/live/32736-1024/data-broadcast/app/secret?uri=http%3A%2F%2Fhc.example.test%2Fp%2Findex.html',
  }
  const { relay, asked } = relayAnswering(() =>
    json(200, { status: true, message: '', data: ticket }),
  )

  assert.deepEqual(
    await relay.startApplication({ ait: AIT, orgId: 16, appId: 1 }),
    {
      said: 'answered',
      answer: { address: ticket.address, entryUrl: ticket.entryUrl },
    },
  )
  assert.equal(asked[0].input, '/api/live/32736-1024/data-broadcast/app/ticket')
  assert.equal(asked[0].init.method, 'POST')
  assert.equal(asked[0].init.credentials, 'same-origin')
  assert.deepEqual(JSON.parse(String(asked[0].init.body)), {
    ait: AIT,
    orgId: 16,
    appId: 1,
    receiverScript: HYBRIDCAST_RECEIVER_SCRIPT,
  })
  assert.match(HYBRIDCAST_RECEIVER_SCRIPT, /^\/[A-Za-z0-9._~/-]+$/)
})

test('a start refused, not found, or answered with an address off this server is not handed back', async () => {
  const start = { ait: AIT, orgId: 16, appId: 1 }
  const ticket = {
    inTheClear: 'secret',
    lapsesAt: '2026-10-13T00:00:00Z',
    entryUrl: 'http://hc.example.test/p/index.html',
  }

  assert.deepEqual(
    await relayAnswering(() => json(403, {})).relay.startApplication(start),
    { said: 'off' },
  )

  for (const answer of [
    () => json(404, { data: null }),
    () => json(429, { data: null }),
    () => json(200, { data: { ...ticket, address: '//elsewhere.test/a' } }),
    () => json(200, { data: { ...ticket, address: 'http://elsewhere.test/' } }),
    () => json(200, { data: { ...ticket, address: '/\\elsewhere.test/' } }),
    () => json(200, { data: ticket }),
    () => {
      throw new TypeError('failed to fetch')
    },
  ]) {
    assert.deepEqual(
      await relayAnswering(answer).relay.startApplication(start),
      { said: 'unreached' },
    )
  }
})
