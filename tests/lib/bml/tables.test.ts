import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  columnsOf,
  fieldsOf,
  fitsField,
  tableStructureOf,
} from '@/lib/bml/structure'
import {
  Table,
  binaryRowsOf,
  csvRowsOf,
  tableClassesOf,
} from '@/lib/bml/tables'
import { zipCodeOf, zipIncludes } from '@/lib/bml/zipcode'

const eucJp = (text: string): number[] => {
  const table: Record<string, number[]> = {
    東: [0xc5, 0xec],
    京: [0xb5, 0xfe],
  }

  return [...text].flatMap((char) => table[char] ?? [char.charCodeAt(0)])
}

test('a structure names its fields in bytes, bits or a varying length, and padding gives no column', () => {
  const fields = fieldsOf('U:2B, U:4b,I:1B,P:3b,B:1b,Z:1V,S:2V,S:7B')

  assert.deepEqual(fields, [
    { type: 'U', length: 2, unit: 'B' },
    { type: 'U', length: 4, unit: 'b' },
    { type: 'I', length: 1, unit: 'B' },
    { type: 'P', length: 3, unit: 'b' },
    { type: 'B', length: 1, unit: 'b' },
    { type: 'Z', length: 1, unit: 'V' },
    { type: 'S', length: 2, unit: 'V' },
    { type: 'S', length: 7, unit: 'B' },
  ])
  assert.equal(columnsOf(fields ?? []).length, 7)
  assert.equal(fieldsOf(''), null)
  assert.equal(fieldsOf('X:8B'), null)
  assert.equal(fieldsOf('U:8'), null)
  assert.equal(fieldsOf('U:8B'), null)
  assert.equal(fieldsOf('I:3B'), null)
  assert.equal(fieldsOf('S:1b'), null)
  assert.equal(fieldsOf('Z:7B'), null)
  assert.equal(fieldsOf(7), null)
  assert.equal(
    fieldsOf(Array.from({ length: 257 }, () => 'U:1B').join(',')),
    null,
  )
})

test('a table structure begins with the bytes of the length before each row, or has none', () => {
  assert.deepEqual(tableStructureOf('1,S:1V'), {
    rowLength: 1,
    fields: [{ type: 'S', length: 1, unit: 'V' }],
  })
  assert.deepEqual(tableStructureOf('0,U:2B,U:4b')?.rowLength, 0)
  assert.deepEqual(tableStructureOf('U:2B')?.rowLength, 0)
  assert.equal(tableStructureOf('5,U:1B'), null)
  assert.equal(tableStructureOf('1,'), null)
  assert.equal(tableStructureOf(null), null)
})

test('a value fits a field by its kind', () => {
  const [u, s, b, z] = fieldsOf('U:1B,S:1V,B:1b,Z:1V') ?? []

  assert.equal(fitsField(u, 1), true)
  assert.equal(fitsField(u, '1'), false)
  assert.equal(fitsField(s, 'x'), true)
  assert.equal(fitsField(s, 1), false)
  assert.equal(fitsField(b, true), true)
  assert.equal(fitsField(b, 0), true)
  assert.equal(fitsField(z, '1000000'), true)
  assert.equal(fitsField(u, Number.NaN), false)
})

test('a binary table whose rows begin with their length is read row by row, its text as the broadcast wrote it', () => {
  const structure = tableStructureOf('1,U:1B,S:1V,S:2V') ?? {
    rowLength: 0,
    fields: [],
  }
  const row = (id: number, name: string, note: string) => {
    const text = eucJp(name)
    const more = eucJp(note)
    const body = [
      id,
      text.length,
      ...text,
      more.length >> 8,
      more.length & 0xff,
      ...more,
    ]

    return [body.length, ...body]
  }
  const rows = binaryRowsOf(
    Uint8Array.from([...row(1, '東京', 'a'), ...row(2, '京', ''), 0x03, 0x01]),
    structure,
  )

  assert.deepEqual(rows, [
    [1, '東京', 'a'],
    [2, '京', ''],
  ])
  assert.deepEqual(binaryRowsOf(new Uint8Array(0), structure), [])
})

