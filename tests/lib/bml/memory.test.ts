import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  MOST_MEMORY_BYTES,
  PersistentMemory,
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

  keepMemory(storage, 1024, 'visits', '3')
  keepMemory(storage, 1024, 'name', 'x')
  keepMemory(storage, 1025, 'visits', '9')
  storage.setItem('vela-theme', 'dark')

  assert.equal(memoryKey(1024, 'visits'), 'bml:1024:visits')
  assert.deepEqual(memoryEntriesOf(storage, 1024), [
    ['visits', '3'],
    ['name', 'x'],
  ])
  assert.deepEqual(memoryEntriesOf(storage, 1025), [['visits', '9']])
  assert.deepEqual(memoryEntriesOf(storage, 1026), [])

  keepMemory(storage, 1024, 'visits', null)
  assert.deepEqual(memoryEntriesOf(storage, 1024), [['name', 'x']])

  storage.refuses = true
  keepMemory(storage, 1024, 'more', 'y')
  assert.deepEqual(memoryEntriesOf(storage, 1024), [['name', 'x']])
})

test('the runtime’s copy writes within the limit, tells of each write, and refuses what would go past it', () => {
  const written: [string, string | null][] = []
  const memory = new PersistentMemory((name, value) =>
    written.push([name, value]),
  )
  const half = 'x'.repeat(MOST_MEMORY_BYTES / 2 - 8)

  assert.equal(memory.write('a', half), true)
  assert.equal(memory.write('b', half), true)
  assert.equal(memory.write('c', 'xxxxxxxxxxxxxxxxxx'), false)
  assert.equal(memory.read('c'), undefined)
  assert.equal(memory.write('a', 'short'), true)
  assert.equal(memory.write('c', 'fits now'), true)
  assert.equal(memory.write('', 'x'), false)
  assert.equal(memory.write('n'.repeat(257), 'x'), false)
  assert.deepEqual(
    written.map(([name]) => name),
    ['a', 'b', 'a', 'c'],
  )
  assert.equal(memory.bytes, 1 + half.length + 1 + 5 + 1 + 8)
})

test('what the player hands is taken whole, within the limit, and is read back by name', () => {
  const memory = new PersistentMemory()
  const big = 'x'.repeat(MOST_MEMORY_BYTES)

  memory.take([
    ['a', '1'],
    ['b', big],
    ['c', '3'],
  ])

  assert.equal(memory.read('a'), '1')
  assert.equal(memory.read('b'), undefined)
  assert.equal(memory.read('c'), '3')
})

test('an array is written with its structure and read back only with the same structure and fitting data', () => {
  const memory = new PersistentMemory()

  assert.equal(writeArray(memory, 'visits', 'U:8B', [3]), true)
  assert.deepEqual(readArray(memory, 'visits', 'U:8B'), [3])
  assert.equal(readArray(memory, 'visits', 'U:16B'), null)
  assert.equal(readArray(memory, 'other', 'U:8B'), null)
  assert.equal(writeArray(memory, 'visits', 'U:8B', ['3']), false)
  assert.equal(writeArray(memory, 'visits', 'U:8B', [1, 2]), false)
  assert.equal(writeArray(memory, 'visits', 'nonsense', [1]), false)
  assert.equal(writeArray(memory, 'pair', 'U:8B,P:8B,S:16V', [1, 'x']), true)
  assert.deepEqual(readArray(memory, 'pair', 'U:8B,P:8B,S:16V'), [1, 'x'])
  assert.equal(writeArray(memory, 7, 'U:8B', [1]), false)
  assert.equal(readArray(memory, 'visits', 7), null)
})
