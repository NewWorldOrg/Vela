import { columnsOf, fieldsOf, fitsField } from '@/lib/bml/structure'

/** How much one broadcaster may keep, over every name together. */
export const MOST_MEMORY_BYTES = 64 * 1024

export const MOST_MEMORY_NAME = 256

export const MOST_MEMORY_ENTRIES = 1024

export type MemoryEntries = [string, string][]

/** The part of `Storage` the player keeps a broadcaster's memory in. */
export interface MemoryStorage {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function head(service: number): string {
  return `bml:${service}:`
}

/** Where the player keeps one name of one broadcaster. */
export function memoryKey(service: number, name: string): string {
  return `${head(service)}${name}`
}

/** Everything the player keeps for one broadcaster, and nothing of another. */
export function memoryEntriesOf(
  storage: MemoryStorage,
  service: number,
): MemoryEntries {
  const entries: MemoryEntries = []
  const prefix = head(service)

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    const value = key?.startsWith(prefix) ? storage.getItem(key) : null

    if (key && value !== null) {
      entries.push([key.slice(prefix.length), value])
    }
  }

  return entries
}

/** Keeps, or with null forgets, one name of one broadcaster. A storage that refuses is left as it is. */
export function keepMemory(
  storage: MemoryStorage,
  service: number,
  name: string,
  value: string | null,
): void {
  const key = memoryKey(service, name)

  try {
    if (value === null) {
      storage.removeItem(key)
    } else {
      storage.setItem(key, value)
    }
  } catch {
    return
  }
}

const utf8 = new TextEncoder()

function bytesOf(text: string): number {
  return utf8.encode(text).length
}

export type OnWrite = (name: string, value: string | null) => void

/** The runtime's copy of one broadcaster's memory: what the player handed it, and what the document writes, within the limit. */
export class PersistentMemory {
  private readonly entries = new Map<string, string>()

  private held = 0

  private readonly onWrite: OnWrite

  constructor(onWrite: OnWrite = () => {}) {
    this.onWrite = onWrite
  }

  take(entries: MemoryEntries): void {
    this.entries.clear()
    this.held = 0
    entries.forEach(([name, value]) => {
      if (this.held + bytesOf(name) + bytesOf(value) <= MOST_MEMORY_BYTES) {
        this.entries.set(name, value)
        this.held += bytesOf(name) + bytesOf(value)
      }
    })
  }

  get bytes(): number {
    return this.held
  }

  read(name: string): string | undefined {
    return this.entries.get(name)
  }

  /** Writes when the broadcaster's total stays within the limit; false, and nothing changed, otherwise. */
  write(name: string, value: string): boolean {
    if (name.length === 0 || name.length > MOST_MEMORY_NAME) {
      return false
    }

    const before = this.entries.has(name)
      ? bytesOf(name) + bytesOf(this.entries.get(name) as string)
      : 0
    const after = bytesOf(name) + bytesOf(value)

    if (this.held - before + after > MOST_MEMORY_BYTES) {
      return false
    }

    this.entries.set(name, value)
    this.held += after - before
    this.onWrite(name, value)

    return true
  }
}

interface Kept {
  structure: string
  data: unknown[]
}

function keptOf(value: string | undefined): Kept | null {
  if (value === undefined) {
    return null
  }

  try {
    const kept = JSON.parse(value) as Partial<Kept> | null

    return kept &&
      typeof kept === 'object' &&
      typeof kept.structure === 'string' &&
      Array.isArray(kept.data)
      ? { structure: kept.structure, data: kept.data }
      : null
  } catch {
    return null
  }
}

/** The array a document wrote under a name with the same structure, or null. */
export function readArray(
  memory: PersistentMemory,
  name: unknown,
  structure: unknown,
): unknown[] | null {
  if (typeof name !== 'string' || typeof structure !== 'string') {
    return null
  }

  const kept = keptOf(memory.read(name))

  return kept && kept.structure === structure ? [...kept.data] : null
}

/** Writes an array under a name with its structure; false when the data does not fit the structure or the limit. */
export function writeArray(
  memory: PersistentMemory,
  name: unknown,
  structure: unknown,
  data: unknown,
): boolean {
  const fields = typeof structure === 'string' ? fieldsOf(structure) : null
  const columns = fields ? columnsOf(fields) : null

  if (
    typeof name !== 'string' ||
    !columns ||
    !Array.isArray(data) ||
    data.length !== columns.length ||
    !columns.every((field, index) => fitsField(field, data[index]))
  ) {
    return false
  }

  return memory.write(name, JSON.stringify({ structure, data }))
}
