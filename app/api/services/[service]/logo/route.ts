export const dynamic = 'force-dynamic'

const SERVICE = /^\d{1,5}-\d{1,5}$/

const PASSED_ON = [
  'content-type',
  'content-length',
  'cache-control',
  'etag',
  'last-modified',
]

export async function GET(
  request: Request,
  { params }: { params: Promise<{ service: string }> },
) {
  const baseUrl = process.env.CARINA_API_BASE_URL

  if (!baseUrl) {
    throw new Error('CARINA_API_BASE_URL is not set')
  }

  const { service } = await params

  if (!SERVICE.test(service)) {
    return new Response(null, { status: 404 })
  }

  const asked = request.headers.get('if-none-match')
  const session = request.headers.get('cookie')

  const upstream = await fetch(
    new URL(`/api/services/${service}/logo`, baseUrl),
    {
      headers: {
        ...(asked ? { 'if-none-match': asked } : {}),
        ...(session ? { cookie: session } : {}),
      },
      cache: 'no-store',
      signal: request.signal,
    },
  )

  const headers = new Headers()

  for (const name of PASSED_ON) {
    const value = upstream.headers.get(name)

    if (value !== null) {
      headers.set(name, value)
    }
  }

  if (upstream.status === 304) {
    return new Response(null, { status: 304, headers })
  }

  return new Response(upstream.body, { status: upstream.status, headers })
}
