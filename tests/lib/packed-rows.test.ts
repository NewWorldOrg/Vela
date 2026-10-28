import assert from 'node:assert/strict'
import { test } from 'node:test'

import { packedRowsOf, rowsOf } from '@/lib/packed-rows'

interface Row {
  id: string
  startMin: number
  description?: string
  subtitled?: boolean
  booking?: { id: string; standing: string }
}

const ROWS: Row[] = [
  {
    id: 'a',
    startMin: 0,
    description: 'あさのニュース',
    booking: { id: 'r1', standing: 'scheduled' },
  },
  { id: 'b', startMin: 30, subtitled: true },
  { id: 'c', startMin: 0, subtitled: false },
]

test('rows come back as they were packed, a field one row left out still left out', () => {
  assert.deepEqual(rowsOf(packedRowsOf(ROWS)), ROWS)
  assert.equal('description' in rowsOf(packedRowsOf(ROWS))[1], false)
})

test('each field is named once, however many rows carry it', () => {
  const day = Array.from({ length: 60 }, (_, nth) => ROWS[nth % ROWS.length])
  const said = JSON.stringify(packedRowsOf(day))

  assert.equal(said.split('"startMin"').length - 1, 1)
  assert.ok(
    said.length < JSON.stringify(day).length,
    'packing made the rows longer',
  )
})

test('no rows pack to nothing and unpack to no rows', () => {
  assert.deepEqual(rowsOf(packedRowsOf<Row>([])), [])
})
