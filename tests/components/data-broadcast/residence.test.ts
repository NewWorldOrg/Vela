import assert from 'node:assert/strict'
import { test } from 'node:test'

import { NO_RESIDENCE } from '@/lib/bml/receiver-info'
import { residenceFromCarina } from '@/components/data-broadcast/residence'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

test('the residence is asked of Carina with the session, never from a cache, and read from its answer', async () => {
  const asked: [string, RequestInit][] = []
  const read = await residenceFromCarina(async (input, init) => {
    asked.push([input, init])

    return json(200, {
      status: true,
      message: '',
      data: { postalCode: '0000000', prefecture: 0, changedAt: null },
    })
  })

  assert.deepEqual(read, { postalCode: '0000000', prefecture: 0 })
  assert.equal(asked.length, 1)
  assert.equal(asked[0][0], '/api/data-broadcast/settings')
  assert.equal(asked[0][1].credentials, 'same-origin')
  assert.equal(asked[0][1].cache, 'no-store')
  assert.ok(asked[0][1].signal instanceof AbortSignal)
})

test('a residence Carina refuses, answers in another shape, or never answers is not registered', async () => {
  assert.deepEqual(
    await residenceFromCarina(async () => json(401, { data: null })),
    NO_RESIDENCE,
  )
  assert.deepEqual(
    await residenceFromCarina(async () => new Response('not json')),
    NO_RESIDENCE,
  )
  assert.deepEqual(
    await residenceFromCarina(async () => {
      throw new TypeError('unreached')
    }),
    NO_RESIDENCE,
  )
})
