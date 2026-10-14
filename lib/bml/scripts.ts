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

/** What a script may not reach by name: the frame's own window and what it opens onto, each resolved to nothing inside a document's scope. */
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

const GIVEN = new WeakMap<object, ScriptGlobals>()

/** What a scope was given, for an evaluator that builds a global scope of its own rather than running `with` the scope. */
export function givenOf(scope: object): ScriptGlobals {
  return GIVEN.get(scope) ?? {}
}

/** The object a document's code is run `with`: a name the runtime gives resolves to what it gave, a name the frame must not be reached by resolves to nothing, and every other name goes on to the frame's own globals, where the document's declarations live. */
export function scopeOf(globals: ScriptGlobals): object {
  const given = new Map(Object.entries(globals))
  const hidden = new Set<string>(SHADOWED_GLOBALS)
  const scope = new Proxy(Object.create(null) as Record<string, unknown>, {
    has(_, name) {
      return typeof name === 'string' && (given.has(name) || hidden.has(name))
    },
    get(_, name) {
      return typeof name === 'string' ? given.get(name) : undefined
    },
    set() {
      return true
    },
    deleteProperty() {
      return true
    },
    defineProperty() {
      return true
    },
    getOwnPropertyDescriptor() {
      return undefined
    },
  })

  GIVEN.set(scope, { ...globals })

  return scope
}

const TABLE_CONSTRUCTION = /\bnew\s+(BinaryTable|CSVTable)\s*\(/g

/** A document's code with `new` taken off `BinaryTable` and `CSVTable`: the runtime answers null for a table it cannot make, which a constructor called with `new` cannot. */
export function withoutTableNew(code: string): string {
  return code.replace(TABLE_CONSTRUCTION, '$1(')
}

/** A document's own global bindings, the names its declarations put on the global object, as they stood at one moment. */
export type Bindings = Map<string, unknown>

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

  /** The document's global bindings as they stand, or null where the evaluator cannot reach them. */
  bindings(): Bindings | null {
    return this.evaluate.bindings?.(this.scope).take() ?? null
  }

  /** Puts the document's global bindings back as they were taken. */
  putBack(taken: Bindings | null): void {
    if (taken) {
      this.evaluate.bindings?.(this.scope).put(taken)
    }
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
