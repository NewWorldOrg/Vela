export interface CatalogResource {
  path: string
  type: string
}

export interface CatalogModule {
  id: number
  version: number
  size: number
  resources: CatalogResource[]
}

export interface CatalogCarousel {
  tag: number
  downloadId: number
  modules: CatalogModule[]
}

export interface BmlCatalog {
  service: number
  entryTag: number
  autoStart: boolean
  startup: string
  carousels: CatalogCarousel[]
}

export const CATALOG_BYTE = 0x01

type Cbor = number | string | boolean | null | Cbor[] | Map<string, Cbor>

const MOST_DEPTH = 8

const MOST_ITEMS = 1 << 16

class CborReader {
  private at = 0

  private readonly bytes: Uint8Array

  private readonly view: DataView

  private readonly text = new TextDecoder('utf-8', { fatal: true })

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  }

  get done(): boolean {
    return this.at === this.bytes.length
  }

  read(depth: number): Cbor {
    if (depth > MOST_DEPTH) {
      throw new RangeError('too deep')
    }

    const head = this.byte()
    const major = head >> 5
    const length = this.argument(head & 0x1f)

    switch (major) {
      case 0:
        return length
      case 3:
        return this.text.decode(this.take(length))
      case 4:
        return this.items(length, depth)
      case 5:
        return this.entries(length, depth)
      case 7:
        return this.simple(head & 0x1f)
      default:
        throw new RangeError('unsupported item')
    }
  }

  private items(length: number, depth: number): Cbor[] {
    if (length > MOST_ITEMS) {
      throw new RangeError('too many items')
    }

    return Array.from({ length }, () => this.read(depth + 1))
  }

  private entries(length: number, depth: number): Map<string, Cbor> {
    if (length > MOST_ITEMS) {
      throw new RangeError('too many entries')
    }

    const map = new Map<string, Cbor>()

    for (let index = 0; index < length; index += 1) {
      const key = this.read(depth + 1)

      if (typeof key !== 'string') {
        throw new RangeError('a key is not text')
      }

      map.set(key, this.read(depth + 1))
    }

    return map
  }

  private simple(code: number): Cbor {
    switch (code) {
      case 20:
        return false
      case 21:
        return true
      case 22:
        return null
      default:
        throw new RangeError('unsupported simple value')
    }
  }

  private argument(info: number): number {
    if (info < 24) {
      return info
    }

    switch (info) {
      case 24:
        return this.byte()
      case 25:
        return this.view.getUint16(this.advance(2))
      case 26:
        return this.view.getUint32(this.advance(4))
      case 27: {
        const at = this.advance(8)
        const value =
          this.view.getUint32(at) * 2 ** 32 + this.view.getUint32(at + 4)

        if (!Number.isSafeInteger(value)) {
          throw new RangeError('too large')
        }

        return value
      }
      default:
        throw new RangeError('indefinite or reserved length')
    }
  }

  private byte(): number {
    return this.bytes[this.advance(1)]
  }

  private take(length: number): Uint8Array {
    const at = this.advance(length)

    return this.bytes.subarray(at, at + length)
  }

  private advance(length: number): number {
    const at = this.at

    if (at + length > this.bytes.length) {
      throw new RangeError('ends early')
    }

    this.at += length

    return at
  }
}

function plain(value: Cbor): unknown {
  if (value instanceof Map) {
    const object: Record<string, unknown> = Object.create(null)

    value.forEach((entry, key) => {
      object[key] = plain(entry)
    })

    return object
  }

  return Array.isArray(value) ? value.map(plain) : value
}

/** Reads the catalog payload of the side channel (CBOR after the kind byte), or null when it is not one. */
export function readCatalog(payload: Uint8Array): BmlCatalog | null {
  if (payload.length < 2 || payload[0] !== CATALOG_BYTE) {
    return null
  }

  try {
    const reader = new CborReader(payload.subarray(1))
    const value = reader.read(0)

    return reader.done ? catalogOf(plain(value)) : null
  } catch {
    return null
  }
}

