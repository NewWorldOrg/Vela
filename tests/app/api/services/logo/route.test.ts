import assert from 'node:assert/strict'
import { test } from 'node:test'

const UPSTREAM = 'http://carina.invalid:8081'

interface Asked {
  url: string
  headers: Record<string, string>
  init?: RequestInit
}

const asked: Asked[] = []

let answers: Response

process.env.CARINA_API_BASE_URL = UPSTREAM

globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  asked.push({
    url: String(input),
    headers: Object.fromEntries(new Headers(init?.headers)),
    init,
  })

  return answers
}) as typeof fetch

const { GET } = await import('@/app/api/services/[service]/logo/route')

function browserAsks(service: string, headers: Record<string, string> = {}) {
  asked.length = 0

  return GET(
    new Request(`http://vela.invalid/api/services/${service}/logo`, {
      headers,
    }),
    { params: Promise.resolve({ service }) },
  )
}

const PICTURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

test('a logo is asked of the API for that service, carrying the session and what the browser holds', async () => {
  answers = new Response(PICTURE, {
    headers: {
      'content-type': 'image/png',
      'content-length': '4',
      'cache-control': 'private, max-age=86400',
      etag: '"logo-2"',
      'last-modified': 'Thu, 01 Oct 2026 00:00:00 GMT',
      'set-cookie': 'carina_session=replaced',
      server: 'carina',
    },
  })

  const given = await browserAsks('50001-1024', {
    cookie: 'carina_session=held',
    'if-none-match': '"logo-1"',
    referer: 'http://vela.invalid/guide',
  })

  assert.equal(asked[0]?.url, `${UPSTREAM}/api/services/50001-1024/logo`)
  assert.deepEqual(asked[0]?.headers, {
    'if-none-match': '"logo-1"',
    cookie: 'carina_session=held',
  })
  assert.equal(given.status, 200)
  assert.deepEqual(Object.fromEntries(given.headers), {
    'content-type': 'image/png',
    'content-length': '4',
    'cache-control': 'private, max-age=86400',
    etag: '"logo-2"',
    'last-modified': 'Thu, 01 Oct 2026 00:00:00 GMT',
  })
  assert.deepEqual(new Uint8Array(await given.arrayBuffer()), PICTURE)
})

test('a logo the browser already holds comes back unchanged with nothing in it', async () => {
  answers = new Response(null, {
    status: 304,
    headers: { etag: '"logo-2"', 'cache-control': 'private, max-age=86400' },
  })

  const given = await browserAsks('50001-1024', { 'if-none-match': '"logo-2"' })

  assert.deepEqual(asked[0]?.headers, { 'if-none-match': '"logo-2"' })
  assert.equal(given.status, 304)
  assert.deepEqual(Object.fromEntries(given.headers), {
    etag: '"logo-2"',
    'cache-control': 'private, max-age=86400',
  })
  assert.equal(given.body, null)
})

test('a service that is not two numbers is never asked of the API', async () => {
  for (const service of [
    '..%2F..%2Fapi%2Fauth%2Fme',
    '50001',
    '50001-1024-1',
    '123456-1',
    'a-b',
    '50001-1024?x=1',
  ]) {
    const given = await browserAsks(service)

    assert.equal(given.status, 404, service)
    assert.equal(asked.length, 0, service)
  }
})

test('a logo the API does not have is handed back as missing', async () => {
  answers = new Response('{"status":false,"message":"none","data":null}', {
    status: 404,
    headers: { 'content-type': 'application/json' },
  })

  const given = await browserAsks('50001-1024')

  assert.equal(given.status, 404)
  assert.equal(asked.length, 1)
})
