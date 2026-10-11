import assert from 'node:assert/strict'
import { test } from 'node:test'

import { columnsOf, fieldsOf, fitsField } from '@/lib/bml/structure'
import {
  Table,
  binaryRowsOf,
  csvRowsOf,
  tableClassesOf,
} from '@/lib/bml/tables'

test('a structure names its fields, and padding gives no column', () => {
  const fields = fieldsOf('U:8B, I:16B,P:4B,B:1B,Z:24B,S:16V')

  assert.deepEqual(fields, [
    { type: 'U', length: 8, unit: 'B' },
    { type: 'I', length: 16, unit: 'B' },
    { type: 'P', length: 4, unit: 'B' },
    { type: 'B', length: 1, unit: 'B' },
    { type: 'Z', length: 24, unit: 'B' },
    { type: 'S', length: 16, unit: 'V' },
  ])
  assert.equal(columnsOf(fields ?? []).length, 5)
  assert.equal(fieldsOf(''), null)
  assert.equal(fieldsOf('X:8B'), null)
  assert.equal(fieldsOf('U:8'), null)
  assert.equal(
    fieldsOf(Array.from({ length: 257 }, () => 'U:8B').join(',')),
    null,
  )
})

test('a value fits a field by its kind', () => {
  const [u, s, b] = fieldsOf('U:8B,S:8V,B:1B') ?? []

  assert.equal(fitsField(u, 1), true)
  assert.equal(fitsField(u, '1'), false)
  assert.equal(fitsField(s, 'x'), true)
  assert.equal(fitsField(s, 1), false)
  assert.equal(fitsField(b, true), true)
  assert.equal(fitsField(b, 0), true)
  assert.equal(fitsField(u, Number.NaN), false)
})

test('a binary table is read bit by bit, row after row, and a row cut short is left out', () => {
  const fields = fieldsOf('U:4B,I:4B,P:8B,B:1B,U:7B,Z:16B,S:8V') ?? []
  const row = [0x1f, 0xff, 0x81, 0x00, 0x2a, 0x03, 0x41, 0x42, 0x43]
  const rows = binaryRowsOf(Uint8Array.from([...row, ...row, 0x12]), fields)

  assert.deepEqual(rows, [
    [1, -1, true, 1, '0000042', 'ABC'],
    [1, -1, true, 1, '0000042', 'ABC'],
  ])
  assert.deepEqual(binaryRowsOf(new Uint8Array(0), fields), [])
})

test('a comma-separated table is read line by line as its fields say', () => {
  const fields = fieldsOf('U:8B,S:16V,B:1B,P:8B,I:8B') ?? []
  const rows = csvRowsOf('1,one,1,pad,-2\n\n2,two,0,pad,3\n3,short\n', fields)

  assert.deepEqual(rows, [
    [1, 'one', true, -2],
    [2, 'two', false, 3],
  ])
})

test('a table answers its cells by row and column, slices rows, and searches by conditions', () => {
  const table = new Table(
    [
      [1, 'tokyo', 25],
      [2, 'osaka', 28],
      [3, 'nagoya', 25],
    ],
    3,
  )

  assert.equal(table.nrow, 3)
  assert.equal(table.ncolumn, 3)
  assert.equal(table.toNumber(1, 2), 28)
  assert.equal(table.toString(2, 1), 'nagoya')
  assert.ok(Number.isNaN(table.toNumber(9, 0)))
  assert.equal(table.toString(0, 9), null)
  assert.deepEqual(table.toArray(1, 5), [
    [2, 'osaka', 28],
    [3, 'nagoya', 25],
  ])
  assert.equal(table.toArray(5, 1), null)

  const found: unknown[] = []

  assert.equal(table.search(0, 2, 25, 0, 0, 0, [1], found), 2)
  assert.deepEqual(found, [['tokyo'], ['nagoya']])

  const either: unknown[] = []

  assert.equal(
    table.search(0, 1, 'osaka', 0, 1, 1, 'nagoya', 0, 0, 1, [0], either),
    1,
  )
  assert.deepEqual(either, [[2]])

  const partial: unknown[] = []

  assert.equal(table.search(0, 1, 'ag', 6, 0, 0, [0, 2], partial), 1)
  assert.deepEqual(partial, [[3, 25]])
  assert.equal(table.search(0, 1, 'x', 9, 0, 0, [0], []), -1)
  assert.equal(table.search('0', 0, [], []), -1)
})

test('the table classes read the resources the runtime holds, and a resource that is not there gives an empty table', () => {
  const held = new Map<string, Uint8Array>([
    ['names.csv', new TextEncoder().encode('1,a\n2,b\n')],
    ['pairs.bin', Uint8Array.from([1, 2, 3, 4])],
  ])
  const { BinaryTable, CSVTable } = tableClassesOf((reference) => {
    const body = typeof reference === 'string' ? held.get(reference) : undefined

    return body ? { body, text: String(reference).endsWith('.csv') } : null
  })

  const csv = new CSVTable('names.csv', 'U:8B,S:16V')
  const binary = new BinaryTable('pairs.bin', 'U:8B,U:8B')
  const missing = new CSVTable('gone.csv', 'U:8B')
  const malformed = new CSVTable('names.csv', 'nonsense')

  assert.equal(csv.nrow, 2)
  assert.equal(csv.toString(1, 1), 'b')
  assert.equal(binary.nrow, 2)
  assert.equal(binary.toNumber(1, 0), 3)
  assert.equal(missing.nrow, 0)
  assert.equal(malformed.nrow, 0)
  assert.equal(malformed.ncolumn, 0)
  csv.close()
})
