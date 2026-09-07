import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, test } from 'node:test'

import { RENDERED_PAGE_HEADER, loginHref } from '@/repository/auth'

interface Asked {
  cookies: Record<string, string>
  page?: string
}

const asked: Asked = { cookies: {} }

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
       get: (name) => name === '${RENDERED_PAGE_HEADER}'
         ? (asking().page ?? null)
         : null,
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

const ROOT = new URL('../../../', import.meta.url)

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

function asking(who: Asked | undefined): void {
  ;(globalThis as { velaAsked?: Asked }).velaAsked = who
}

process.env.CARINA_API_BASE_URL = 'http://carina.test'

const { carinaClient, revalidatingCarinaClient } =
  await import('@/repository/client/carina')

let sent: Request[] = []

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

function turnedAway(): Response {
  return new Response(null, { status: 401 })
}

function refusing(message: string): Response {
  return body({ status: false, message, data: null }, { status: 401 })
}

beforeEach(() => {
  sent = []
  asked.cookies = { [SESSION_COOKIE]: 'the-session-that-asked' }
  asked.page = undefined
  asking(asked)
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

test('a session the API refuses is sent to sign in again, holding the page', async () => {
  asked.page = '/guide?date=2026-08-08'

  apiAnswering(turnedAway())

  await assert.rejects(
    () => carinaClient().GET('/api/health'),
    (error: Error & { where?: string }) =>
      error.where === loginHref('/guide?date=2026-08-08'),
  )
})

test('a 401 that names a reason is handed back with the reason, not signed out', async () => {
  asked.page = '/settings/authentication'

  apiAnswering(refusing('The current password is wrong.'))

  const { data, error, response } = await carinaClient().POST(
    '/api/auth/password',
    { body: { currentPassword: 'not it', newPassword: 'a long enough one' } },
  )

  assert.equal(response.status, 401)
  assert.equal(data, undefined)
  assert.equal(error?.message, 'The current password is wrong.')
})

test('a 401 whose envelope names no reason is a sign-in like any other', async () => {
  asked.page = '/settings/authentication'

  apiAnswering(refusing(''))

  await assert.rejects(
    () => carinaClient().GET('/api/health'),
    (error: Error & { where?: string }) =>
      error.where === loginHref('/settings/authentication'),
  )
})

test('a call from outside a request carries no session and still goes out', async () => {
  asking(undefined)

  await carinaClient().GET('/api/health')

  assert.equal(sent.length, 1)
  assert.equal(sent[0].cache, 'no-store')
  assert.equal(sent[0].headers.get('cookie'), null)
})
