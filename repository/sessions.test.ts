import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, test } from 'node:test'

import { RENDERED_PAGE_HEADER, loginHref } from './auth.ts'

/**
 * The password change as the screen takes it: the real client, the real
 * `openapi-fetch`, and the real module the action calls, with only what Next
 * owns stood in and the API answering the bytes it was measured answering.
 *
 * Nothing here replaces `@/repository/client/carina`. A stand-in for it would
 * be free to hand a refusal back the way this module hopes for, which is the
 * one thing worth proving and the one thing the client did not do.
 */
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

const ROOT = new URL('../', import.meta.url)

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

const { changePassword } = await import('./sessions.ts')

const SESSION_COOKIE = 'carina_session'

const THE_PAGE = '/settings/authentication'

/** What the screen hands over. Neither value is one the API would accept. */
const TYPED = { currentPassword: 'what was typed', newPassword: 'and the new' }

let sent: Request[] = []

function apiAnswering(answer: Response) {
  globalThis.fetch = (async (request: Request) => {
    sent.push(request)

    return answer
  }) as typeof fetch

  ;(globalThis as { velaAsked?: Asked }).velaAsked = asked
}

/**
 * The three answers this endpoint was measured giving, byte for byte. The
 * envelope is the API's own and `message` is where every reason is written;
 * the bare 401 is the gate in front of the endpoint, which answers before any
 * handler runs and sends no body at all.
 */
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

/**
 * The refusal that started this. The API answers a wrong current password with
 * 401 and a sentence, and the screen has nowhere else to learn what happened:
 * anything that eats the 401 leaves it saying nothing while the password on
 * the account stays as it was.
 */
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

/** The other refusal, which the API answers with 400 rather than 401. */
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

/**
 * The 401 that is a sign-in. The gate answers an unknown session with nothing,
 * and that one still has to end at the login screen holding the page — losing
 * this is how the refusal above stops being distinguishable from a sign-out.
 */
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

/**
 * What the request carries is the API's own CSRF rule, which it applies to
 * everything that changes state: a body typed as JSON, and an `origin` naming
 * the API. Node sends neither on its own, and without them the change is
 * refused before it is read.
 */
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
