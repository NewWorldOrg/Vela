import assert from 'node:assert/strict'
import { test } from 'node:test'

import { RelayGuard } from '@/lib/hybridcast/relay-guard'

type Port = { name: string }

const port = (name: string): Port => ({ name })

test('a document that says hello and, asked at its load, says it loaded keeps the frame', () => {
  const guard = new RelayGuard<Port>()
  const first = port('first')

  assert.deepEqual(guard.hello(first), { ask: false })

  const load = guard.load()

  assert.deepEqual(load, { nth: 1, ask: first })
  guard.loaded(first)
  assert.deepEqual(guard.verdict(1), 'kept')
})

test('a load with no hello of its own, or whose document did not answer, loses the frame; unopened while none ever kept it', () => {
  const silent = new RelayGuard<Port>()

  assert.deepEqual(silent.load(), { nth: 1, ask: null })
  assert.equal(silent.verdict(1), 'unopened')

  const gone = new RelayGuard<Port>()
  const first = port('first')

  gone.hello(first)
  gone.load()
  gone.loaded(first)
  assert.equal(gone.verdict(1), 'kept')
  assert.deepEqual(gone.load(), { nth: 2, ask: null })
  assert.equal(gone.verdict(2), 'lost')
})

test('a document that leaves before its load gives the load to the next one, whose hello is the one asked', () => {
  const guard = new RelayGuard<Port>()
  const entry = port('entry')
  const next = port('next')

  guard.hello(entry)
  guard.hello(next)

  assert.deepEqual(guard.load(), { nth: 1, ask: next })
  guard.loaded(entry)
  assert.equal(guard.verdict(1), 'unopened')

  const kept = new RelayGuard<Port>()

  kept.hello(entry)
  kept.hello(next)
  kept.load()
  kept.loaded(next)
  assert.equal(kept.verdict(1), 'kept')
})

test('a second hello a document says before its own load, then leaving the relay, covers nothing', () => {
  const guard = new RelayGuard<Port>()
  const entry = port('entry')
  const faked = port('faked')

  guard.hello(entry)
  guard.hello(faked)
  guard.loaded(faked)
  guard.load()

  assert.equal(guard.verdict(1), 'unopened')
})

test('a document that says it loaded many times, unasked, does not cover the loads after it', () => {
  const guard = new RelayGuard<Port>()
  const first = port('first')

  guard.hello(first)

  for (let said = 0; said < 5; said += 1) {
    guard.loaded(first)
  }

  guard.load()
  guard.loaded(first)
  assert.equal(guard.verdict(1), 'kept')

  for (let escape = 2; escape <= 4; escape += 1) {
    for (let said = 0; said < 5; said += 1) {
      guard.loaded(first)
    }

    guard.load()
    assert.equal(guard.verdict(escape), 'lost')
  }
})

test('a hello said ahead of a load by the document before it covers that load only if the port answers there, which a document gone from the frame cannot', () => {
  const guard = new RelayGuard<Port>()
  const first = port('first')
  const ahead = port('ahead')

  guard.hello(first)
  guard.load()
  guard.loaded(first)
  assert.equal(guard.verdict(1), 'kept')

  assert.deepEqual(guard.hello(ahead), { ask: false })
  guard.loaded(ahead)
  assert.deepEqual(guard.load(), { nth: 2, ask: ahead })
  assert.equal(guard.verdict(2), 'lost')
})

test('only the port of the load asked answers for it', () => {
  const guard = new RelayGuard<Port>()
  const first = port('first')

  guard.hello(first)
  guard.load()
  guard.loaded(port('other'))
  assert.equal(guard.verdict(1), 'unopened')
})

test('a hello that arrives after its own load is taken for that load and asked at once', () => {
  const guard = new RelayGuard<Port>()
  const first = port('first')
  const second = port('second')

  guard.hello(first)
  guard.load()
  guard.loaded(first)
  assert.equal(guard.verdict(1), 'kept')

  assert.deepEqual(guard.load(), { nth: 2, ask: null })
  assert.deepEqual(guard.hello(second), { ask: true })
  guard.loaded(second)
  assert.equal(guard.verdict(2), 'kept')
})

test('the guard says whether a load it gave up had a hello of its own, so the player can say why it closed', () => {
  const guard = new RelayGuard<Port>()
  const first = port('first')

  guard.hello(first)
  guard.load()
  guard.loaded(first)
  guard.verdict(1)

  guard.load()
  assert.equal(guard.hadHello(2), false)
  assert.equal(guard.verdict(2), 'lost')

  const silent = new RelayGuard<Port>()

  silent.hello(port('quiet'))
  silent.load()
  assert.equal(silent.hadHello(1), true)
  assert.equal(silent.verdict(1), 'unopened')
})
