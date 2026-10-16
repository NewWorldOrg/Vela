import assert from 'node:assert/strict'
import { test } from 'node:test'
import vm from 'node:vm'

import { Realm } from '@/lib/bml/realm'
import {
  DocumentLeft,
  MOST_STATE_OBJECTS,
  SHADOWED_GLOBALS,
  ScriptScope,
  globalBindingsOf,
  hidingOn,
  scopeOf,
  withoutTableNew,
  type Evaluate,
} from '@/lib/bml/scripts'
import { MOST_ROWS, Table } from '@/lib/bml/tables'

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

/** A document's runs as the frame makes them, over a window-like global: each through the scope's run, wrapped in `with` over the scope, with the names it hides laid over the global object while it runs. */
function runsOver(
  context: vm.Context,
  global: Record<string, unknown>,
  placed: object,
): ScriptScope {
  const scope = scopeOf({ placed })
  const hiding = hidingOn(global)

  context.scope = scope

  return new ScriptScope(
    (code) =>
      hiding(scope, () => {
        vm.runInContext(`with (scope) {\n${code}\n}`, context)
      }),
    scope,
    () => 0,
  )
}

test('a function a document declares by a hidden name is its own and its next scripts call it, as its declaration is kept in the scope, and the global object holds what it held after', () => {
  const { context, global, history, open } = windowLike()
  const described = ['history', 'open'].map((name) =>
    Object.getOwnPropertyDescriptor(global, name),
  )
  const placed: { seen?: unknown } = {}
  const runs = runsOver(context, global, placed)

  runs.run(
    'function history() { return "back" }\nfunction open() { return "opened" }',
  )
  runs.run('placed.seen = [history(), open()].join(",")')

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

test('a function declared by a name the global object holds unconfigurable, as a window holds window and top, is kept in the scope like any hidden name: its next scripts call it, and the global object holds its own as before', () => {
  const { context, global, top } = windowLike()
  const placed: { seen?: unknown } = {}
  const runs = runsOver(context, global, placed)

  runs.run('function top() { return "mine" }')
  runs.run('placed.seen = top()')

  assert.equal(placed.seen, 'mine')
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

/** A scope whose runs share one global object, as a document's scripts and handlers share the frame's, each wrapped in `with` over the scope as the frame runs it. */
function sharingAGlobal(placed: object) {
  const context = vm.createContext({})
  const given = scopeOf({ placed })

  context.scope = given

  return new ScriptScope(
    (code) => {
      vm.runInContext(`with (scope) {\n${code}\n}`, context)
    },
    given,
    () => 0,
  )
}

test('a function a later script declares by the same name takes the place of an earlier one for the functions the earlier script declared, as declarations in one global scope do', () => {
  const placed: { said?: string } = {}
  const scripts = sharingAGlobal(placed)

  scripts.run(
    'function locked() { ready() }\nfunction ready() { placed.said = "the first" }',
  )
  scripts.run('function ready() { placed.said = "the second" }')
  scripts.run('locked()')

  assert.equal(placed.said, 'the second')
})

test('a script calls the functions it declares before their place in it, the code either side of a declaration stays apart, and a function declared inside another stays that one’s own', () => {
  const placed: { said?: string; inner?: string; ran?: string } = {}
  const scripts = sharingAGlobal(placed)

  scripts.run(
    'var one = 1\nfunction between() {}\n(function () { placed.ran = "apart" })()',
  )
  assert.equal(placed.ran, 'apart')

  scripts.run(
    'placed.said = early();\nfunction early() { return "hoisted" }\nfunction outer() { function inner() { return "inner" } return inner() }',
  )
  scripts.run('placed.inner = outer() + "," + typeof inner')

  assert.equal(placed.said, 'hoisted')
  assert.equal(placed.inner, 'inner,undefined')
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

/** A global object holding history behind a getter and open as a value, whose defineProperty throws for open while it is told to refuse. */
function refusingOpen() {
  const target: Record<string, unknown> = {}
  const refusing = { now: false }

  Object.defineProperty(target, 'history', {
    get: () => THE_FRAMES_OWN,
    enumerable: true,
    configurable: true,
  })
  Object.defineProperty(target, 'open', {
    value: THE_FRAMES_OWN,
    writable: true,
    configurable: true,
  })

  const global = new Proxy(target, {
    defineProperty(held, name, described) {
      if (name === 'open' && refusing.now) {
        throw new TypeError('open cannot be redefined')
      }

      return Reflect.defineProperty(held, name, described)
    },
  })

  return { target, global, refusing }
}

function describedOf(target: object, but: string[] = []) {
  return Reflect.ownKeys(target)
    .filter((name) => !but.includes(String(name)))
    .map((name) => [name, Object.getOwnPropertyDescriptor(target, name)])
}

test('a name the global object will not have laid over fails the run before it starts, every name laid before it is put back, and the next run is hidden as before', () => {
  const { target, global, refusing } = refusingOpen()
  const before = describedOf(target)
  const scope = scopeOf({})
  const hiding = hidingOn(global)
  let ran = false

  refusing.now = true
  assert.throws(
    () =>
      hiding(scope, () => {
        ran = true
      }),
    /open cannot be redefined/,
  )
  assert.equal(ran, false)
  assert.deepEqual(describedOf(target), before)

  refusing.now = false
  hiding(scope, () => {
    global.history = 'kept'
  })

  assert.equal(run('history', scope), 'kept')
  assert.deepEqual(describedOf(target), before)
})

test('a name the global object will not have put back leaves every other put back, and fails a run that went well, while a run that failed fails with its own error', () => {
  const { target, global, refusing } = refusingOpen()
  const before = describedOf(target, ['open'])
  const hiding = hidingOn(global)

  assert.throws(
    () =>
      hiding(scopeOf({}), () => {
        refusing.now = true
      }),
    /open cannot be redefined/,
  )
  assert.deepEqual(describedOf(target, ['open']), before)

  refusing.now = false
  assert.throws(
    () =>
      hiding(scopeOf({}), () => {
        refusing.now = true
        throw new Error('the script failed')
      }),
    /the script failed/,
  )
  assert.deepEqual(describedOf(target, ['open']), before)
})

test('what a run changed of the document’s state is put back as it was, the names its scope hides as well: one first written since reads nothing and one rewritten has its value back', () => {
  const placed: { seen?: unknown } = {}
  const scope = new ScriptScope(
    (code, given) =>
      new Function('scope', `with (scope) { ${code} }`)(given) as void,
    scopeOf({ placed }),
    () => 0,
  )

  scope.run('var stop = false; var history = ["top"];')

  const taken = scope.state()

  scope.run('stop = true; history = []; open = 1;')
  scope.putBack(scope.changedSince(taken))
  scope.run('placed.seen = [stop, history.length, typeof open].join(",")')

  assert.equal(placed.seen, 'false,1,undefined')
})

test('a push a paused run made onto the array a document holds by a hidden name is taken off before it runs again, with what it changed of its objects and what it first wrote by a hidden name, and the frame’s own by those names is not touched', () => {
  const { context, global, history, open } = windowLike()
  const described = ['history', 'open'].map((name) =>
    Object.getOwnPropertyDescriptor(global, name),
  )
  const placed: { seen?: unknown } = {}
  const given = scopeOf({ placed })
  const hiding = hidingOn(global)
  const bindings = globalBindingsOf(global, ['scope'])
  const evaluate: Evaluate = (code, scope) =>
    hiding(scope, () => vm.runInContext(`with (scope) {\n${code}\n}`, context))

  evaluate.bindings = () => bindings
  context.scope = given

  const scope = new ScriptScope(evaluate, given, () => 0)

  scope.run('var history = ["top"]; var trail = { at: "top" };')

  const taken = scope.state()

  scope.run('history.push("news"); trail.at = "news"; open = function () {};')
  scope.putBack(scope.changedSince(taken))
  scope.run(
    'placed.seen = [history.length, history[0], trail.at, typeof open].join(",")',
  )

  assert.equal(placed.seen, '1,top,top,undefined')
  assert.equal(global.history, history)
  assert.equal(global.open, open)
  assert.deepEqual(
    ['history', 'open'].map((name) =>
      Object.getOwnPropertyDescriptor(global, name),
    ),
    described,
  )
})

test('a document’s state is the names declared on its global object since and the objects they lead to, but for what its scope was given; what a run changed of it is put back where it still stands, and a name declared since is left with nothing', () => {
  const global: Record<string, unknown> = { builtIn: 1, aside: 'x' }
  const bindings = globalBindingsOf(global, ['aside'])
  const evaluate: Evaluate = () => undefined
  const given = { held: 1 }
  const entry: Record<string, unknown> = {
    begun: false,
    timer: 3,
    steps: [1],
    inner: { on: false },
  }

  evaluate.bindings = () => bindings

  const scope = new ScriptScope(evaluate, scopeOf({ given }), () => 0)

  global.ready = true
  global.entry = entry
  global.runtime = given
  global.stop = 'the frame’s own'
  Object.defineProperty(global, 'fixed', { value: 1, writable: false })

  const taken = scope.state()

  assert.deepEqual(
    [...(taken.declared?.keys() ?? [])],
    ['ready', 'entry', 'runtime', 'fixed'],
  )
  assert.equal(taken.objects.has(given), false)

  global.ready = false
  entry.begun = true
  entry.timer = Number.NaN
  ;(entry.steps as number[]).push(2)
  ;(entry.inner as { on: unknown }).on = true
  entry.added = 'x'
  global.builtIn = 2
  global.aside = 'y'
  global.later = 'set'
  global.stop = 'changed'
  given.held = 2

  const changes = scope.changedSince(taken)

  ;(entry.inner as { on: unknown }).on = 'since'
  scope.putBack(changes)

  assert.equal(global.ready, true)
  assert.equal(entry.begun, false)
  assert.equal(entry.timer, 3)
  assert.deepEqual(entry.steps, [1])
  assert.deepEqual(entry.inner, { on: 'since' })
  assert.equal('added' in entry, false)
  assert.equal(global.builtIn, 2)
  assert.equal(global.aside, 'y')
  assert.equal(global.later, undefined)
  assert.equal(global.stop, 'changed')
  assert.equal(global.fixed, 1)
  assert.equal(given.held, 2)
})

/** A scope over a plain global object whose bindings it takes, running no code: a test changes the global and its objects by hand between taking the state and putting it back. */
function scopeOverHand(warn?: (warning: string) => void) {
  const global: Record<string, unknown> = {}
  const bindings = globalBindingsOf(global)
  const evaluate: Evaluate = () => undefined

  evaluate.bindings = () => bindings

  return {
    global,
    scope: new ScriptScope(evaluate, scopeOf({}), () => 0, new Realm([]), warn),
  }
}

test('a property a paused run took off, an array it shortened by pop or by its length, and objects that lead back to one another are put back as they were', () => {
  const { global, scope } = scopeOverHand()
  const entry: Record<string, unknown> = {
    begun: false,
    steps: [1, 2],
    trail: ['a', 'b', 'c'],
  }
  const ring: Record<string, unknown> = { name: 'ring' }
  const next = { back: ring }

  ring.self = ring
  ring.next = next
  global.entry = entry
  global.ring = ring

  const taken = scope.state()

  delete entry.begun
  ;(entry.steps as number[]).pop()
  ;(entry.trail as string[]).length = 0
  ring.self = null
  next.back = null as unknown as Record<string, unknown>
  scope.putBack(scope.changedSince(taken))

  assert.deepEqual(Object.getOwnPropertyDescriptor(entry, 'begun'), {
    value: false,
    writable: true,
    enumerable: true,
    configurable: true,
  })
  assert.deepEqual(entry.steps, [1, 2])
  assert.deepEqual(entry.trail, ['a', 'b', 'c'])
  assert.equal(ring.self, ring)
  assert.equal(next.back, ring)
})

test('a document that holds more objects than a state takes is warned of once, and its state is still taken', () => {
  const warned: string[] = []
  const { global, scope } = scopeOverHand((warning) => warned.push(warning))
  const first = { at: 0 }

  global.many = [
    first,
    ...Array.from({ length: MOST_STATE_OBJECTS }, () => ({})),
  ]

  const taken = scope.state()

  scope.state()
  first.at = 1
  scope.putBack(scope.changedSince(taken))

  assert.equal(warned.length, 1)
  assert.match(warned[0], new RegExp(String(MOST_STATE_OBJECTS)))
  assert.equal(taken.objects.size, MOST_STATE_OBJECTS)
})

test('a table a document holds is held whole: its rows are never gone into, and the table held in its place is put back by identity', () => {
  let read = 0
  const rows = new Proxy(
    Array.from({ length: MOST_ROWS }, (_, at) => [at]),
    {
      ownKeys(target) {
        read += 1

        return Reflect.ownKeys(target)
      },
      getOwnPropertyDescriptor(target, key) {
        read += 1

        return Reflect.getOwnPropertyDescriptor(target, key)
      },
    },
  )
  const table = new Table(rows, [])
  const { global, scope } = scopeOverHand()

  global.table = table

  const taken = scope.state()

  global.table = new Table([], [])
  scope.putBack(scope.changedSince(taken))

  assert.equal(read, 0)
  assert.equal(taken.objects.has(table), false)
  assert.equal(global.table, table)
})
