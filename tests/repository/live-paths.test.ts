import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { liveStreamHref, liveWireHref } from '@/repository/live-paths'

const document: {
  info: { description: string }
  paths: Record<string, unknown>
} = JSON.parse(
  readFileSync(
    new URL('../../repository/client/carina.json', import.meta.url),
    'utf8',
  ),
)

test('a live channel is streamed whole from the pair that names it', () => {
  assert.equal(liveStreamHref(32736, 1024), '/api/live/32736-1024/stream')
})

test('the stream is no operation in the document, so the path is built by hand', () => {
  const named = Object.keys(document.paths).filter((path) =>
    path.startsWith('/api/live/'),
  )

  assert.ok(!named.some((path) => path.endsWith('/stream')))
  assert.match(
    document.info.description,
    /GET \/api\/live\/\{networkId\}-\{serviceId\}\/stream/,
  )
})

test('the document says the stream is what a ticket from the live ticket opens', () => {
  assert.match(
    document.info.description,
    /ticket from `POST \/api\/live\/ticket`/,
  )
})

test('the wire names the format it is asked in last, and nothing where none is settled', () => {
  assert.equal(
    liveWireHref(32736, 1024, '1080p60', 'main', 'h265'),
    '/api/live/ws?network=32736&service=1024&profile=1080p60&sound=main&format=h265',
  )
  assert.equal(
    liveWireHref(32736, 1024, '1080p60', 'main'),
    '/api/live/ws?network=32736&service=1024&profile=1080p60&sound=main',
  )
})

test('the document says the wire is asked for in a format, H.264 where none is named', () => {
  assert.match(
    document.info.description,
    /by `format` \(`h264`, `h265` or `av1`, `h264` when none is named\)/,
  )
})
