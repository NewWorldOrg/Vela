import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, test } from 'node:test'

/**
 * What the browser sent in, for the length of one call. The stood-in
 * `next/headers` reads it, so a test says which session is asking by setting
 * it rather than by reaching into the client.
 */
interface Asked {
  cookies: Record<string, string>
  page?: string
}

const asked: Asked = { cookies: {} }

/**
 * The client under test is a Server Component's, and reads `next/headers` and
 * `next/navigation`. Neither is resolvable outside Next's own build — the
 * package publishes no export map, so a bare `next/headers` names a file that
 * is not there — and neither is what is being tested here, so both are stood
 * in for. `@/` is pointed at the repository root the way the bundler points
 * it. Everything else the client imports, `openapi-fetch` included, is the
 * real thing, and the client itself is loaded unchanged.
 */
const STOOD_IN = new Map<string, string>([
  [
    'next/headers',
    `const asking = () => {
       const it = globalThis.velaAsked
       if (!it) { throw new Error('called outside a request scope') }
       return it
     }
     export const cookies = async () => ({
       get: (name) => name in asking().cookies
         ? { name, value: asking().cookies[name] }
         : undefined,
     })
     export const headers = async () => ({
       get: (name) => name === 'x-vela-page' ? (asking().page ?? null) : null,
     })`,
  ],
  [
    'next/navigation',
    `export class SentTo extends Error {
       constructor(where) { super('sent to ' + where); this.where = where }
     }
     export const redirect = (where) => { throw new SentTo(where) }
     export const unstable_rethrow = (error) => {
       if (error instanceof SentTo) { throw error }
     }`,
  ],
])

const ROOT = new URL('../../', import.meta.url)

registerHooks({
  resolve(specifier, context, next) {
    if (STOOD_IN.has(specifier)) {
      return { url: `vela-stand-in:${specifier}`, shortCircuit: true }
    }

    if (specifier.startsWith('@/')) {
      return next(`${new URL(specifier.slice(2), ROOT).href}.ts`, context)
    }

    return next(specifier, context)
  },
  load(url, context, next) {
    const source = STOOD_IN.get(url.replace('vela-stand-in:', ''))

    if (source !== undefined) {
      return { format: 'module', source, shortCircuit: true }
    }

    return next(url, context)
  },
})

;(globalThis as { velaAsked?: Asked }).velaAsked = asked

process.env.CARINA_API_BASE_URL = 'http://carina.test'

const { carinaClient, revalidatingCarinaClient } = await import('./carina.ts')

/** Every request that reached the network, in the order it was sent. */
let sent: Request[] = []

/** What the API answers next, and what it has left to answer after that. */
let answers: Response[] = []

const SESSION_COOKIE = 'carina_session'

function apiAnswering(...given: Response[]) {
  answers = given
  globalThis.fetch = (async (request: Request) => {
    sent.push(request)

    return answers.shift() ?? body({ data: null })
  }) as typeof fetch
}

function body(value: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
}

beforeEach(() => {
  sent = []
  asked.cookies = { [SESSION_COOKIE]: 'the-session-that-asked' }
  asked.page = undefined
  apiAnswering()
})

test('a read is asked for afresh, never taken from a store', async () => {
  await carinaClient().GET('/api/health')

  assert.equal(sent.length, 1)
  assert.equal(sent[0].cache, 'no-store')
})

test('a write is asked for afresh too', async () => {
  await carinaClient().POST('/api/epg/rebuild', {
    body: { confirm: 'REBUILD' },
  })

  assert.equal(sent.length, 1)
  assert.equal(sent[0].cache, 'no-store')
})

/** A day of the guide, the one read the revalidating client is used for. */
const A_DAY = {
  params: {
    query: {
      type: 'isdbT' as const,
      from: '2026-08-22T19:00:00Z',
      to: '2026-08-23T19:00:00Z',
    },
  },
}

test('a revalidating read is asked for afresh as well', async () => {
  await revalidatingCarinaClient().GET('/api/programs', A_DAY)

  assert.equal(sent.length, 1)
  assert.equal(sent[0].cache, 'no-store')
})

/**
 * A held body is a saving on the wire, not a way of answering. The API is
 * asked every time, and what it answers to the session doing the asking is
 * what that session gets — which is what keeps a body given to one session
 * from being handed to the next one to open the same page.
 */
test('a held body is still checked with the API before it is used again', async () => {
  const stamped = { etag: '"the-guide-as-it-was"' }

  apiAnswering(
    body({ data: 'what the first session was given' }, { headers: stamped }),
    body({ data: 'what the API answers the second' }, { headers: stamped }),
  )

  await revalidatingCarinaClient().GET('/api/programs', A_DAY)

  asked.cookies = { [SESSION_COOKIE]: 'a-different-session' }

  const { data } = await revalidatingCarinaClient().GET('/api/programs', A_DAY)

  assert.equal(sent.length, 2)
  assert.deepEqual(data as unknown, {
    data: 'what the API answers the second',
  })
})

test('the session carried is the one that asked, on every call', async () => {
  await carinaClient().GET('/api/health')

  asked.cookies = { [SESSION_COOKIE]: 'the-next-session' }

  await carinaClient().GET('/api/health')

  assert.deepEqual(
    sent.map((request) => request.headers.get('cookie')),
    [
      `${SESSION_COOKIE}=the-session-that-asked`,
      `${SESSION_COOKIE}=the-next-session`,
    ],
  )
})

test('a request from no session carries none', async () => {
  asked.cookies = {}

  await carinaClient().GET('/api/health')

  assert.equal(sent[0].headers.get('cookie'), null)
})
