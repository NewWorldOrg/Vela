import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  modulePayload,
  moduleOf,
  moduleToHand,
  readModule,
  type BmlModule,
} from '@/lib/bml/resources'

const text = (value: string) => new TextEncoder().encode(value)

const MODULE: BmlModule = {
  tag: 0x40,
  id: 0x0001,
  version: 3,
  resources: [
    { path: 'startup.bml', kind: 'bml', body: text('<bml/>') },
    { path: 'a.png', kind: 'png', body: new Uint8Array([1, 2, 3]) },
    { path: 'empty.bin', kind: 'binary', body: new Uint8Array() },
  ],
}

test('a module is its kind byte, tag, id and version, then each resource with its path, kind and body', () => {
  const payload = modulePayload({
    tag: 0x40,
    id: 0x0102,
    version: 7,
    resources: [{ path: 'a', kind: 'css', body: new Uint8Array([9]) }],
  })

  assert.deepEqual(
    [...payload],
    [0x02, 0x40, 0x01, 0x02, 7, 0, 1, 0x61, 2, 0, 0, 0, 1, 9],
  )
})

test('a module reads back as it was written', () => {
  assert.deepEqual(readModule(modulePayload(MODULE)), MODULE)
})

test('every kind of resource reads back under its own name', () => {
  const kinds = [
    'bml',
    'css',
    'script',
    'jpeg',
    'png',
    'binary',
    'undecoded',
  ] as const

  kinds.forEach((kind, index) => {
    const read = readModule(
      modulePayload({
        tag: 0x40,
        id: 0,
        version: 0,
        resources: [{ path: 'x', kind, body: new Uint8Array() }],
      }),
    )

    assert.equal(read?.resources[0].kind, kind)
    assert.equal(modulePayload(read!)[5 + 2 + 1], index + 1)
  })
})

test('a module with no resources is still a module', () => {
  assert.deepEqual(readModule(new Uint8Array([0x02, 0x40, 0, 0, 1])), {
    tag: 0x40,
    id: 0,
    version: 1,
    resources: [],
  })
})

test('a payload that is not a module, or is cut short anywhere, is not read', () => {
  const whole = modulePayload(MODULE)

  assert.equal(readModule(new Uint8Array([0x01, 0x40, 0, 0, 1])), null)
  assert.equal(readModule(new Uint8Array([0x02, 0x40, 0, 0])), null)

  for (let length = 6; length < whole.length; length += 1) {
    const cut = whole.subarray(0, length)
    const read = readModule(cut)

    assert.ok(
      read === null || read.resources.length < MODULE.resources.length,
      `cut at ${length}`,
    )
  }
})

test('a resource with no path, an unknown kind, a body past the end or a path that is not UTF-8 spoils the module', () => {
  const head = [0x02, 0x40, 0, 0, 1]

  assert.equal(readModule(new Uint8Array([...head, 0, 0, 1, 0, 0, 0, 0])), null)
  assert.equal(
    readModule(new Uint8Array([...head, 0, 1, 0x61, 8, 0, 0, 0, 0])),
    null,
  )
  assert.equal(
    readModule(new Uint8Array([...head, 0, 1, 0x61, 1, 0, 0, 0, 9, 1])),
    null,
  )
  assert.equal(
    readModule(new Uint8Array([...head, 0, 1, 0xff, 1, 0, 0, 0, 0])),
    null,
  )
})

test('a module handed over in a message keeps its shape, and anything else is not one', () => {
  assert.deepEqual(moduleOf(MODULE), MODULE)
  assert.equal(moduleOf(null), null)
  assert.equal(moduleOf({ ...MODULE, tag: 256 }), null)
  assert.equal(moduleOf({ ...MODULE, id: -1 }), null)
  assert.equal(moduleOf({ ...MODULE, version: 1.5 }), null)
  assert.equal(
    moduleOf({
      ...MODULE,
      resources: [{ path: 'a', kind: 'html', body: new Uint8Array() }],
    }),
    null,
  )
  assert.equal(
    moduleOf({ ...MODULE, resources: [{ path: 'a', kind: 'bml', body: [1] }] }),
    null,
  )
  assert.equal(
    moduleOf({
      ...MODULE,
      resources: [{ path: '', kind: 'bml', body: new Uint8Array() }],
    }),
    null,
  )
})

test('a module handed to the frame is a copy whose bodies each own the buffer handed over, and what is held is left whole', () => {
  const payload = modulePayload(MODULE)
  const held = readModule(payload) as BmlModule
  const handed = moduleToHand(held)

  assert.deepEqual(handed.module, held)
  assert.equal(handed.transfer.length, held.resources.length)
  handed.module.resources.forEach((resource, index) => {
    assert.equal(resource.body.buffer, handed.transfer[index])
    assert.equal(resource.body.byteOffset, 0)
    assert.equal(resource.body.buffer.byteLength, resource.body.length)
  })

  structuredClone(handed.module, { transfer: handed.transfer })

  assert.equal(handed.transfer[0].byteLength, 0)
  assert.deepEqual(held, readModule(payload))
})
