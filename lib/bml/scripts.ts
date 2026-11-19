import { withGlobalFunctions } from '@/lib/bml/declarations'
import { withIntegerDivision } from '@/lib/bml/integers'
import { ownOf, Realm, sameDescriptor, type Own } from '@/lib/bml/realm'

export class DocumentLeft extends Error {
  constructor() {
    super('the document was left')
    this.name = 'DocumentLeft'
  }
}

export class LineAwaited extends Error {
  constructor() {
    super('the answer over the line is awaited')
    this.name = 'LineAwaited'
  }
}

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

export { MOST_RUN_MS } from '@/lib/bml/run-limit'

export type Bindings = Map<string, unknown>

const KEPT = new WeakMap<object, Bindings>()

const GIVEN = new WeakMap<object, ReadonlySet<object>>()

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

export function withoutTableNew(code: string): string {
  return code.replace(TABLE_CONSTRUCTION, '$1(')
}

export const MOST_STATE_OBJECTS = 10_000

const HELD_WHOLE = new WeakSet<object>()

export function heldWhole<T extends object>(value: T): T {
  HELD_WHOLE.add(value)

  return value
}

export interface PropertyChange {
  key: PropertyKey
  before: PropertyDescriptor | undefined
  after: PropertyDescriptor | undefined
}

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

function readOwn(target: object): Own | null {
  try {
    return ownOf(target)
  } catch {
    return null
  }
}

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

function objectsFrom(
  values: Iterable<unknown>,
  aside: ReadonlySet<object>,
): { objects: Map<object, Own>; cut: boolean } {
  const objects = new Map<object, Own>()
  const found = new Set<object>()
  const waiting: object[] = []
  let cut = false
  const reach = (value: unknown) => {
    if (
      !isObject(value) ||
      aside.has(value) ||
      HELD_WHOLE.has(value) ||
      found.has(value)
    ) {
      return
    }

    if (found.size >= MOST_STATE_OBJECTS) {
      cut = true

      return
    }

    found.add(value)
    waiting.push(value)
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

  return { objects, cut }
}

function valuesOf(own: Own | null): unknown[] {
  return own ? [...own.values()].map((described) => described?.value) : []
}

function keptProperty(value: unknown): PropertyDescriptor {
  return { value, writable: true, enumerable: true, configurable: true }
}

function keptOwn(kept: Bindings | undefined): Own {
  return new Map(
    [...(kept ?? [])].map(([name, value]) => [name, keptProperty(value)]),
  )
}

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

export interface DocumentState {
  declared: Own | null
  kept: Own
  objects: Map<object, Own>
}

export interface StateChanges {
  declared: PropertyChange[]
  kept: PropertyChange[]
  objects: [object, PropertyChange][]
}

export type Evaluate = ((code: string, scope: object) => void) & {
  bindings?: (scope: object) => GlobalBindings
}

export type ScriptOutcome =
  | { outcome: 'done'; tookMs: number }
  | { outcome: 'left'; tookMs: number }
  | { outcome: 'awaiting'; tookMs: number }
  | { outcome: 'failed'; error: unknown; tookMs: number }

export class ScriptScope {
  private readonly evaluate: Evaluate

  private readonly scope: object

  private readonly now: () => number

  private readonly realm: Realm

  private readonly warn: (warning: string) => void

  private cutWarned = false

  constructor(
    evaluate: Evaluate,
    scope: object,
    now: () => number,
    realm: Realm = new Realm([]),
    warn: (warning: string) => void = () => {},
  ) {
    this.evaluate = evaluate
    this.scope = scope
    this.now = now
    this.realm = realm
    this.warn = warn
  }

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

    const { objects, cut } = objectsFrom(
      [...valuesOf(declared), ...valuesOf(kept)],
      aside,
    )

    if (cut && !this.cutWarned) {
      this.cutWarned = true
      this.warn(
        `more than ${MOST_STATE_OBJECTS} objects held: what a run changes past them is not put back when it runs again after the line`,
      )
    }

    return { declared, kept, objects }
  }

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
    const rewritten = withGlobalFunctions(
      withIntegerDivision(withoutTableNew(code)),
    )

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
