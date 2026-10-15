import { withIntegerDivision } from '@/lib/bml/integers'
import { ownOf, Realm, sameDescriptor, type Own } from '@/lib/bml/realm'

/** Thrown out of `browser.launchDocument` and `reloadActiveDocument`, so the script that left its document runs no further. */
export class DocumentLeft extends Error {
  constructor() {
    super('the document was left')
    this.name = 'DocumentLeft'
  }
}

/** Thrown out of `browser.transmitTextDataOverIP` when the answer is still on its way: the script stops there, and is run again from its start once the answer is in, with the answers it has had given back in the order it asked. */
export class LineAwaited extends Error {
  constructor() {
    super('the answer over the line is awaited')
    this.name = 'LineAwaited'
  }
}

/** What a script may not reach by name: the frame's own window and what it opens onto. Inside a document's scope each is the document's own, what it wrote by that name or else nothing. */
export const SHADOWED_GLOBALS = [
  'window',
  'self',
  'globalThis',
  'parent',
  'top',
  'frames',
  'opener',
  'location',
  'history',
  'navigator',
  'postMessage',
  'addEventListener',
  'removeEventListener',
  'dispatchEvent',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'open',
  'close',
  'stop',
  'print',
  'alert',
  'confirm',
  'prompt',
  'Function',
  'Worker',
  'SharedWorker',
  'BroadcastChannel',
  'MessageChannel',
  'Image',
  'Blob',
  'URL',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'queueMicrotask',
  'structuredClone',
  'performance',
  'customElements',
  'onerror',
  'onmessage',
] as const

export type ScriptGlobals = Record<string, unknown>

/** How long one run of a script may take before the frame is remade around it. */
export const MOST_RUN_MS = 2000

/** Names and what they held at one moment: a document's own global bindings, the names its declarations put on the global object, or what it wrote by the names its scope hides. */
export type Bindings = Map<string, unknown>

const KEPT = new WeakMap<object, Bindings>()

const GIVEN = new WeakMap<object, ReadonlySet<object>>()

/** The object a document's code is run `with`. A name the runtime gives resolves to what it gave, and stays so whatever the code writes to it. A name the frame must not be reached by is the document's own: it resolves to what the document wrote to it, or to nothing, and never to the frame's. Every other name goes on to the frame's own globals, where the document's declarations live. */
export function scopeOf(globals: ScriptGlobals): object {
  const given = new Map(Object.entries(globals))
  const hidden = new Set<string>(SHADOWED_GLOBALS)
  const kept: Bindings = new Map()
  const owned = (name: string | symbol): name is string =>
    typeof name === 'string' && hidden.has(name) && !given.has(name)
  const scope = new Proxy(Object.create(null) as Record<string, unknown>, {
    has(_, name) {
      return typeof name === 'string' && (given.has(name) || hidden.has(name))
    },
    get(_, name) {
      if (typeof name !== 'string') {
        return undefined
      }

      return given.has(name) ? given.get(name) : kept.get(name)
    },
    set(_, name, value) {
      if (owned(name)) {
        kept.set(name, value)
      }

      return true
    },
    deleteProperty(_, name) {
      if (owned(name)) {
        kept.delete(name)
      }

      return true
    },
    defineProperty() {
      return true
    },
    getOwnPropertyDescriptor() {
      return undefined
    },
  })

  KEPT.set(scope, kept)
  GIVEN.set(scope, new Set([...given.values()].filter(isObject)))

  return scope
}

/** Runs a document's code with its scope, the names the scope hides laid over the global object while it runs. */
export type Hiding = (scope: object, run: () => void) => void

interface Held {
  name: string
  described: PropertyDescriptor | undefined
}

function layOver(global: object, held: Held, scope: () => object): void {
  const { name, described } = held

  Object.defineProperty(global, name, {
    configurable: true,
    enumerable: described?.enumerable ?? false,
    get: () =>
      described && 'value' in described
        ? described.value
        : described?.get?.call(global),
    set: (value: unknown) => {
      Reflect.set(scope(), name, value)
    },
  })
}

