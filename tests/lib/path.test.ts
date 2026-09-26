import assert from 'node:assert/strict'
import { test } from 'node:test'

import { addressWith } from '@/lib/path'

test('a value in the patch is set, and the rest of the query is kept', () => {
  assert.equal(
    addressWith('/library', 'q=news&year=2026', { year: '2025' }),
    '/library?q=news&year=2025',
  )
  assert.equal(
    addressWith('/guide', '', { date: '2026-09-27' }),
    '/guide?date=2026-09-27',
  )
})

test('null, undefined and an empty string take the key out', () => {
  assert.equal(
    addressWith('/reservations', 'show=all&epg=moved&page=2', {
      show: null,
      epg: undefined,
      page: '',
    }),
    '/reservations',
  )
})

test('a patch that empties the query leaves the bare path', () => {
  assert.equal(addressWith('/live', 'ch=1', { ch: null }), '/live')
  assert.equal(addressWith('/live', '', {}), '/live')
})
