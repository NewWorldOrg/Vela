import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  AREA_BYTES,
  MOST_MEMORY_BYTES,
  PersistentMemory,
  blockOfText,
  blockToText,
  fitsTheBroadcaster,
  keepMemory,
  memoryEntriesOf,
  memoryKey,
  readArray,
  writeArray,
  type MemoryStorage,
} from '@/lib/bml/memory'

class FakeStorage implements MemoryStorage {
  private readonly kept = new Map<string, string>()

  refuses = false

  get length(): number {
    return this.kept.size
  }

  key(index: number): string | null {
    return [...this.kept.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.kept.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    if (this.refuses) {
      throw new Error('QuotaExceededError')
    }

    this.kept.set(key, value)
  }

  removeItem(key: string): void {
    this.kept.delete(key)
  }
}

test('a broadcaster’s memory is kept under its own key, and another broadcaster reads none of it', () => {
  const storage = new FakeStorage()

  keepMemory(storage, 1024, 'visits', 'Aw==')
  keepMemory(storage, 1024, 'name', 'eA==')
  keepMemory(storage, 1025, 'visits', 'CQ==')
  storage.setItem('vela-theme', 'dark')

  assert.equal(memoryKey(1024, 'visits'), 'bml:1024:visits')
  assert.deepEqual(memoryEntriesOf(storage, 1024), [
    ['visits', 'Aw=='],
    ['name', 'eA=='],
  ])
  assert.deepEqual(memoryEntriesOf(storage, 1025), [['visits', 'CQ==']])
  assert.deepEqual(memoryEntriesOf(storage, 1026), [])

  keepMemory(storage, 1024, 'visits', null)
  assert.deepEqual(memoryEntriesOf(storage, 1024), [['name', 'eA==']])

  storage.refuses = true
  keepMemory(storage, 1024, 'more', 'eQ==')
  assert.deepEqual(memoryEntriesOf(storage, 1024), [['name', 'eA==']])
})

test('a block is kept for a broadcaster only while all it keeps stays within the limit, and only a block is', () => {
  const storage = new FakeStorage()
  const block = blockToText(new Uint8Array(AREA_BYTES))
  const names = Math.floor(MOST_MEMORY_BYTES / (AREA_BYTES + 4))

  for (let index = 0; index < names; index += 1) {
    keepMemory(storage, 1024, String(index).padStart(4, '0'), block)
  }

  assert.equal(fitsTheBroadcaster(storage, 1024, '0000', block), true)
  assert.equal(fitsTheBroadcaster(storage, 1024, 'more', block), false)
  assert.equal(fitsTheBroadcaster(storage, 1025, 'more', block), true)
  assert.equal(fitsTheBroadcaster(storage, 1024, 'more', null), true)
  assert.equal(fitsTheBroadcaster(storage, 1025, 'more', 'not a block!'), false)
})

test('a block goes to the player as base64 and comes back as bytes, and text that is not a block is refused', () => {
  const block = Uint8Array.from([0, 1, 255])

  assert.equal(blockToText(block), 'AAH/')
  assert.deepEqual(blockOfText('AAH/'), block)
  assert.equal(blockOfText('not base64!'), null)
  assert.equal(blockOfText(blockToText(new Uint8Array(AREA_BYTES + 1))), null)
})

test('the runtime’s copy writes a block within its area and the limit, tells of each write, and refuses what would go past them', () => {
  const written: [string, string | null][] = []
  const memory = new PersistentMemory((name, value) =>
    written.push([name, value]),
  )
  const area = new Uint8Array(AREA_BYTES)
  const names = Math.floor(MOST_MEMORY_BYTES / (AREA_BYTES + 4))

  for (let index = 0; index < names; index += 1) {
    assert.equal(memory.write(`n${String(index).padStart(3, '0')}`, area), true)
  }

  assert.equal(memory.write('full', area), false)
  assert.equal(memory.has('full'), false)
  assert.equal(memory.write('n000', Uint8Array.from([1])), true)
  assert.deepEqual(memory.read('n000').slice(0, 2), Uint8Array.from([1, 0]))
  assert.equal(memory.read('n000').length, AREA_BYTES)
  assert.equal(memory.write('', area), false)
  assert.equal(memory.write('n'.repeat(257), area), false)
  assert.equal(memory.write('big', new Uint8Array(AREA_BYTES + 1)), false)
  assert.equal(written.length, names + 1)
  assert.deepEqual(written[names], ['n000', 'AQ=='])
  assert.equal(memory.bytes, names * 4 + (names - 1) * AREA_BYTES + 1)
})

test('what the player hands is taken whole, within the limit, and a name never written reads as zeros', () => {
  const memory = new PersistentMemory()

  memory.take([
    ['a', 'AQ=='],
    ['b', 'not a block!'],
    ['c', 'Aw=='],
  ])

  assert.deepEqual(memory.read('a').slice(0, 2), Uint8Array.from([1, 0]))
  assert.equal(memory.has('b'), false)
  assert.deepEqual(memory.read('b'), new Uint8Array(AREA_BYTES))
  assert.deepEqual(memory.read('c')[0], 3)
})

test('an array is written as its structure says and read back by any structure over the same bytes, zeros where nothing was written', () => {
  const memory = new PersistentMemory()

  assert.deepEqual(readArray(memory, 'visits', 'U:1B'), [0])
  assert.deepEqual(readArray(memory, 'zip', 'S:7B'), [''])
  assert.equal(writeArray(memory, 'visits', 'U:2B', [258]), true)
  assert.deepEqual(readArray(memory, 'visits', 'U:2B'), [258])
  assert.deepEqual(readArray(memory, 'visits', 'U:1B'), [1])
  assert.deepEqual(readArray(memory, 'visits', 'U:4b,U:4b,U:1B'), [0, 1, 2])
  assert.equal(
    writeArray(memory, 'mixed', 'U:1B,I:1B,B:1b,P:7b,S:1V,S:3B,U:12b', [
      7,
      -2,
      true,
      '東京',
      'abcdef',
      4095,
    ]),
    true,
  )
  assert.deepEqual(
    readArray(memory, 'mixed', 'U:1B,I:1B,B:1b,P:7b,S:1V,S:3B,U:12b'),
    [7, -2, true, '東京', 'abc', 4095],
  )
  assert.equal(writeArray(memory, 'visits', 'U:1B', ['3']), false)
  assert.equal(writeArray(memory, 'visits', 'U:1B', [1, 2]), false)
  assert.equal(writeArray(memory, 'visits', 'nonsense', [1]), false)
  assert.equal(writeArray(memory, 'wide', 'S:1V', ['x'.repeat(70)]), false)
  assert.equal(writeArray(memory, 7, 'U:1B', [1]), false)
  assert.equal(readArray(memory, 'visits', 7), null)
  assert.equal(readArray(memory, 'visits', 'U:8B'), null)
})
