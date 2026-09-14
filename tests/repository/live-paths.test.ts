import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { liveStreamHref } from '@/repository/live-paths'

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
