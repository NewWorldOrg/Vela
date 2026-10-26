import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { sendSeekWhileLeaving } from '@/components/recordings/send-seek-while-leaving'

const ID = '0123456789abcdef0123456789abcdef'

const fetching = globalThis.fetch

const warning = console.warn

afterEach(() => {
  globalThis.fetch = fetching
  console.warn = warning
})

test('a seek sent while leaving is one same-origin request kept alive past the page, in JSON', () => {
  const asked: { href: string; init: RequestInit | undefined }[] = []

  globalThis.fetch = async (href, init) => {
    asked.push({ href: String(href), init })

    return new Response(null, { status: 200 })
  }

  sendSeekWhileLeaving(ID, {
    event: 'forward',
    means: 'step',
    fromSec: 600,
    toSec: 690,
  })

  assert.equal(asked.length, 1)
  assert.equal(asked[0].href, `/api/recordings/${ID}/seeks`)
  assert.equal(asked[0].init?.method, 'POST')
  assert.equal(asked[0].init?.keepalive, true)
  assert.equal(asked[0].init?.credentials, 'same-origin')
  assert.deepEqual(asked[0].init?.headers, {
    accept: 'application/json',
    'content-type': 'application/json',
  })
  assert.deepEqual(JSON.parse(String(asked[0].init?.body)), {
    event: 'forward',
    means: 'step',
    fromSec: 600,
    toSec: 690,
  })
})

test('a seek that cannot be sent while leaving is told of and stops nothing', async () => {
  const told: unknown[] = []

  console.warn = (...said: unknown[]) => told.push(said[0])
  globalThis.fetch = async () => {
    throw new TypeError('the page is going')
  }

  sendSeekWhileLeaving(ID, {
    event: 'returned',
    means: 'bar',
    fromSec: 700,
    toSec: 612.5,
  })
  await new Promise((done) => setTimeout(done, 0))

  globalThis.fetch = () => {
    throw new TypeError('no fetch here')
  }

  sendSeekWhileLeaving(ID, {
    event: 'forward',
    means: 'bar',
    fromSec: 1,
    toSec: 90,
  })

  assert.deepEqual(told, [
    '[seeks] one was not sent while leaving',
    '[seeks] one was not sent while leaving',
  ])
})
