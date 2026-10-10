export const RESOURCE_KIND = {
  bml: 1,
  css: 2,
  script: 3,
  jpeg: 4,
  png: 5,
  binary: 6,
  undecoded: 7,
} as const

export type ResourceKind = keyof typeof RESOURCE_KIND

export const RESOURCE_KINDS = Object.keys(RESOURCE_KIND) as ResourceKind[]

export interface BmlResource {
  path: string
  kind: ResourceKind
  body: Uint8Array
}

export interface BmlModule {
  tag: number
  id: number
  version: number
  resources: BmlResource[]
}

export const MODULE_BYTE = 0x02

const MODULE_HEAD = 5

const RESOURCE_HEAD = 7

const MOST_PATH_BYTES = 1024

const utf8 = new TextDecoder('utf-8', { fatal: true })

function kindOf(code: number): ResourceKind | undefined {
  return RESOURCE_KINDS.find((kind) => RESOURCE_KIND[kind] === code)
}

function pathOf(bytes: Uint8Array): string | null {
  try {
    return utf8.decode(bytes)
  } catch {
    return null
  }
}

/** Reads the module payload of the side channel and the recording's module route, or null when any part of it is malformed. */
export function readModule(payload: Uint8Array): BmlModule | null {
  if (payload.length < MODULE_HEAD || payload[0] !== MODULE_BYTE) {
    return null
  }

  const view = new DataView(
    payload.buffer,
    payload.byteOffset,
    payload.byteLength,
  )
  const resources: BmlResource[] = []
  let at = MODULE_HEAD

  while (at < payload.length) {
    const read = readResource(payload, view, at)

    if (!read) {
      return null
    }

    resources.push(read.resource)
    at = read.next
  }

  return {
    tag: payload[1],
    id: view.getUint16(2),
    version: payload[4],
    resources,
  }
}

function readResource(
  payload: Uint8Array,
  view: DataView,
  at: number,
): { resource: BmlResource; next: number } | null {
  if (at + 2 > payload.length) {
    return null
  }

  const pathLength = view.getUint16(at)
  const kindAt = at + 2 + pathLength

  if (
    pathLength === 0 ||
    pathLength > MOST_PATH_BYTES ||
    kindAt + 5 > payload.length
  ) {
    return null
  }

  const path = pathOf(payload.subarray(at + 2, kindAt))
  const kind = kindOf(payload[kindAt])
  const length = view.getUint32(kindAt + 1)
  const bodyAt = kindAt + 5

  if (path === null || kind === undefined || bodyAt + length > payload.length) {
    return null
  }

  return {
    resource: { path, kind, body: payload.subarray(bodyAt, bodyAt + length) },
    next: bodyAt + length,
  }
}

/** Writes a module the way the side channel carries it. */
export function modulePayload(module: BmlModule): Uint8Array {
  const encoder = new TextEncoder()
  const paths = module.resources.map((resource) =>
    encoder.encode(resource.path),
  )
  const length = module.resources.reduce(
    (sum, resource, index) =>
      sum + RESOURCE_HEAD + paths[index].length + resource.body.length,
    MODULE_HEAD,
  )
  const payload = new Uint8Array(length)
  const view = new DataView(payload.buffer)

  payload[0] = MODULE_BYTE
  payload[1] = module.tag
  view.setUint16(2, module.id)
  payload[4] = module.version

  let at = MODULE_HEAD

  module.resources.forEach((resource, index) => {
    view.setUint16(at, paths[index].length)
    payload.set(paths[index], at + 2)
    at += 2 + paths[index].length
    payload[at] = RESOURCE_KIND[resource.kind]
    view.setUint32(at + 1, resource.body.length)
    payload.set(resource.body, at + 5)
    at += 5 + resource.body.length
  })

  return payload
}

function isByte(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 0xff
  )
}

function isResource(value: unknown): value is BmlResource {
  const resource = value as Partial<BmlResource> | null

  return (
    typeof resource === 'object' &&
    resource !== null &&
    typeof resource.path === 'string' &&
    resource.path.length > 0 &&
    resource.path.length <= MOST_PATH_BYTES &&
    typeof resource.kind === 'string' &&
    RESOURCE_KINDS.includes(resource.kind) &&
    resource.body instanceof Uint8Array
  )
}

/** The module a message carries, or null when it is not one. */
export function moduleOf(value: unknown): BmlModule | null {
  const carried = value as Partial<BmlModule> | null

  if (
    typeof carried !== 'object' ||
    carried === null ||
    !isByte(carried.tag) ||
    !Number.isInteger(carried.id) ||
    (carried.id as number) < 0 ||
    (carried.id as number) > 0xffff ||
    !isByte(carried.version) ||
    !Array.isArray(carried.resources) ||
    !carried.resources.every(isResource)
  ) {
    return null
  }

  return {
    tag: carried.tag,
    id: carried.id as number,
    version: carried.version,
    resources: carried.resources,
  }
}