/** Lays each name the scope hides that the global object may redefine over it, adding each to `laid` once it is laid. */
function layAllOver(global: object, laid: Held[], scope: () => object): void {
  SHADOWED_GLOBALS.forEach((name) => {
    const held = {
      name,
      described: Object.getOwnPropertyDescriptor(global, name),
    }

    if (held.described?.configurable !== false) {
      layOver(global, held, scope)
      laid.push(held)
    }
  })
}

/** Puts back on the global object each name laid over it as it was, each on its own, and gives what kept any from being put back. */
function putAllBack(global: object, laid: Held[]): unknown[] {
  return laid.flatMap(({ name, described }) => {
    try {
      if (described) {
        Object.defineProperty(global, name, described)
      } else {
        Reflect.deleteProperty(global, name)
      }

      return []
    } catch (error) {
      return [error]
    }
  })
}

/** Keeps in the scope what a document's code writes on the global object by a name the scope hides. The code is wrapped in a block, and a function it declares there is also written on the global object, past the scope: a name held there behind a getter alone drops it, and any other takes it in place of the frame's own. So while the code runs each such name on the global object reads as it did and hands what is written to it to the scope, and afterwards holds what it held. A name the global object holds unconfigurable cannot be laid over: a window's `window` and `top` drop what is written to them, and its `location` navigates the frame to it. A name the global object will not have laid over fails the run before it starts, with the names laid before it put back; one it will not have put back fails a run that went well, once every other is put back. */
export function hidingOn(global: object): Hiding {
  const running: object[] = []
  const current = () => running[running.length - 1]
  let laid: Held[] = []

  return (scope, run) => {
    let unrestored: unknown[] = []

    try {
      running.push(scope)

      if (running.length === 1) {
        laid = []
        layAllOver(global, laid, current)
      }

      run()
    } finally {
      running.pop()

      if (running.length === 0) {
        unrestored = putAllBack(global, laid)
      }
    }

    if (unrestored.length > 0) {
      throw unrestored[0]
    }
  }
}

