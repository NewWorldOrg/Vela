import assert from 'node:assert/strict'
import { test } from 'node:test'

import { BOTH_SOURCES } from '@/repository/playback-sources'
import { BOTH_SOUNDS } from '@/repository/sounds'

const UPSTREAM = 'http://carina.invalid:8081'

interface Asked {
  url: string
  headers: Record<string, string>
}

const asked: Asked[] = []

let answers: Response

process.env.CARINA_API_BASE_URL = UPSTREAM

globalThis.fetch = (async (
  input: string | URL | Request,
  init?: RequestInit,
) => {
  const sent: Record<string, string> = {}

  new Headers(init?.headers).forEach((value, name) => {
    sent[name] = value
  })

  asked.push({ url: String(input), headers: sent })

  return answers
}) as typeof fetch

const { GET } = await import('@/app/api/videos/[id]/[medium]/route')

function browserAsks(headers: Record<string, string>, query = '') {
  return GET(
    new Request(`http://vela.invalid/api/videos/a-recording/play${query}`, {
      headers,
    }),
    { params: Promise.resolve({ id: 'a-recording', medium: 'play' }) },
  )
}

function whatWasAskedUpstream() {
  return new URL(asked[0].url).searchParams
}

test('the range the browser asks for reaches the upstream, and the part it answers comes back a part', async () => {
  asked.length = 0
  answers = new Response('0123456789', {
    status: 206,
    headers: {
      'content-type': 'video/mp4',
      'content-length': '10',
      'content-range': 'bytes 4096-4105/1048576',
      'accept-ranges': 'bytes',
    },
  })

  const given = await browserAsks({
    accept: 'video/mp4',
    range: 'bytes=4096-4105',
    cookie: 'a-seat=held',
  })

  assert.deepEqual(asked[0].headers, {
    accept: 'video/mp4',
    range: 'bytes=4096-4105',
    cookie: 'a-seat=held',
  })
  assert.equal(given.status, 206)
  assert.equal(given.headers.get('content-range'), 'bytes 4096-4105/1048576')
  assert.equal(given.headers.get('accept-ranges'), 'bytes')
  assert.equal(given.headers.get('content-length'), '10')
  assert.equal(await given.text(), '0123456789')
})

test('nothing the browser sends beyond those three is carried up', async () => {
  asked.length = 0
  answers = new Response('whole', {
    status: 200,
    headers: { 'content-type': 'video/mp4', 'accept-ranges': 'bytes' },
  })

  const given = await browserAsks({
    accept: 'video/mp4',
    referer: 'http://vela.invalid/recordings/a-recording',
    'user-agent': 'a-browser',
    'x-forwarded-for': '198.51.100.7',
  })

  assert.deepEqual(asked[0].headers, { accept: 'video/mp4' })
  assert.equal(given.status, 200)
  assert.equal(given.headers.get('content-range'), null)
})

test('a range the upstream will not serve is handed back refused, not as the whole thing', async () => {
  asked.length = 0
  answers = new Response('', {
    status: 416,
    headers: {
      'content-range': 'bytes */1048576',
      'accept-ranges': 'bytes',
    },
  })

  const given = await browserAsks({ range: 'bytes=1048577-' })

  assert.deepEqual(asked[0].headers, { range: 'bytes=1048577-' })
  assert.equal(given.status, 416)
  assert.equal(given.headers.get('content-range'), 'bytes */1048576')
})

test('the sound the player names is carried up beside the position and the profile', async () => {
  for (const sound of BOTH_SOUNDS) {
    asked.length = 0
    answers = new Response('a picture', {
      status: 200,
      headers: { 'content-type': 'video/mp4' },
    })

    await browserAsks({}, `?from=12&profile=1080p60&sound=${sound}`)

    const query = whatWasAskedUpstream()

    assert.equal(query.get('from'), '12')
    assert.equal(query.get('profile'), '1080p60')
    assert.equal(query.get('sound'), sound)
  }
})

test('a sound no build offers is carried up as it stands, so the refusal comes from the one that decides', async () => {
  asked.length = 0
  answers = new Response('{}', {
    status: 400,
    headers: { 'content-type': 'application/json' },
  })

  const given = await browserAsks({}, '?from=0&sound=surround')

  assert.equal(whatWasAskedUpstream().get('sound'), 'surround')
  assert.equal(given.status, 400)
})

test('the source the player names is carried up beside the position and the sound', async () => {
  for (const source of BOTH_SOURCES) {
    asked.length = 0
    answers = new Response('a picture', {
      status: 200,
      headers: { 'content-type': 'video/mp4' },
    })

    await browserAsks({}, `?from=12&sound=main&source=${source}`)

    const query = whatWasAskedUpstream()

    assert.equal(query.get('from'), '12')
    assert.equal(query.get('sound'), 'main')
    assert.equal(query.get('source'), source)
  }
})

test('a source no build offers is carried up as it stands, so the refusal comes from the one that decides', async () => {
  asked.length = 0
  answers = new Response('{}', {
    status: 400,
    headers: { 'content-type': 'application/json' },
  })

  const given = await browserAsks({}, '?from=0&source=proxy')

  assert.equal(whatWasAskedUpstream().get('source'), 'proxy')
  assert.equal(given.status, 400)
})

test('nothing the browser puts in the query beyond those five is carried up', async () => {
  asked.length = 0
  answers = new Response('a picture', {
    status: 200,
    headers: { 'content-type': 'video/mp4' },
  })

  await browserAsks(
    {},
    '?from=0&sound=main&source=recording&seat=held&ticket=a-ticket',
  )

  assert.deepEqual([...whatWasAskedUpstream().keys()].sort(), [
    'from',
    'sound',
    'source',
  ])
})
