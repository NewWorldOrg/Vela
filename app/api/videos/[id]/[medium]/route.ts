export const dynamic = 'force-dynamic'

const MEDIA = ['play', 'thumbnail', 'scrub'] as const

const INPUTS = ['from', 'profile', 'at']

type Medium = (typeof MEDIA)[number]

function carried(medium: string): medium is Medium {
  return (MEDIA as readonly string[]).includes(medium)
}

const CARRIED_UP = ['accept', 'range', 'cookie']

const PASSED_ON = [
  'content-type',
  'content-length',
  'content-range',
  'accept-ranges',
  'cache-control',
]

const PLAYBACK_PREFIX = 'carina-playback-'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; medium: string }> },
) {
  const baseUrl = process.env.CARINA_API_BASE_URL

  if (!baseUrl) {
    throw new Error('CARINA_API_BASE_URL is not set')
  }

  const { id, medium } = await params

  if (!carried(medium)) {
    return new Response(null, { status: 404 })
  }

  const asked = new URL(request.url)
  const upstreamUrl = new URL(
    `/api/videos/${encodeURIComponent(id)}/${medium}`,
    baseUrl,
  )

  for (const input of INPUTS) {
    const value = asked.searchParams.get(input)

    if (value !== null) {
      upstreamUrl.searchParams.set(input, value)
    }
  }

  const carriedUp = new Headers()

  for (const name of CARRIED_UP) {
    const value = request.headers.get(name)

    if (value !== null) {
      carriedUp.set(name, value)
    }
  }

  const upstream = await fetch(upstreamUrl, {
    headers: carriedUp,
    cache: 'no-store',
    signal: request.signal,
  })

  const headers = new Headers()

  for (const name of PASSED_ON) {
    const value = upstream.headers.get(name)

    if (value !== null) {
      headers.set(name, value)
    }
  }

  upstream.headers.forEach((value, name) => {
    if (name.startsWith(PLAYBACK_PREFIX)) {
      headers.set(name, value)
    }
  })

  return new Response(upstream.body, { status: upstream.status, headers })
}
