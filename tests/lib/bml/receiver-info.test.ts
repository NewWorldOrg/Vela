import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PersistentMemory } from '@/lib/bml/memory'
import {
  NO_RESIDENCE,
  REGION_CODES,
  readPersistent,
  residenceOf,
  writePersistent,
  type Residence,
} from '@/lib/bml/receiver-info'

const ZIPCODE = 'nvram://receiverinfo/zipcode'

const PREFECTURE = 'nvram://receiverinfo/prefecture'

const REGION_CODE = 'nvram://receiverinfo/regioncode'

const REGISTERED: Residence = { postalCode: '0000000', prefecture: 13 }

test('the receiver answers the three names of TR-B14 table 5-2 from the residence registered, each in the field type the table gives it', () => {
  const memory = new PersistentMemory()

  assert.deepEqual(readPersistent(memory, REGISTERED, ZIPCODE, 'S:7B'), [
    '0000000',
  ])
  assert.deepEqual(readPersistent(memory, REGISTERED, PREFECTURE, 'U:1B'), [13])
  assert.deepEqual(
    readPersistent(memory, REGISTERED, REGION_CODE, 'U:2B'),
    [0xaac],
  )
})

test('what is not registered reads as the table says: an empty postal code, prefecture 255 and region code 0', () => {
  const memory = new PersistentMemory()

  assert.deepEqual(readPersistent(memory, NO_RESIDENCE, ZIPCODE, 'S:7B'), [''])
  assert.deepEqual(
    readPersistent(memory, NO_RESIDENCE, PREFECTURE, 'U:1B'),
    [255],
  )
  assert.deepEqual(
    readPersistent(memory, NO_RESIDENCE, REGION_CODE, 'U:2B'),
    [0],
  )
  assert.deepEqual(
    readPersistent(
      memory,
      { postalCode: '0000000', prefecture: null },
      REGION_CODE,
      'U:2B',
    ),
    [0],
  )
})

test('a postal code read as a number is the number its digits write, as the documents read it', () => {
  const read = readPersistent(
    new PersistentMemory(),
    { postalCode: '0000012', prefecture: null },
    ZIPCODE,
    'S:7B',
  )

  assert.equal(Number(read), 12)
})

test('a name of the receiver it does not have, or a structure it cannot read, reads as nothing', () => {
  const memory = new PersistentMemory()

  assert.equal(
    readPersistent(memory, REGISTERED, 'nvram://receiverinfo/address', 'S:7B'),
    null,
  )
  assert.equal(
    readPersistent(memory, REGISTERED, 'nvram://receiverinfo/', 'S:7B'),
    null,
  )
  assert.equal(readPersistent(memory, REGISTERED, ZIPCODE, 'Q:7B'), null)
})

test('a document never writes the residence, and the broadcaster’s memory keeps nothing under its names', () => {
  const memory = new PersistentMemory()

  assert.equal(writePersistent(memory, ZIPCODE, 'S:7B', ['0000001']), null)
  assert.equal(writePersistent(memory, PREFECTURE, 'U:1B', [0]), null)
  assert.equal(writePersistent(memory, REGION_CODE, 'U:2B', [1]), null)
  assert.equal(memory.has(ZIPCODE), false)
  assert.deepEqual(readPersistent(memory, NO_RESIDENCE, ZIPCODE, 'S:7B'), [''])
})

test('every other name is the broadcaster’s memory, read and written as before', () => {
  const memory = new PersistentMemory()

  assert.equal(writePersistent(memory, 'nvram://local/0', 'U:1B', [7]), 1)
  assert.deepEqual(
    readPersistent(memory, REGISTERED, 'nvram://local/0', 'U:1B'),
    [7],
  )
})

test('the region codes are the prefecture codes of STD-B10 table D-2: twelve bits with six of them set, one for each prefecture, shared only where a prefecture is split', () => {
  const ones = (code: number) => code.toString(2).replaceAll('0', '').length
  const shared = [
    [0, 1],
    [13, 48],
    [46, 49],
  ]

  assert.equal(REGION_CODES.length, 50)
  assert.ok(REGION_CODES.every((code) => code < 0x1000 && ones(code) === 6))
  assert.equal(new Set(REGION_CODES).size, 47)
  shared.forEach(([one, other]) => {
    assert.equal(REGION_CODES[one], REGION_CODES[other])
  })
})

test('a residence handed over is taken only in the shape it has: seven digits and a prefecture from 0 to 49, either of them null', () => {
  assert.deepEqual(residenceOf(REGISTERED), REGISTERED)
  assert.deepEqual(residenceOf(NO_RESIDENCE), NO_RESIDENCE)
  assert.deepEqual(residenceOf({ postalCode: null, prefecture: 49 }), {
    postalCode: null,
    prefecture: 49,
  })

  for (const handed of [
    null,
    'somewhere',
    {},
    { postalCode: '000000', prefecture: null },
    { postalCode: '000-0000', prefecture: null },
    { postalCode: 1234567, prefecture: null },
    { postalCode: null, prefecture: 50 },
    { postalCode: null, prefecture: 1.5 },
    { postalCode: null, prefecture: '13' },
    { postalCode: null },
  ]) {
    assert.equal(residenceOf(handed), null)
  }
})