const TABLE_CONSTRUCTION = /\bnew\s+(BinaryTable|CSVTable)\s*\(/g

/** A document's code with `new` taken off `BinaryTable` and `CSVTable`: the runtime answers null for a table it cannot make, which a constructor called with `new` cannot. */
export function withoutTableNew(code: string): string {
  return code.replace(TABLE_CONSTRUCTION, '$1(')
}

/** The most objects a document's state is taken of; what lies past them is not put back. */
const MOST_STATE_OBJECTS = 10_000

/** One property found not as it was: by what key, what it was then, and what it is now. */
export interface PropertyChange {
  key: PropertyKey
  before: PropertyDescriptor | undefined
  after: PropertyDescriptor | undefined
}

/** The bindings documents declared on a global object, and the means to put one back. */
export interface GlobalBindings {
  readonly global: object
  take(): Own
  putBack(change: PropertyChange): void
}

function isObject(value: unknown): value is object {
  return (
    (typeof value === 'object' && value !== null) || typeof value === 'function'
  )
}

/** An object's own properties, or null for one that throws when they are asked after. */
function readOwn(target: object): Own | null {
  try {
    return ownOf(target)
  } catch {
    return null
  }
}

/** One own property of an object, or null when it throws when asked after. */
function readProperty(
  target: object,
  key: PropertyKey,
): PropertyDescriptor | undefined | null {
  try {
    return Object.getOwnPropertyDescriptor(target, key)
  } catch {
    return null
  }
}

function writableData(described: PropertyDescriptor | undefined): boolean {
  return described !== undefined && 'value' in described && !!described.writable
}

/** Whether a property is a writable value now as it was before, alike in the rest, so that putting it back is setting its value. */
function sameKindOfData(
  now: PropertyDescriptor | undefined,
  was: PropertyDescriptor,
): boolean {
  return (
    writableData(now) &&
    writableData(was) &&
    now?.enumerable === was.enumerable &&
    now?.configurable === was.configurable
  )
}

/** Puts one property back as it was before a change, unless it has changed again since. One that was not there is taken off, or, where it cannot be, as a global binding cannot, left with nothing. */
function putPropertyBack(
  on: object,
  { key, before, after }: PropertyChange,
  takesOff: boolean,
): void {
  const now = readProperty(on, key)

  if (now === null || !sameDescriptor(now, after)) {
    return
  }

  if (!before) {
    if (takesOff) {
      Reflect.deleteProperty(on, key)
    } else if (writableData(now)) {
      Reflect.set(on, key, undefined)
    }

    return
  }

  if (sameKindOfData(now, before)) {
    Reflect.set(on, key, before.value)
  } else {
    Reflect.defineProperty(on, key, before)
  }
}

function changesOf(before: Own, after: Own): PropertyChange[] {
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((key) => !sameDescriptor(before.get(key), after.get(key)))
    .map((key) => ({ key, before: before.get(key), after: after.get(key) }))
}

/** The own properties of each object the values lead to through data properties, each once, as many as a state takes. What is `aside` is not gone into. */
function objectsFrom(
  values: Iterable<unknown>,
  aside: ReadonlySet<object>,
): Map<object, Own> {
  const objects = new Map<object, Own>()
  const found = new Set<object>()
  const waiting: object[] = []
  const reach = (value: unknown) => {
    if (
      isObject(value) &&
      !aside.has(value) &&
      !found.has(value) &&
      found.size < MOST_STATE_OBJECTS
    ) {
      found.add(value)
      waiting.push(value)
    }
  }

  for (const value of values) {
    reach(value)
  }

  for (let next = waiting.pop(); next !== undefined; next = waiting.pop()) {
    const own = readOwn(next)

    if (own) {
      objects.set(next, own)
      own.forEach((described) => reach(described?.value))
    }
  }

  return objects
}

function valuesOf(own: Own | null): unknown[] {
  return own ? [...own.values()].map((described) => described?.value) : []
}

function keptProperty(value: unknown): PropertyDescriptor {
  return { value, writable: true, enumerable: true, configurable: true }
}

/** What a document wrote by the names its scope hides, read as the properties of an object would be. */
function keptOwn(kept: Bindings | undefined): Own {
  return new Map(
    [...(kept ?? [])].map(([name, value]) => [name, keptProperty(value)]),
  )
}

/** The bindings of a global object that were not on it when this was called, nor named `aside`, nor by a name the scope hides: what the documents declared on it since. A name the scope hides is the frame's own on the global object, and the document's in its scope, so it is neither taken nor put back here. A binding declared since a change is left with nothing when it is put back, as it cannot be taken off. */
export function globalBindingsOf(
  global: object,
  aside: readonly string[] = [],
): GlobalBindings {
  const before = new Set([
    ...Object.getOwnPropertyNames(global),
    ...aside,
    ...SHADOWED_GLOBALS,
  ])

  return {
    global,
    take: () =>
      new Map(
        Object.getOwnPropertyNames(global)
          .filter((name) => !before.has(name))
          .map((name) => [name, Object.getOwnPropertyDescriptor(global, name)]),
      ),
    putBack: (change) => putPropertyBack(global, change, false),
  }
}

/** A document's state at one moment: the bindings its declarations put on the global object, where the evaluator reaches them, what it wrote by the names its scope hides, and the own properties of each object those lead to through data properties, functions among them, but for what the runtime gave it. */
export interface DocumentState {
  declared: Own | null
  kept: Own
  objects: Map<object, Own>
}

/** What changed of a document's state since it was taken: its declared bindings, what it wrote by hidden names, and the properties of its objects. */
export interface StateChanges {
  declared: PropertyChange[]
  kept: PropertyChange[]
  objects: [object, PropertyChange][]
}

/** Runs one piece of a document's code with its scope, and throws what it threw. `bindings`, where the evaluator has it, reaches the global object the code declares on. */
export type Evaluate = ((code: string, scope: object) => void) & {
  bindings?: (scope: object) => GlobalBindings
}

export type ScriptOutcome =
  | { outcome: 'done'; tookMs: number }
  | { outcome: 'left'; tookMs: number }
  | { outcome: 'awaiting'; tookMs: number }
  | { outcome: 'failed'; error: unknown; tookMs: number }

/** Runs a document's scripts and handlers one at a time, timing each and dividing in integers as a receiver does, with the document's writes on the built-ins in place only while its code runs. */
export class ScriptScope {
  private readonly evaluate: Evaluate

  private readonly scope: object

  private readonly now: () => number

  private readonly realm: Realm

  constructor(
    evaluate: Evaluate,
    scope: object,
    now: () => number,
    realm: Realm = new Realm([]),
  ) {
    this.evaluate = evaluate
    this.scope = scope
    this.now = now
    this.realm = realm
  }

  /** The document's state as it stands. */
  state(): DocumentState {
    const bindings = this.evaluate.bindings?.(this.scope)
    const declared = bindings?.take() ?? null
    const kept = keptOwn(KEPT.get(this.scope))
    const aside = new Set<object>([
      this.scope,
      ...(GIVEN.get(this.scope) ?? []),
    ])

    if (bindings) {
      aside.add(bindings.global)
    }

    return {
      declared,
      kept,
      objects: objectsFrom([...valuesOf(declared), ...valuesOf(kept)], aside),
    }
  }

  /** What changed of the document's state since it was taken. */
  changedSince(taken: DocumentState | null): StateChanges | null {
    if (!taken) {
      return null
    }

    const declared = this.evaluate.bindings?.(this.scope).take()

    return {
      declared:
        taken.declared && declared ? changesOf(taken.declared, declared) : [],
      kept: changesOf(taken.kept, keptOwn(KEPT.get(this.scope))),
      objects: [...taken.objects].flatMap(([object, own]) =>
        changesOf(own, readOwn(object) ?? own).map(
          (change): [object, PropertyChange] => [object, change],
        ),
      ),
    }
  }

  /** Puts what changed of the document's state back as it was, each change that still stands: a binding declared since is left with nothing, and what it first wrote by a hidden name since, or put on an object, is taken off. */
  putBack(changes: StateChanges | null): void {
    if (!changes) {
      return
    }

    const bindings = this.evaluate.bindings?.(this.scope)
    const kept = KEPT.get(this.scope)

    changes.declared.forEach((change) => bindings?.putBack(change))
    changes.kept.forEach(({ key, before, after }) => {
      const name = String(key)
      const now = kept?.has(name) ? keptProperty(kept.get(name)) : undefined

      if (!kept || !sameDescriptor(now, after)) {
        return
      }

      if (before) {
        kept.set(name, before.value)
      } else {
        kept.delete(name)
      }
    })
    changes.objects.forEach(([object, change]) =>
      putPropertyBack(object, change, true),
    )
  }

  run(code: string): ScriptOutcome {
    const started = this.now()
    const rewritten = withIntegerDivision(withoutTableNew(code))

    this.realm.enter()

    try {
      this.evaluate(rewritten, this.scope)

      return { outcome: 'done', tookMs: this.now() - started }
    } catch (error) {
      const tookMs = this.now() - started

      if (error instanceof DocumentLeft) {
        return { outcome: 'left', tookMs }
      }

      return error instanceof LineAwaited
        ? { outcome: 'awaiting', tookMs }
        : { outcome: 'failed', error, tookMs }
    } finally {
      this.realm.leave()
    }
  }
}
