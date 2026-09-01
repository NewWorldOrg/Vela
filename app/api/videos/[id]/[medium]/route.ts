export const dynamic = 'force-dynamic'

/**
 * Relays the pictures of a recording so the browser can ask for them
 * same-origin. A deployment that routes `/api` straight to the API answers
 * there before this handler is reached; the relay carries the dev server,
 * where no such routing exists — the same arrangement as the event stream.
 *
 * Only the three read surfaces a page draws are carried, and only the inputs
 * they take. A relay that forwarded whatever it was handed would be a way
 * around the API's own surface rather than a way to reach it.
 */
const MEDIA = ['play', 'thumbnail', 'scrub'] as const

const INPUTS = ['from', 'profile', 'at']

type Medium = (typeof MEDIA)[number]

function carried(medium: string): medium is Medium {
  return (MEDIA as readonly string[]).includes(medium)
}

/**
 * What the answer says about itself. The playback headers are what tells a
 * reader which picture arrived — how the recording ended, which route it came
 * by, and whether the stream answers a byte range at all — so they travel on
 * rather than being dropped at the relay.
 */
const PASSED_ON = [
  'content-type',
  'content-length',
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

  const session = request.headers.get('cookie')
  const accept = request.headers.get('accept')

  const upstream = await fetch(upstreamUrl, {
    headers: {
      ...(accept ? { accept } : {}),
      ...(session ? { cookie: session } : {}),
    },
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
