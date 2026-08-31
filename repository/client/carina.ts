import type { Route } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect, unstable_rethrow } from 'next/navigation'
import createClient from 'openapi-fetch'
import type { paths } from '@/repository/client/schema'
import { RENDERED_PAGE_HEADER, loginHref } from '@/repository/auth'

/**
 * Reading `next/headers` makes this module server-only, and everything that
 * calls the API with it: a Client Component may take types from `repository/`
 * but never a value out of a module that reaches here, or the build stops with
 * the import trace that got it there. Shared constants a screen needs live in
 * a module of their own — `scan-systems`, `scan-failures`, `search-options`.
 */

/**
 * The API names the session cookie the same way whichever scheme it was reached
 * over, so there is one name to look for. What the `__Host-` prefix would have
 * the browser enforce, the cookie carries as attributes: `Secure` where the
 * scheme allows it, `Path=/`, and no `Domain`.
 */
const SESSION_COOKIE_NAME = 'carina_session'

export function carinaClient() {
  return createClient<paths>({
    baseUrl: requiredBaseUrl(),
    fetch: (request) => carrying(request, fetch),
  })
}

/**
 * The same client, revalidating with `If-None-Match`. The API stamps the
 * guide with an ETag derived from its visit ledger, so a 304 costs a header
 * round trip instead of the full body; the held body answers in its place.
 */
export function revalidatingCarinaClient() {
  return createClient<paths>({
    baseUrl: requiredBaseUrl(),
    fetch: (request) => carrying(request, revalidatingFetch),
  })
}

interface Asking {
  /** The `Cookie` header to send on, when the browser holds a session. */
  session?: string
  /** The page this call belongs to, and the way back to it. */
  page?: string
}

/**
 * Every call to the API goes through here. The browser's session is carried
 * on — a Server Component fetches from Node, which keeps no cookie jar of its
 * own — and the request is pinned to `no-store`, so an answer given to one
 * session is never held for another.
 *
 * A refused session ends at the login screen holding the page as the way back,
 * rather than as a screen that failed to read. An action posts to the page it
 * was taken on, so a refusal mid-action lands in the same place.
 *
 * Which 401 that is, `refusedTheSession` decides.
 */
async function carrying(
  request: Request,
  send: (request: Request) => Promise<Response>,
): Promise<Response> {
  const { session, page } = await asked()
  const sent = changesState(request.method)
    ? statingItsOrigin(request)
    : new Request(request, { cache: 'no-store' })

  if (session) {
    sent.headers.set('cookie', session)
  }

  const response = await send(sent)

  if (await refusedTheSession(response)) {
    redirect(loginHref(page) as Route)
  }

  return response
}

/**
 * A 401 says one of two things, and which one is readable from what came with
 * it. The gate in front of every endpoint turns away a session the API no
 * longer knows before any handler runs, and answers with an empty body; an
 * endpoint that did run and refused what the request asked for answers with
 * the envelope and a sentence naming the reason.
 *
 * Only the first is a sign-in. Reading the second as one throws the screen at
 * the login page carrying a session that still works, and drops the one
 * sentence that says what was wrong — which, on the password screen, leaves a
 * refusal looking exactly like the sign-out a successful change causes.
 */
async function refusedTheSession(response: Response): Promise<boolean> {
  if (response.status !== 401) {
    return false
  }

  try {
    const said: unknown = await response.clone().json()

    return !(
      typeof said === 'object' &&
      said !== null &&
      'message' in said &&
      typeof said.message === 'string' &&
      said.message.length > 0
    )
  } catch {
    return true
  }
}

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS', 'TRACE']

const NOTHING_TO_SAY = '{}'

function changesState(method: string): boolean {
  return !SAFE_METHODS.includes(method.toUpperCase())
}

/**
 * The API answers a request that changes state only when it names the API's
 * own origin and carries `application/json` — the two halves of its CSRF rule
 * a browser cannot forge. Node sends neither on its own, so both are put on
 * here, and a call with nothing to say carries an empty object rather than no
 * body at all.
 */
function statingItsOrigin(request: Request): Request {
  const carriesBody = request.headers.has('content-type')
  const sent = new Request(request, {
    cache: 'no-store',
    ...(carriesBody ? {} : { body: NOTHING_TO_SAY }),
  })

  sent.headers.set('origin', new URL(request.url).origin)

  if (!carriesBody) {
    sent.headers.set('content-type', 'application/json')
  }

  return sent
}

/**
 * What the browser sent in. Outside a request — the health probe script runs
 * there — nothing was sent, and nothing is carried on.
 */
async function asked(): Promise<Asking> {
  try {
    const [jar, sent] = await Promise.all([cookies(), headers()])

    return {
      session: sessionIn(jar),
      page: sent.get(RENDERED_PAGE_HEADER) ?? undefined,
    }
  } catch (error) {
    unstable_rethrow(error)

    return {}
  }
}

function sessionIn(
  jar: Awaited<ReturnType<typeof cookies>>,
): string | undefined {
  const value = jar.get(SESSION_COOKIE_NAME)?.value

  return value ? `${SESSION_COOKIE_NAME}=${value}` : undefined
}

function requiredBaseUrl(): string {
  const baseUrl = process.env.CARINA_API_BASE_URL

  if (!baseUrl) {
    throw new Error('CARINA_API_BASE_URL is not set')
  }

  return baseUrl
}

const HELD_BODY_LIMIT = 16

const heldBodies = new Map<string, { etag: string; body: string }>()

async function revalidatingFetch(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return fetch(request)
  }

  const held = heldBodies.get(request.url)
  const sent = new Request(request, { cache: 'no-store' })

  if (held) {
    sent.headers.set('if-none-match', held.etag)
  }

  const response = await fetch(sent)

  if (response.status === 304 && held) {
    hold(request.url, held)

    return new Response(held.body, {
      status: 200,
      headers: { 'content-type': 'application/json', etag: held.etag },
    })
  }

  const etag = response.headers.get('etag')

  if (!response.ok || !etag) {
    return response
  }

  const body = await response.text()

  hold(request.url, { etag, body })

  return new Response(body, {
    status: response.status,
    headers: response.headers,
  })
}

function hold(url: string, entry: { etag: string; body: string }) {
  heldBodies.delete(url)
  heldBodies.set(url, entry)

  for (const key of heldBodies.keys()) {
    if (heldBodies.size <= HELD_BODY_LIMIT) {
      break
    }

    heldBodies.delete(key)
  }
}
