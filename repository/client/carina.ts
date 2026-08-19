import createClient from 'openapi-fetch'
import type { paths } from '@/repository/client/schema'

export function carinaClient() {
  return createClient<paths>({ baseUrl: requiredBaseUrl() })
}

/**
 * The same client, revalidating with `If-None-Match`. The API stamps the
 * guide with an ETag derived from its visit ledger, so a 304 costs a header
 * round trip instead of the full body; the held body answers in its place.
 */
export function revalidatingCarinaClient() {
  return createClient<paths>({
    baseUrl: requiredBaseUrl(),
    fetch: revalidatingFetch,
  })
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
