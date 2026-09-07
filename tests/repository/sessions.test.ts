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

process.env.CARINA_API_BASE_URL = 'http://carina.test'

const { changePassword, getSessions } = await import('@/repository/sessions')

const SESSION_COOKIE = 'carina_session'

const THE_PAGE = '/settings/authentication'

const TYPED = { currentPassword: 'what was typed', newPassword: 'and the new' }

let sent: Request[] = []

function apiAnswering(answer: Response) {
  globalThis.fetch = (async (request: Request) => {
    sent.push(request)

    return answer
  }) as typeof fetch

  ;(globalThis as { velaAsked?: Asked }).velaAsked = asked
}

function envelope(value: unknown, status: number): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function refusing(message: string, status: number): Response {
  return envelope({ status: false, message, data: null }, status)
}

function turnedAway(): Response {
  return new Response(null, { status: 401 })
}

beforeEach(() => {
  sent = []
  asked.cookies = { [SESSION_COOKIE]: 'the-session-that-asked' }
  asked.page = THE_PAGE
})

test('a wrong current password comes back as a refusal the screen can show', async () => {
  apiAnswering(refusing('The current password is wrong.', 401))

  const result = await changePassword(TYPED)

  assert.deepEqual(result, {
    state: 'refused',
    message: 'The current password is wrong.',
  })
  assert.equal(sent.length, 1)
  assert.equal(new URL(sent[0].url).pathname, '/api/auth/password')
})

test('a new password the API will not take comes back with its reason too', async () => {
  apiAnswering(
    refusing('A password is between 12 and 256 characters long.', 400),
  )

  const result = await changePassword(TYPED)

  assert.deepEqual(result, {
    state: 'refused',
    message: 'A password is between 12 and 256 characters long.',
  })
})

test('a session the API no longer knows still ends at the login screen', async () => {
  apiAnswering(turnedAway())

  await assert.rejects(
    () => changePassword(TYPED),
    (error: Error & { where?: string }) => error.where === loginHref(THE_PAGE),
  )
})

test('a change the API takes reports how many other sessions it ended', async () => {
  apiAnswering(
    envelope({ status: true, message: '', data: { sessionsEnded: 3 } }, 200),
  )

  assert.deepEqual(await changePassword(TYPED), {
    state: 'ok',
    sessionsEnded: 3,
  })
})

test('the change is sent as the API will accept it, carrying the session', async () => {
  apiAnswering(
    envelope({ status: true, message: '', data: { sessionsEnded: 0 } }, 200),
  )

  await changePassword(TYPED)

  const [request] = sent

  assert.equal(request.method, 'POST')
  assert.equal(request.headers.get('origin'), 'http://carina.test')
  assert.equal(request.headers.get('content-type'), 'application/json')
  assert.equal(
    request.headers.get('cookie'),
    `${SESSION_COOKIE}=the-session-that-asked`,
  )
  assert.deepEqual(await request.json(), TYPED)
})

test('BR-AU-018: every session on the system is listed, each saying whose it is', async () => {
  apiAnswering(
    envelope(
      {
        status: true,
        message: '',
        data: [
          {
            id: 'theirs',
            displayName: 'nao@example.test',
            method: 'oidc',
            createdAt: '2026-09-05T00:51:56Z',
            lastUsedAt: '2026-09-05T01:00:00Z',
            deviceLabel:
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/150.0.0.0',
            current: false,
          },
          {
            id: 'mine',
            displayName: 'operator',
            method: 'local',
            createdAt: '2026-09-05T02:44:51Z',
            lastUsedAt: '2026-09-05T02:44:51Z',
            deviceLabel: 'curl/8.5.0',
            current: true,
          },
        ],
      },
      200,
    ),
  )

  const rows = await getSessions()

  assert.deepEqual(
    rows.map((row) => [row.id, row.displayName, row.method, row.current]),
    [
      ['theirs', 'nao@example.test', 'oidc', false],
      ['mine', 'operator', 'local', true],
    ],
  )
})
