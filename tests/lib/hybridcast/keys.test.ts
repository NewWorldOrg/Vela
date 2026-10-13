import assert from 'node:assert/strict'
import { test } from 'node:test'

import { BML_KEYS } from '@/lib/bml/keys'
import {
  APP_KEY_CODE,
  KEY_SET,
  KEY_SET_UNTIL_TOLD,
  keyGlobals,
  keySetOf,
  keysOfKeySet,
} from '@/lib/hybridcast/keys'

test('every key of the remote has a code of its own and a VK_ global', () => {
  const codes = BML_KEYS.map((key) => APP_KEY_CODE[key])
  const globals = new Map(keyGlobals())

  assert.equal(new Set(codes).size, BML_KEYS.length)
  assert.equal(globals.get('VK_ENTER'), 13)
  assert.equal(globals.get('VK_UP'), 38)
  assert.equal(globals.get('VK_RED'), 403)
  assert.equal(globals.get('VK_DBUTTON'), APP_KEY_CODE.d)
  assert.equal(globals.get('VK_0'), 48)
  assert.equal(globals.get('VK_9'), 57)
  assert.equal(globals.size, BML_KEYS.length)
})

test('a key set takes the keys of the groups it names, and d only with DBUTTON', () => {
  assert.deepEqual(keysOfKeySet(KEY_SET.RED | KEY_SET.BLUE), ['blue', 'red'])
  assert.deepEqual(keysOfKeySet(KEY_SET.NAVIGATION), [
    'up',
    'down',
    'left',
    'right',
    'enter',
    'back',
  ])
  assert.equal(keysOfKeySet(KEY_SET_UNTIL_TOLD).includes('d'), false)
  assert.equal(keysOfKeySet(KEY_SET_UNTIL_TOLD).length, BML_KEYS.length - 1)
  assert.deepEqual(keysOfKeySet(KEY_SET.DBUTTON), ['d'])
  assert.deepEqual(keysOfKeySet(KEY_SET.VCR), [])
  assert.deepEqual(keysOfKeySet(0), [])
})

test('a key set is read as a whole number and kept to the groups there are', () => {
  assert.equal(keySetOf(KEY_SET.RED | 0x4000), KEY_SET.RED)
  assert.equal(keySetOf(0xfc), 0x3c)
  assert.equal(keySetOf('1'), null)
  assert.equal(keySetOf(-1), null)
  assert.equal(keySetOf(1.5), null)
})
