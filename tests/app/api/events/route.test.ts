import assert from 'node:assert/strict'
import { test } from 'node:test'

import { APP_EVENTS_PATH } from '@/repository/events'

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

const { GET } = await import('@/app/api/events/route')

function browserAsks(headers: Record<string, string> = {}) {
  asked.length = 0

  return GET(new Request('http://vela.invalid/api/events', { headers }))
}

test('the stream is asked of the API as a stream, carrying the session', async () => {
  answers = new Response('event: programs\ndata: {}\n\n', {
    headers: { 'content-type': 'text/event-stream' },
  })

  const given = await browserAsks({
    cookie: 'carina_session=held',
    referer: 'http://vela.invalid/guide',
  })

  assert.equal(asked[0]?.url, `${UPSTREAM}${APP_EVENTS_PATH}`)
  assert.deepEqual(asked[0]?.headers, {
    accept: 'text/event-stream',
    cookie: 'carina_session=held',
  })
  assert.equal(asked[0]?.init?.cache, 'no-store')
  assert.equal(given.status, 200)
  assert.equal(given.headers.get('content-type'), 'text/event-stream')
  assert.equal(given.headers.get('cache-control'), 'no-cache')
  assert.equal(await given.text(), 'event: programs\ndata: {}\n\n')
})

test('a browser with no session asks without one', async () => {
  answers = new Response(null, { status: 401 })

  const given = await browserAsks()

  assert.deepEqual(asked[0]?.headers, { accept: 'text/event-stream' })
  assert.equal(given.status, 401)
})

test('a refusal from the API is handed back as the refusal it was', async () => {
  answers = new Response(
    new TextEncoder().encode(
      '{"status":false,"message":"refused","data":null}',
    ),
    { status: 503 },
  )

  const given = await browserAsks({ cookie: 'carina_session=held' })

  assert.equal(given.status, 503)
  assert.equal(given.headers.get('content-type'), 'application/json')
  assert.match(await given.text(), /refused/)
})

test('the browser leaving ends the stream asked of the API', async () => {
  answers = new Response('')

  const leaving = new AbortController()

  await GET(
    new Request('http://vela.invalid/api/events', { signal: leaving.signal }),
  )
  leaving.abort()

  assert.equal(asked.at(-1)?.init?.signal?.aborted, true)
})

test('a relay with nowhere to relay to says so rather than guessing', async () => {
  const before = process.env.CARINA_API_BASE_URL

  delete process.env.CARINA_API_BASE_URL

  try {
    await assert.rejects(() => browserAsks(), /CARINA_API_BASE_URL is not set/)
  } finally {
    process.env.CARINA_API_BASE_URL = before
  }
})
