import { withIntegerDivision } from '@/lib/bml/integers'
import { Realm } from '@/lib/bml/realm'

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

function putBackOn(global: object, { name, described }: Held): void {
  if (described) {
    Object.defineProperty(global, name, described)
  } else {
    Reflect.deleteProperty(global, name)
  }
}

/** Keeps in the scope what a document's code writes on the global object by a name the scope hides. The code is wrapped in a block, and a function it declares there is also written on the global object, past the scope: a name held there behind a getter alone drops it, and any other takes it in place of the frame's own. So while the code runs each such name on the global object reads as it did and hands what is written to it to the scope, and afterwards holds what it held. A name the global object holds unconfigurable cannot be laid over: a window's `window` and `top` drop what is written to them, and its `location` navigates the frame to it. */
export function hidingOn(global: object): Hiding {
  const running: object[] = []
  const current = () => running[running.length - 1]
  let held: Held[] = []

  return (scope, run) => {
    running.push(scope)

    if (running.length === 1) {
      held = SHADOWED_GLOBALS.map((name) => ({
        name,
        described: Object.getOwnPropertyDescriptor(global, name),
      })).filter(({ described }) => described?.configurable !== false)
      held.forEach((each) => layOver(global, each, current))
    }

    try {
      run()
    } finally {
      running.pop()

      if (running.length === 0) {
        held.forEach((each) => putBackOn(global, each))
      }
    }
  }
}

const TABLE_CONSTRUCTION = /\bnew\s+(BinaryTable|CSVTable)\s*\(/g

/** A document's code with `new` taken off `BinaryTable` and `CSVTable`: the runtime answers null for a table it cannot make, which a constructor called with `new` cannot. */
export function withoutTableNew(code: string): string {
  return code.replace(TABLE_CONSTRUCTION, '$1(')
}

/** Takes and puts back a document's global bindings. */
export interface GlobalBindings {
  take(): Bindings
  put(taken: Bindings): void
}

function dataValue(global: object, name: string): { value: unknown } | null {
  const described = Object.getOwnPropertyDescriptor(global, name)

  return described && 'value' in described ? { value: described.value } : null
}

/** The bindings of a global object that were not on it when this was called, nor named `aside`: what the documents declared on it since. Putting bindings back gives each the value it had when they were taken, and one declared since then nothing. */
export function globalBindingsOf(
  global: object,
  aside: readonly string[] = [],
): GlobalBindings {
  const before = new Set([...Object.getOwnPropertyNames(global), ...aside])
  const declared = () =>
    Object.getOwnPropertyNames(global).filter((name) => !before.has(name))

  return {
    take: () => {
      const taken: Bindings = new Map()

      declared().forEach((name) => {
        const data = dataValue(global, name)

        if (data) {
          taken.set(name, data.value)
        }
      })

      return taken
    },
    put: (taken) => {
      declared().forEach((name) => {
        const described = Object.getOwnPropertyDescriptor(global, name)

        if (described && 'value' in described && described.writable) {
          ;(global as Record<string, unknown>)[name] = taken.get(name)
        }
      })
    },
  }
}

/** A document's globals as they stood at one moment: the bindings its declarations put on the global object, where the evaluator reaches them, and what it wrote by the names its scope hides. */
export interface DocumentGlobals {
  declared: Bindings | null
  kept: Bindings
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

  /** The document's globals as they stand. */
  bindings(): DocumentGlobals {
    return {
      declared: this.evaluate.bindings?.(this.scope).take() ?? null,
      kept: new Map(KEPT.get(this.scope)),
    }
  }

  /** Puts the document's globals back as they were taken: what it wrote by a hidden name since reads nothing again. */
  putBack(taken: DocumentGlobals | null): void {
    if (!taken) {
      return
    }

    if (taken.declared) {
      this.evaluate.bindings?.(this.scope).put(taken.declared)
    }

    const kept = KEPT.get(this.scope)

    kept?.clear()
    taken.kept.forEach((value, name) => kept?.set(name, value))
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
