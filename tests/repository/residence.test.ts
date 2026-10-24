import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { NO_RESIDENCE } from '@/lib/bml/receiver-info'
import { RESIDENCE_PATH, residenceRead } from '@/repository/residence'

const document: { paths: Record<string, Record<string, unknown>> } = JSON.parse(
  readFileSync(
    new URL('../../repository/client/carina.json', import.meta.url),
    'utf8',
  ),
)

test('the residence is read and changed on the one path the document names for the data broadcast settings', () => {
  assert.deepEqual(Object.keys(document.paths[RESIDENCE_PATH]).sort(), [
    'get',
    'put',
  ])
})

test('a success in the shape it has is the residence registered, when it changed left aside', () => {
  assert.deepEqual(
    residenceRead(200, {
      data: {
        postalCode: '0000000',
        prefecture: 13,
        changedAt: '2026-10-23T12:00:00Z',
      },
    }),
    { postalCode: '0000000', prefecture: 13 },
  )
  assert.deepEqual(
    residenceRead(200, {
      data: { postalCode: null, prefecture: null, changedAt: null },
    }),
    NO_RESIDENCE,
  )
})

test('anything else reads as not registered', () => {
  for (const [status, answer] of [
    [401, undefined],
    [500, undefined],
    [200, null],
    [200, { data: null }],
    [200, { data: { postalCode: '000', prefecture: 13 } }],
    [200, { data: { postalCode: '0000000', prefecture: 99 } }],
  ] as const) {
    assert.deepEqual(residenceRead(status, answer), NO_RESIDENCE)
  }
})
