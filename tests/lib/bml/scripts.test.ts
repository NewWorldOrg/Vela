import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Realm } from '@/lib/bml/realm'
import {
  DocumentLeft,
  SHADOWED_GLOBALS,
  ScriptScope,
  givenOf,
  scopeOf,
  withoutTableNew,
} from '@/lib/bml/scripts'

function run(code: string, scope: object): unknown {
  return new Function('scope', `with (scope) { return (${code}) }`)(scope)
}

test('a name the scope was given resolves to it, one the frame must not be reached by resolves to nothing, and the rest fall through', () => {
  const document = { getElementById: () => 'wrapped' }
  const scope = scopeOf({ document, browser: { ok: 1 } })

  assert.equal(run('document.getElementById("a")', scope), 'wrapped')
  assert.equal(run('browser.ok', scope), 1)
  assert.equal(run('typeof Math', scope), 'object')

  for (const name of SHADOWED_GLOBALS) {
    assert.equal(run(`typeof ${name}`, scope), 'undefined', name)
  }

  assert.equal(
    run('(document = 1, document.getElementById("a"))', scope),
    'wrapped',
  )
  assert.equal(run('(delete window, typeof window)', scope), 'undefined')
  assert.deepEqual(Object.keys(givenOf(scope)), ['document', 'browser'])
})

test('the scope does not say what it holds', () => {
  const scope = scopeOf({ browser: {} }) as Record<string, unknown>

  assert.equal(Object.keys(scope).length, 0)
  assert.equal(Object.getOwnPropertyDescriptor(scope, 'browser'), undefined)
  assert.equal(scope[Symbol.unscopables as unknown as string], undefined)
})

test('a run is done, left when the document was left, or failed with what was thrown, each timed', () => {
  let now = 0
  const scope = new ScriptScope(
    (code) => {
      now += 5

      if (code === 'leave') {
        throw new DocumentLeft()
      }

      if (code === 'fail') {
        throw new TypeError('x is not a function')
      }
    },
    {},
    () => now,
  )

  assert.deepEqual(scope.run('ok'), { outcome: 'done', tookMs: 5 })
  assert.deepEqual(scope.run('leave'), { outcome: 'left', tookMs: 5 })

  const failed = scope.run('fail')

  assert.equal(failed.outcome, 'failed')
  assert.equal(failed.tookMs, 5)
  assert.ok(failed.outcome === 'failed' && failed.error instanceof TypeError)
})

test('new is taken off the table constructors, so that a table that cannot be made may be null', () => {
  assert.equal(
    withoutTableNew(
      'var a = new BinaryTable("t.btb", "0,U:1B"); var b = new  CSVTable ("t.csv", "U:1B"); var c = new Date();',
    ),
    'var a = BinaryTable("t.btb", "0,U:1B"); var b = CSVTable("t.csv", "U:1B"); var c = new Date();',
  )
})

test('a run divides in integers, as a receiver does', () => {
  const placed: { top?: string } = {}
  const scope = new ScriptScope(
    (code, given) =>
      new Function('scope', `with (scope) { ${code} }`)(given) as void,
    scopeOf({ placed }),
    () => 0,
  )

  scope.run('var foc = 1; placed.top = 28 * (foc / 2) + 90 + "px"')
  assert.equal(placed.top, '90px')
})

test('a run divides in integers even after a document has written over the built-ins the rewrite uses', (t) => {
  const names = ['flatMap', 'filter', 'sort', 'includes'] as const
  const held = names.map((name) => ({
    name,
    descriptor: Object.getOwnPropertyDescriptor(Array.prototype, name),
  }))

  t.after(() => {
    held.forEach(({ name, descriptor }) => {
      if (descriptor) {
        Object.defineProperty(Array.prototype, name, descriptor)
      }
    })
  })

  const placed: { top?: string } = {}
  const scope = new ScriptScope(
    (code, given) =>
      new Function('scope', `with (scope) { ${code} }`)(given) as void,
    scopeOf({ placed }),
    () => 0,
    new Realm([Array.prototype]),
  )
  const broken = names
    .map(
      (name) =>
        `Array.prototype.${name} = function () { throw new Error("theirs") };`,
    )
    .join('\n')

  assert.equal(scope.run(broken).outcome, 'done')
  assert.equal(
    scope.run('var foc = 1; placed.top = 28 * (foc / 2) + 90 + "px"').outcome,
    'done',
  )
  assert.equal(placed.top, '90px')
})

test("a run puts the document's writes on the built-ins in place only while its code runs", () => {
  const target: { trim?: string } = {}
  const realm = new Realm([target])
  const seen: string[] = []
  const scope = new ScriptScope(
    (code) => {
      if (code === 'write') {
        target.trim = 'theirs'
      }

      seen.push(`${code}:${String(target.trim)}`)
    },
    {},
    () => 0,
    realm,
  )

  scope.run('write')
  assert.equal(target.trim, undefined)
  scope.run('read')
  assert.equal(target.trim, undefined)
  assert.deepEqual(seen, ['write:theirs', 'read:theirs'])
})
