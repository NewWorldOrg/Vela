export type Own = Map<PropertyKey, PropertyDescriptor | undefined>

type Snapshot = Map<object, Own>

export function ownOf(target: object): Own {
  const own: Own = new Map()

  Reflect.ownKeys(target).forEach((key) => {
    own.set(key, Object.getOwnPropertyDescriptor(target, key))
  })

  return own
}

export function sameDescriptor(
  one: PropertyDescriptor | undefined,
  other: PropertyDescriptor | undefined,
): boolean {
  if (!one || !other) {
    return one === other
  }

  return (
    Object.is(one.value, other.value) &&
    one.get === other.get &&
    one.set === other.set &&
    one.writable === other.writable &&
    one.enumerable === other.enumerable &&
    one.configurable === other.configurable
  )
}

function apply(
  target: object,
  key: PropertyKey,
  wanted: PropertyDescriptor | undefined,
): void {
  const current = Object.getOwnPropertyDescriptor(target, key)

  if (current && current.configurable === false) {
    return
  }

  if (wanted) {
    Object.defineProperty(target, key, wanted)
  } else if (current) {
    Reflect.deleteProperty(target, key)
  }
}

export class Realm {
  private readonly pristine: Snapshot = new Map()

  private readonly written: Snapshot = new Map()

  private depth = 0

  constructor(targets: readonly object[]) {
    targets.forEach((target) => this.pristine.set(target, ownOf(target)))
  }

  enter(): void {
    this.depth += 1

    if (this.depth > 1) {
      return
    }

    this.written.forEach((own, target) => {
      own.forEach((wanted, key) => apply(target, key, wanted))
    })
  }

  leave(): void {
    this.depth -= 1

    if (this.depth > 0) {
      return
    }

    this.pristine.forEach((pristine, target) => {
      const now = ownOf(target)
      const changed: Own = new Map()

      new Set([...pristine.keys(), ...now.keys()]).forEach((key) => {
        const before = pristine.get(key)
        const after = now.get(key)

        if (!sameDescriptor(before, after)) {
          changed.set(key, after)
          apply(target, key, before)
        }
      })

      if (changed.size > 0) {
        this.written.set(target, changed)
      } else {
        this.written.delete(target)
      }
    })
  }
}

export function builtinsOf(window: object): object[] {
  const globals = window as Record<string, unknown>
  const names = [
    'Object',
    'Function',
    'Array',
    'String',
    'Number',
    'Boolean',
    'Date',
    'RegExp',
    'Error',
  ]
  const constructors = names
    .map((name) => globals[name])
    .filter((each): each is { prototype: object } => typeof each === 'function')

  return [
    ...constructors,
    ...constructors.map((each) => each.prototype),
    ...['Math', 'JSON']
      .map((name) => globals[name])
      .filter(
        (each): each is object => typeof each === 'object' && each !== null,
      ),
  ]
}
