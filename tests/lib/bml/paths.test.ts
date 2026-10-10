import assert from 'node:assert/strict'
import { test } from 'node:test'

import { addressOf, pathOf, resolveReference } from '@/lib/bml/paths'

const BASE = { tag: 0x40, module: 0x0002, name: 'startup.bml' }

test('an absolute path names the component tag, the module and the resource', () => {
  assert.deepEqual(addressOf('/40/0000/startup.bml'), {
    tag: 0x40,
    module: 0,
    name: 'startup.bml',
  })
  assert.deepEqual(addressOf('/4A/00fF/a.png'), {
    tag: 0x4a,
    module: 0xff,
    name: 'a.png',
  })
})

test('a path that is not absolute, or names no resource, has no address', () => {
  assert.equal(addressOf('startup.bml'), null)
  assert.equal(addressOf('/40/0000/'), null)
  assert.equal(addressOf('/400/0000/a'), null)
  assert.equal(addressOf('/40/000/a'), null)
  assert.equal(addressOf('/40/0000/a/b'), null)
})

test('an address is written back as a path in lower-case hexadecimal', () => {
  assert.equal(
    pathOf({ tag: 0x4a, module: 0xff, name: 'a.png' }),
    '/4a/00ff/a.png',
  )
})

test('a reference is read against the document it is in', () => {
  assert.deepEqual(resolveReference('/50/0001/x.bml', BASE), {
    tag: 0x50,
    module: 1,
    name: 'x.bml',
  })
  assert.deepEqual(resolveReference('~/0001/x.bml', BASE), {
    tag: 0x40,
    module: 1,
    name: 'x.bml',
  })
  assert.deepEqual(resolveReference('../0003/x.png', BASE), {
    tag: 0x40,
    module: 3,
    name: 'x.png',
  })
  assert.deepEqual(resolveReference('x.png', BASE), {
    tag: 0x40,
    module: 2,
    name: 'x.png',
  })
  assert.deepEqual(resolveReference('./x.png', BASE), {
    tag: 0x40,
    module: 2,
    name: 'x.png',
  })
})

test('the current service may be named in full, and a fragment is not part of the resource', () => {
  assert.deepEqual(
    resolveReference('arib-dc://-1.-1.-1/40/0001/x.bml#top', BASE),
    { tag: 0x40, module: 1, name: 'x.bml' },
  )
  assert.deepEqual(resolveReference('x.bml?a=1', BASE), {
    tag: 0x40,
    module: 2,
    name: 'x.bml',
  })
})

test('another service, the network and anything unreadable lead nowhere', () => {
  assert.equal(resolveReference('arib-dc://1.2.3/40/0001/x.bml', BASE), null)
  assert.equal(resolveReference('https://example.com/a.png', BASE), null)
  assert.equal(resolveReference('javascript:alert(1)', BASE), null)
  assert.equal(resolveReference('a/b.png', BASE), null)
  assert.equal(resolveReference('', BASE), null)
})