test('a binary table without a length before its rows is read bit by bit, each row starting on a byte, and a row cut short is left out', () => {
  const structure = tableStructureOf(
    '0,U:2B,U:4b,U:4b,B:1b,P:7b,I:1B,S:3B',
  ) ?? {
    rowLength: 0,
    fields: [],
  }
  const row = [0x01, 0x02, 0x3a, 0x80, 0xff, 0x41, 0x42, 0x00]
  const rows = binaryRowsOf(Uint8Array.from([...row, ...row, 0x12]), structure)

  assert.deepEqual(rows, [
    [258, 3, 10, true, -1, 'AB'],
    [258, 3, 10, true, -1, 'AB'],
  ])
})

test('a zip code field names runs of postal codes, and a code is in it when an included run holds it and no excluded run does', () => {
  const included = [0x86, 0x84, 0xff, 0xff, 0x0a, 0x0c, 0x00, 0x00]
  const excluded = [0x8a, 0xd1, 0x23, 0x45]
  const zip = zipCodeOf(
    Uint8Array.from([
      1 + excluded.length + included.length,
      excluded.length,
      ...excluded,
      ...included,
    ]),
  )

  assert.deepEqual(zip.includes, [
    { from: 640_000, to: 649_999 },
    { from: 1_000_000, to: 1_299_999 },
  ])
  assert.deepEqual(zip.excludes, [{ from: 1_012_345, to: 1_012_345 }])
  assert.equal(zipIncludes(zip, 640_123), true)
  assert.equal(zipIncludes(zip, 1_100_000), true)
  assert.equal(zipIncludes(zip, 1_012_345), false)
  assert.equal(zipIncludes(zip, 650_000), false)
  assert.equal(zipIncludes(zip, 'x'), false)
  assert.deepEqual(zipCodeOf(new Uint8Array(0)), {
    includes: [],
    excludes: [],
  })
})

test('a comma-separated table is read line by line as its fields say', () => {
  const fields = fieldsOf('U:1B,S:1V,B:1b,P:1B,I:1B') ?? []
  const rows = csvRowsOf('1,one,1,pad,-2\n\n2,two,0,pad,3\n3,short\n', fields)

  assert.deepEqual(rows, [
    [1, 'one', true, -2],
    [2, 'two', false, 3],
  ])
})

function cities(): Table {
  const zip = zipCodeOf(Uint8Array.from([5, 0, 0x86, 0x84, 0xff, 0xff]))

  return new Table(
    [
      [1, 'tokyo', 25, true, zip],
      [2, 'osaka', 28, false, zip],
      [3, 'nagoya', 25, true, zip],
    ],
    fieldsOf('U:1B,S:1V,U:1B,B:1b,Z:1V') ?? [],
  )
}

test('a table answers its cells by row and column and slices its rows, a zip code read as nothing', () => {
  const table = cities()

  assert.equal(table.nrow, 3)
  assert.equal(table.ncolumn, 5)
  assert.equal(table.toNumber(1, 2), 28)
  assert.equal(table.toString(2, 1), 'nagoya')
  assert.equal(table.toString(0, 3), 'true')
  assert.equal(table.toString(0, 4), null)
  assert.ok(Number.isNaN(table.toNumber(0, 4)))
  assert.ok(Number.isNaN(table.toNumber(9, 0)))
  assert.equal(table.toString(0, 9), null)
  assert.deepEqual(table.toArray(1, 5), [
    [2, 'osaka', 28, false, null],
    [3, 'nagoya', 25, true, null],
  ])
  assert.deepEqual(table.toArray(5, 1), [])
  assert.deepEqual(table.toArray(0, 0), [])
  assert.equal(table.toArray(-1, 1), null)
  assert.equal(table.toArray('0', 1), null)
})

