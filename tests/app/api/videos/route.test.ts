import assert from 'node:assert/strict'
import { test } from 'node:test'

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

function browserAsks(headers: Record<string, string>) {
  return GET(
    new Request('http://vela.invalid/api/videos/a-recording/play', { headers }),
    { params: Promise.resolve({ id: 'a-recording', medium: 'play' }) },
  )
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
