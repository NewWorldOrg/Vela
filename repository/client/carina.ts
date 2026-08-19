import type { Route } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect, unstable_rethrow } from 'next/navigation'
import createClient from 'openapi-fetch'
import type { paths } from '@/repository/client/schema'
import { RENDERED_PAGE_HEADER, loginHref } from '@/repository/auth'

/**
 * Over https the API names the session cookie with the `__Host-` prefix, which
 * a plain-http deployment cannot use; there it sends the bare name.
 */
const SESSION_COOKIE_NAMES = ['__Host-carina_session', 'carina_session']

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
 */
async function carrying(
  request: Request,
  send: (request: Request) => Promise<Response>,
): Promise<Response> {
  const { session, page } = await asked()
  const sent = new Request(request, { cache: 'no-store' })

  if (session) {
    sent.headers.set('cookie', session)
  }

  const response = await send(sent)

  if (response.status === 401) {
    redirect(loginHref(page) as Route)
  }

  return response
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
  for (const name of SESSION_COOKIE_NAMES) {
    const value = jar.get(name)?.value

    if (value) {
      return `${name}=${value}`
    }
  }

  return undefined
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
