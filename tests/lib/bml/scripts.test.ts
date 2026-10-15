import assert from 'node:assert/strict'
import { test } from 'node:test'
import vm from 'node:vm'

import { Realm } from '@/lib/bml/realm'
import {
  DocumentLeft,
  SHADOWED_GLOBALS,
  ScriptScope,
  globalBindingsOf,
  hidingOn,
  scopeOf,
  withoutTableNew,
} from '@/lib/bml/scripts'

function run(code: string, scope: object): unknown {
  return new Function('scope', `with (scope) { return (${code}) }`)(scope)
}

/** Runs a document's code with its scope over a frame whose own globals are the names it holds, as the frame's window lies beyond the scope. */
function runIn(frame: object, scope: object, code: string): unknown {
  return new Function(
    'frame',
    'scope',
    `with (frame) { with (scope) { ${code} } }`,
  )(frame, scope)
}

const THE_FRAMES_OWN = 'the frame’s own'

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
})

test('the scope does not say what it holds', () => {
  const scope = scopeOf({ browser: {} }) as Record<string, unknown>

  run('history = []', scope)

  assert.equal(Object.keys(scope).length, 0)
  assert.equal(Object.getOwnPropertyDescriptor(scope, 'browser'), undefined)
  assert.equal(Object.getOwnPropertyDescriptor(scope, 'history'), undefined)
  assert.equal(scope[Symbol.unscopables as unknown as string], undefined)
})

test('a name the scope hides is the document’s own once it writes it: its next scripts and handlers read what it wrote, never the frame’s own, and the next document starts without it', () => {
  const frame = { history: THE_FRAMES_OWN, fetch: THE_FRAMES_OWN }
  const scope = scopeOf({ browser: {} })

  assert.equal(runIn(frame, scope, 'return typeof history'), 'undefined')

  runIn(frame, scope, 'var history = new Array(); history.push("top");')
  runIn(frame, scope, 'history.push("road");')

  assert.deepEqual(
    runIn(
      frame,
      scope,
      'return [history.length, history[0], history[1], typeof fetch]',
    ),
    [2, 'top', 'road', 'undefined'],
  )
  assert.equal(
    runIn(frame, scopeOf({ browser: {} }), 'return typeof history'),
    'undefined',
  )
})

test('typeof, delete and an assignment of undefined act on what the document wrote by a hidden name, which never gives way to the frame’s own', () => {
  const frame = { history: THE_FRAMES_OWN }
  const scope = scopeOf({})

  assert.deepEqual(
    runIn(
      frame,
      scope,
      'history = []; var seen = [typeof history];' +
        'seen.push(delete history, typeof history, history === undefined);' +
        'history = 1; history = undefined;' +
        'seen.push(typeof history, history === undefined);' +
        'return seen',
    ),
    ['object', true, 'undefined', true, 'undefined', true],
  )
})

/** A global object that holds the names a scope hides as a browser's window does: history behind a getter alone, open as a value that may be written over, and top unconfigurable. */
function windowLike() {
  const context = vm.createContext({})
  const global = vm.runInContext('this', context) as Record<string, unknown>
  const history = { framesOwn: 'history' }
  const open = { framesOwn: 'open' }
  const top = { framesOwn: 'top' }

  Object.defineProperty(global, 'history', {
    get: () => history,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(global, 'open', {
    value: open,
    writable: true,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(global, 'top', {
    get: () => top,
    enumerable: true,
    configurable: false,
  })

  return { context, global, history, open, top }
}

test('a function a document declares by a hidden name is its own and its next scripts call it, as the write its declaration makes on the global object past the scope is kept in the scope while its code runs, and the global object holds what it held after', () => {
  const { context, global, history, open } = windowLike()
  const described = ['history', 'open'].map((name) =>
    Object.getOwnPropertyDescriptor(global, name),
  )
  const placed: { seen?: unknown } = {}
  const scope = scopeOf({ placed })
  const hiding = hidingOn(global)
  const evaluate = (code: string) =>
    hiding(scope, () => vm.runInContext(`with (scope) {\n${code}\n}`, context))

  context.scope = scope

  evaluate(
    'function history() { return "back" }\nfunction open() { return "opened" }',
  )
  evaluate('placed.seen = [history(), open()].join(",")')

  assert.equal(placed.seen, 'back,opened')
  assert.equal(global.history, history)
  assert.equal(global.open, open)
  assert.deepEqual(
    ['history', 'open'].map((name) =>
      Object.getOwnPropertyDescriptor(global, name),
    ),
    described,
  )
})

test('a function declared by a name the global object holds unconfigurable, as a window holds window and top, cannot be kept in the scope: its write goes to the global object, which drops it, and the next script finds nothing by that name', () => {
  const { context, global, top } = windowLike()
  const placed: { seen?: unknown } = {}
  const scope = scopeOf({ placed })
  const hiding = hidingOn(global)
  const evaluate = (code: string) =>
    hiding(scope, () => vm.runInContext(`with (scope) {\n${code}\n}`, context))

  context.scope = scope

  evaluate('function top() { return "mine" }')
  evaluate('placed.seen = typeof top')

  assert.equal(placed.seen, 'undefined')
  assert.equal(global.top, top)
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

test('the document’s globals taken before a run and put back after it give the names its scope hides as they were as well: one first written since reads nothing and one rewritten has its value back', () => {
  const placed: { seen?: unknown } = {}
  const scope = new ScriptScope(
    (code, given) =>
      new Function('scope', `with (scope) { ${code} }`)(given) as void,
    scopeOf({ placed }),
    () => 0,
  )

  scope.run('var stop = false; var history = ["top"];')

  const taken = scope.bindings()

  scope.run('stop = true; history = []; open = 1;')
  scope.putBack(taken)
  scope.run('placed.seen = [stop, history.length, typeof open].join(",")')

  assert.equal(placed.seen, 'false,1,undefined')
})

test('the bindings of a global object are the names declared on it since, taken as they stand and put back as they were, one declared after they were taken left with nothing', () => {
  const global: Record<string, unknown> = { builtIn: 1, aside: 'x' }
  const bindings = globalBindingsOf(global, ['aside'])

  global.ready = true
  global.list = [1]
  Object.defineProperty(global, 'fixed', { value: 1, writable: false })

  const taken = bindings.take()

  assert.deepEqual([...taken.keys()], ['ready', 'list', 'fixed'])

  global.ready = false
  global.builtIn = 2
  global.aside = 'y'
  global.later = 'set'
  bindings.put(taken)

  assert.equal(global.ready, true)
  assert.deepEqual(global.list, [1])
  assert.equal(global.builtIn, 2)
  assert.equal(global.aside, 'y')
  assert.equal(global.later, undefined)
  assert.equal(global.fixed, 1)
})