function isCount(value: unknown, most: number): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= most
  )
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function listOf<T>(
  value: unknown,
  each: (item: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const items = value.map(each)

  return items.every((item) => item !== null) ? (items as T[]) : null
}

function resourceOf(value: unknown): CatalogResource | null {
  const resource = recordOf(value)

  return resource &&
    typeof resource.path === 'string' &&
    typeof resource.type === 'string'
    ? { path: resource.path, type: resource.type }
    : null
}

function catalogModuleOf(value: unknown): CatalogModule | null {
  const entry = recordOf(value)
  const resources = entry && listOf(entry.resources, resourceOf)

  if (
    !entry ||
    !resources ||
    !isCount(entry.id, 0xffff) ||
    !isCount(entry.version, 0xff) ||
    !isCount(entry.size, 2 ** 32 - 1)
  ) {
    return null
  }

  return {
    id: entry.id,
    version: entry.version,
    size: entry.size,
    resources,
  }
}

function carouselOf(value: unknown): CatalogCarousel | null {
  const carousel = recordOf(value)
  const modules = carousel && listOf(carousel.modules, catalogModuleOf)

  if (
    !carousel ||
    !modules ||
    !isCount(carousel.tag, 0xff) ||
    !isCount(carousel.downloadId, 2 ** 32 - 1)
  ) {
    return null
  }

  return { tag: carousel.tag, downloadId: carousel.downloadId, modules }
}

/** The catalog a decoded value or a message carries, or null when its shape is not one. Keys it does not know are left out. */
export function catalogOf(value: unknown): BmlCatalog | null {
  const catalog = recordOf(value)
  const carousels = catalog && listOf(catalog.carousels, carouselOf)

  if (
    !catalog ||
    !carousels ||
    !isCount(catalog.service, 0xffff) ||
    !isCount(catalog.entryTag, 0xff) ||
    typeof catalog.autoStart !== 'boolean' ||
    typeof catalog.startup !== 'string'
  ) {
    return null
  }

  return {
    service: catalog.service,
    entryTag: catalog.entryTag,
    autoStart: catalog.autoStart,
    startup: catalog.startup,
    carousels,
  }
}

class CborWriter {
  private readonly parts: number[] = []

  private readonly text = new TextEncoder()

  head(major: number, length: number): this {
    const top = major << 5

    if (length < 24) {
      this.parts.push(top | length)
    } else if (length <= 0xff) {
      this.parts.push(top | 24, length)
    } else if (length <= 0xffff) {
      this.parts.push(top | 25, length >> 8, length & 0xff)
    } else {
      this.parts.push(
        top | 26,
        (length >>> 24) & 0xff,
        (length >>> 16) & 0xff,
        (length >>> 8) & 0xff,
        length & 0xff,
      )
    }

    return this
  }

  string(value: string): this {
    const bytes = this.text.encode(value)

    this.head(3, bytes.length)
    this.parts.push(...bytes)

    return this
  }

  value(value: unknown): this {
    if (typeof value === 'number') {
      return this.head(0, value)
    }

    if (typeof value === 'string') {
      return this.string(value)
    }

    if (typeof value === 'boolean') {
      this.parts.push(value ? 0xf5 : 0xf4)

      return this
    }

    if (Array.isArray(value)) {
      this.head(4, value.length)
      value.forEach((item) => this.value(item))

      return this
    }

    const entries = Object.entries(value as Record<string, unknown>)

    this.head(5, entries.length)
    entries.forEach(([key, item]) => this.string(key).value(item))

    return this
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.parts)
  }
}

/** Writes a catalog the way the side channel carries it. */
export function catalogPayload(catalog: BmlCatalog): Uint8Array {
  const body = new CborWriter().value(catalog).bytes()
  const payload = new Uint8Array(body.length + 1)

  payload[0] = CATALOG_BYTE
  payload.set(body, 1)

  return payload
}
