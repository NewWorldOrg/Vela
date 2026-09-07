import { APP_EVENTS_PATH } from '@/repository/events'

export const dynamic = 'force-dynamic'

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
