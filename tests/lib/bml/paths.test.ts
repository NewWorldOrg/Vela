import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  OVER_THE_LINE,
  addressOf,
  lineAddressOf,
  locationOf,
  pathOf,
  resolveReference,
} from '@/lib/bml/paths'

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

test('another service and anything unreadable lead nowhere', () => {
  assert.equal(resolveReference('arib-dc://1.2.3/40/0001/x.bml', BASE), null)
  assert.equal(resolveReference('javascript:alert(1)', BASE), null)
  assert.equal(resolveReference('a/b.png', BASE), null)
  assert.equal(resolveReference('', BASE), null)
})

const OVER = lineAddressOf('http://example.test/bml/top/startup.bml?x=1#a')

test('a URL over the line is an address with no carousel, without its fragment and with its query', () => {
  assert.deepEqual(OVER, {
    tag: OVER_THE_LINE,
    module: OVER_THE_LINE,
    name: 'startup.bml',
    url: 'http://example.test/bml/top/startup.bml?x=1',
  })
  assert.equal(pathOf(OVER!), 'http://example.test/bml/top/startup.bml?x=1')
  assert.equal(lineAddressOf('ftp://example.test/a'), null)
  assert.equal(lineAddressOf('javascript:alert(1)'), null)
  assert.equal(lineAddressOf('startup.bml'), null)
  assert.equal(lineAddressOf(`http://example.test/${'a'.repeat(2048)}`), null)
})

test('a document of the broadcast reaches a URL over the line by naming it in full', () => {
  assert.deepEqual(resolveReference('https://example.test/a.bml', BASE), {
    tag: OVER_THE_LINE,
    module: OVER_THE_LINE,
    name: 'a.bml',
    url: 'https://example.test/a.bml',
  })
})

test('a reference in a document over the line is read against its URL, and one into the broadcast is read as before', () => {
  const resolved = (reference: string) =>
    resolveReference(reference, OVER!)?.url ?? null

  assert.equal(resolved('next.bml'), 'http://example.test/bml/top/next.bml')
  assert.equal(resolved('../img/a.png'), 'http://example.test/bml/img/a.png')
  assert.equal(resolved('/x.css'), 'http://example.test/x.css')
  assert.equal(resolved('https://other.test/y.bml'), 'https://other.test/y.bml')
  assert.equal(resolved('javascript:alert(1)'), null)
  assert.deepEqual(
    resolveReference('arib-dc://-1.-1.-1/40/0001/x.bml', OVER!),
    { tag: 0x40, module: 1, name: 'x.bml' },
  )
})

test('a path a page was given is a path in the carousel or a URL over the line', () => {
  assert.deepEqual(locationOf('/40/0000/startup.bml'), {
    tag: 0x40,
    module: 0,
    name: 'startup.bml',
  })
  assert.equal(
    locationOf('http://example.test/a.bml')?.url,
    'http://example.test/a.bml',
  )
  assert.equal(addressOf('http://example.test/a.bml'), null)
  assert.equal(locationOf('a.bml'), null)
})
