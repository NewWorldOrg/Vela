import assert from 'node:assert/strict'
import { test } from 'node:test'

import { builtinsOf, Realm } from '@/lib/bml/realm'

test('what a document writes on a built-in is in place while it runs and off again after, nested entries included', () => {
  const pristine = (): string => 'pristine'
  const target: { trim: () => string; extra?: number } = { trim: pristine }
  const realm = new Realm([target])
  const theirs = (): string => 'theirs'

  realm.enter()
  target.trim = theirs
  target.extra = 1
  realm.leave()

  assert.equal(target.trim, pristine)
  assert.equal('extra' in target, false)

  realm.enter()
  assert.equal(target.trim, theirs)
  assert.equal(target.extra, 1)
  realm.enter()
  delete (target as { extra?: number }).extra
  realm.leave()
  assert.equal(target.trim, theirs)
  realm.leave()

  assert.equal(target.trim, pristine)
  realm.enter()
  assert.equal(target.trim, theirs)
  assert.equal('extra' in target, false)
  realm.leave()
})

test('a built-in a document put back as it was is not carried over', () => {
  const target = { trim: (): string => '' }
  const kept = target.trim
  const realm = new Realm([target])

  realm.enter()
  target.trim = (): string => 'x'
  target.trim = kept
  realm.leave()
  realm.enter()
  assert.equal(target.trim, kept)
  realm.leave()
})

test('the built-ins of a window are its constructors, their prototypes, Math and JSON', () => {
  const window = { String, Array, Math, JSON, Other: 1 }
  const builtins = builtinsOf(window)

  assert.deepEqual(builtins, [
    Array,
    String,
    Array.prototype,
    String.prototype,
    Math,
    JSON,
  ])
})
