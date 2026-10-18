import { BitReader, UTF8, readCells, writeCells } from '@/lib/bml/fields'
import { fieldsOf, fitsField } from '@/lib/bml/structure'

/** How much one broadcaster may keep, over every name together. */
export const MOST_MEMORY_BYTES = 64 * 1024

export const MOST_MEMORY_NAME = 256

export const MOST_MEMORY_ENTRIES = 1024

/** What one name holds: a block of this many bytes, read as zeros until written. */
export const AREA_BYTES = 64

/** A broadcaster's memory as the player keeps it: each name with its block, written out as base64. */
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

function bytesOfName(name: string): number {
  return utf8.encode(name).length
}

/** A block written out as base64, the form the player keeps. */
export function blockToText(block: Uint8Array): string {
  return btoa(Array.from(block, (byte) => String.fromCharCode(byte)).join(''))
}

/** A block read back from base64, or null when the text is not one. */
export function blockOfText(text: string): Uint8Array | null {
  try {
    const decoded = atob(text)

    return decoded.length <= AREA_BYTES
      ? Uint8Array.from(decoded, (char) => char.charCodeAt(0))
      : null
  } catch {
    return null
  }
}

/** Whether keeping a block under a name leaves all one broadcaster keeps within the limit. Forgetting always does; what is not a block never fits. */
export function fitsTheBroadcaster(
  storage: MemoryStorage,
  service: number,
  name: string,
  value: string | null,
): boolean {
  if (value === null) {
    return true
  }

  const block = blockOfText(value)

  if (!block) {
    return false
  }

  const others = memoryEntriesOf(storage, service).reduce(
    (total, [held, text]) =>
      held === name
        ? total
        : total + bytesOfName(held) + (blockOfText(text)?.length ?? 0),
    0,
  )

  return others + bytesOfName(name) + block.length <= MOST_MEMORY_BYTES
}

export type OnWrite = (name: string, value: string | null) => void

/** The runtime's copy of one broadcaster's memory: what the player handed it, and what the document writes, within the limit. A name never written reads as a block of zeros. */
export class PersistentMemory {
  private readonly entries = new Map<string, Uint8Array>()

  private held = 0

  private readonly onWrite: OnWrite

  constructor(onWrite: OnWrite = () => {}) {
    this.onWrite = onWrite
  }

  take(entries: MemoryEntries): void {
    this.entries.clear()
    this.held = 0
    entries.forEach(([name, value]) => {
      const block = blockOfText(value)
      const size = bytesOfName(name) + (block?.length ?? 0)

      if (block && this.held + size <= MOST_MEMORY_BYTES) {
        this.entries.set(name, block)
        this.held += size
      }
    })
  }

  get bytes(): number {
    return this.held
  }

  /** The block under a name, zeros when none was written. */
  read(name: string): Uint8Array {
    const block = new Uint8Array(AREA_BYTES)

    block.set(this.entries.get(name) ?? [])

    return block
  }

  has(name: string): boolean {
    return this.entries.has(name)
  }

  /** Writes a block under a name when it fits its area and the broadcaster's total stays within the limit; false, and nothing changed, otherwise. */
  write(name: string, block: Uint8Array): boolean {
    if (
      name.length === 0 ||
      name.length > MOST_MEMORY_NAME ||
      block.length > AREA_BYTES
    ) {
      return false
    }

    const before = this.entries.has(name)
      ? bytesOfName(name) + (this.entries.get(name) as Uint8Array).length
      : 0
    const after = bytesOfName(name) + block.length

    if (this.held - before + after > MOST_MEMORY_BYTES) {
      return false
    }

    this.entries.set(name, block)
    this.held += after - before
    this.onWrite(name, blockToText(block))

    return true
  }
}

/** The values a document reads under a name as a structure says, or null when the structure is not one. */
export function readArray(
  memory: PersistentMemory,
  name: unknown,
  structure: unknown,
): unknown[] | null {
  const fields = fieldsOf(structure)

  if (typeof name !== 'string' || !fields) {
    return null
  }

  return readCells(new BitReader(memory.read(name)), fields, UTF8)
}

/** Writes values under a name as a structure says: how many bytes were written, or null when the values do not fit the structure, the area or the limit. */
export function writeArray(
  memory: PersistentMemory,
  name: unknown,
  structure: unknown,
  data: unknown,
): number | null {
  const fields = fieldsOf(structure)
  const columns = fields?.filter((field) => field.type !== 'P')

  if (
    typeof name !== 'string' ||
    !fields ||
    !columns ||
    !Array.isArray(data) ||
    data.length !== columns.length ||
    !columns.every((field, index) => fitsField(field, data[index]))
  ) {
    return null
  }

  const block = writeCells(fields, data, UTF8)

  return block !== null && memory.write(name, block) ? block.length : null
}
