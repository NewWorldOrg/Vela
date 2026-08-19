import { APP_EVENTS_PATH } from '@/repository/events'

export const dynamic = 'force-dynamic'

/**
 * Relays the API's event stream so the browser can subscribe same-origin.
 * A deployment that routes `/api` straight to the API answers there before
 * this handler is reached; the relay carries the dev server, where no such
 * routing exists.
 *
 * The subscription is authenticated like any other call, so the browser's
 * session travels with it, and a refusal is passed back with its status so the
 * subscriber can tell a refused session from a dropped connection.
 */
export async function GET(request: Request) {
  const baseUrl = process.env.CARINA_API_BASE_URL

  if (!baseUrl) {
    throw new Error('CARINA_API_BASE_URL is not set')
  }

  const session = request.headers.get('cookie')

  const upstream = await fetch(new URL(APP_EVENTS_PATH, baseUrl), {
    headers: {
      accept: 'text/event-stream',
      ...(session ? { cookie: session } : {}),
    },
    cache: 'no-store',
    signal: request.signal,
  })

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type':
        upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-cache',
    },
  })
}
