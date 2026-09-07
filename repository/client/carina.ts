import type { Route } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect, unstable_rethrow } from 'next/navigation'
import createClient from 'openapi-fetch'
import type { paths } from '@/repository/client/schema'
import { RENDERED_PAGE_HEADER, loginHref } from '@/repository/auth'

const SESSION_COOKIE_NAME = 'carina_session'

export function carinaClient() {
  return createClient<paths>({
    baseUrl: requiredBaseUrl(),
    fetch: (request) => carrying(request, fetch),
  })
}

export function revalidatingCarinaClient() {
  return createClient<paths>({
    baseUrl: requiredBaseUrl(),
    fetch: (request) => carrying(request, revalidatingFetch),
  })
}

interface Asking {
  session?: string
  page?: string
}

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