test('a search takes conditions of three, whether any one is enough, a count and the array to fill, and answers the row at which the count was reached', () => {
  const table = cities()
  const found: unknown[] = []

  assert.equal(table.search(0, 2, 25, 0, false, 5, found), -1)
  assert.deepEqual(found, [
    [1, 'tokyo', 25, true, false],
    [3, 'nagoya', 25, true, false],
  ])
  assert.equal(table.search(0, 2, 25, 0, false, 1, found), 0)
  assert.deepEqual(found, [[1, 'tokyo', 25, true, false]])

  const either: unknown[] = []

  assert.equal(
    table.search(0, 1, 'osaka', 32, 1, 'nagoya', 32, true, 2, either),
    2,
  )
  assert.deepEqual(
    either.map((row) => (row as unknown[])[0]),
    [2, 3],
  )

  const both: unknown[] = []

  assert.equal(table.search(0, 1, 'osaka', 32, 2, 25, 0, false, 1, both), -1)
  assert.deepEqual(both, [])

  const partial: unknown[] = []

  assert.equal(table.search(1, 1, 'ag', 33, true, 1, partial), 2)
  assert.equal(table.search(0, 1, 'os', 34, true, 1, partial), 1)
  assert.equal(table.search(0, 1, 'ya', 35, true, 1, partial), 2)
  assert.equal(table.search(0, 1, 'tokyo', 36, true, 1, partial), 1)
  assert.equal(table.search(0, 1, 'o', 37, true, 1, partial), -1)
  assert.equal(table.search(0, 3, true, 64, true, 1, partial), 0)
  assert.equal(table.search(0, 3, 1, 65, true, 1, partial), 1)
  assert.equal(table.search(0, 0, 2, 6, true, 2, partial), 2)
  assert.equal(table.search(0, 0, 1, 9, true, 1, partial), 0)
  assert.equal(table.search(0, 4, 641_000, 96, true, 1, partial), 0)
  assert.deepEqual(partial, [[1, 'tokyo', 25, true, true]])
  assert.equal(table.search(0, 4, 650_000, 96, true, 1, partial), -1)
  assert.equal(table.search(0, 4, 650_000, 97, true, 1, partial), 0)
})

test('a search that is not one answers NaN: a bad row, a missing array, no condition, a count under one or an operator not for the column', () => {
  const table = cities()
  const into: unknown[] = []

  assert.ok(Number.isNaN(table.search('0', 1, 'x', 32, true, 1, into)))
  assert.ok(Number.isNaN(table.search(0, 1, 'x', 32, true, 1, 'not')))
  assert.ok(Number.isNaN(table.search(0, true, 1, into)))
  assert.ok(Number.isNaN(table.search(0, 1, 'x', 32, true, 0, into)))
  assert.ok(Number.isNaN(table.search(0, 1, 'x', 0, true, 1, into)))
  assert.ok(Number.isNaN(table.search(0, 0, 1, 32, true, 1, into)))
  assert.ok(Number.isNaN(table.search(0, 9, 1, 0, true, 1, into)))
  assert.ok(Number.isNaN(table.search(0, 1, 'x', 32, 9, true, 1, into)))
})

test('the table classes read the resources the runtime holds, and a resource that is not there gives an empty table', () => {
  const held = new Map<string, Uint8Array>([
    ['names.csv', new TextEncoder().encode('1,a\n2,b\n')],
    ['pairs.bin', Uint8Array.from([1, 2, 3, 4])],
    ['lines.bin', Uint8Array.from([2, 0x41, 0x42, 1, 0x43])],
  ])
  const { BinaryTable, CSVTable } = tableClassesOf((reference) => {
    const body = typeof reference === 'string' ? held.get(reference) : undefined

    return body ? { body, text: String(reference).endsWith('.csv') } : null
  })

  const csv = new CSVTable('names.csv', 'U:1B,S:1V')
  const binary = new BinaryTable('pairs.bin', '0,U:1B,U:1B')
  const lines = new BinaryTable('lines.bin', '1,S:1B')
  const missing = new CSVTable('gone.csv', 'U:1B')
  const malformed = new CSVTable('names.csv', 'nonsense')
  const unstructured = new BinaryTable('pairs.bin', 'nonsense')

  assert.equal(csv.nrow, 2)
  assert.equal(csv.toString(1, 1), 'b')
  assert.equal(binary.nrow, 2)
  assert.equal(binary.toNumber(1, 0), 3)
  assert.deepEqual(lines.toArray(0, lines.nrow), [['A'], ['C']])
  assert.equal(missing.nrow, 0)
  assert.equal(malformed.nrow, 0)
  assert.equal(malformed.ncolumn, 0)
  assert.equal(unstructured.nrow, 0)
  csv.close()
})
