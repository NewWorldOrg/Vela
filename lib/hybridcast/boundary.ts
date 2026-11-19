import { MOST_URL } from '@/lib/bml/paths'

export interface BoundaryPair {
  permissionBitmap: number
  managedUrls: string[]
}

export const PERMISSION_BIT = {
  broadcastVideo: 12,
  overTheVideo: 11,
  eventInformation: 10,
  persistentMemory: 9,
  boundaryExtension: 8,
  deviceIdentifier: 7,
  vod: 6,
  receiver: 5,
} as const

export type Permission = keyof typeof PERMISSION_BIT

export const EVERYTHING = 0x1fff

const BY_BIT = 0b001

export const MOST_PAIRS = 64

export const MOST_MANAGED_URLS = 64

export function permits(bitmap: number, permission: Permission): boolean {
  const upper = bitmap >>> 13
  const lower = bitmap & EVERYTHING

  if (upper === 0) {
    return lower === EVERYTHING
  }

  return upper === BY_BIT && (lower & (1 << PERMISSION_BIT[permission])) !== 0
}

interface Managed {
  scheme: string
  host: string
  port: string
  path: string
}

function managedOf(written: string): Managed | null {
  try {
    const url = new URL(written)

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? {
          scheme: url.protocol,
          host: url.hostname.toLowerCase(),
          port: url.port,
          path: url.pathname === '/' ? '' : url.pathname,
        }
      : null
  } catch {
    return null
  }
}

function narrowness(managed: Managed, url: URL): number {
  const host = url.hostname.toLowerCase()
  const onTheHost = host === managed.host || host.endsWith(`.${managed.host}`)

  if (
    url.protocol !== managed.scheme ||
    url.port !== managed.port ||
    !onTheHost ||
    !url.pathname.startsWith(managed.path)
  ) {
    return -1
  }

  return managed.host.split('.').length * MOST_URL + managed.path.length
}

const EVERY_ADDRESS = 0

function pairNarrowness(pair: BoundaryPair, url: URL): number {
  if (pair.managedUrls.length === 0) {
    return EVERY_ADDRESS
  }

  return pair.managedUrls.reduce((most, written) => {
    const managed = managedOf(written)
    const applies = managed ? narrowness(managed, url) : -1

    return applies < 0 ? most : Math.max(most, applies + 1)
  }, -1)
}

export function bitmapAt(
  boundary: readonly BoundaryPair[],
  address: string,
): number | null {
  let url: URL

  try {
    url = new URL(address)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null
  }

  if (boundary.length === 0) {
    return EVERYTHING
  }

  let found: BoundaryPair | null = null
  let narrowest = -1

  boundary.forEach((pair) => {
    const applies = pairNarrowness(pair, url)

    if (applies >= 0 && applies >= narrowest) {
      found = pair
      narrowest = applies
    }
  })

  return (found as BoundaryPair | null)?.permissionBitmap ?? null
}

export function permittedEverywhere(
  boundary: readonly BoundaryPair[],
  permission: Permission,
): boolean {
  return boundary.every((pair) => permits(pair.permissionBitmap, permission))
}

export function insideBoundary(
  boundary: readonly BoundaryPair[],
  address: string,
): boolean {
  return bitmapAt(boundary, address) !== null
}

function pairOf(value: unknown): BoundaryPair | null {
  const pair = value as Partial<BoundaryPair> | null

  return typeof pair === 'object' &&
    pair !== null &&
    Number.isInteger(pair.permissionBitmap) &&
    (pair.permissionBitmap as number) >= 0 &&
    (pair.permissionBitmap as number) <= 0xffff &&
    Array.isArray(pair.managedUrls) &&
    pair.managedUrls.length <= MOST_MANAGED_URLS &&
    pair.managedUrls.every(
      (url) => typeof url === 'string' && url.length <= MOST_URL,
    )
    ? {
        permissionBitmap: pair.permissionBitmap as number,
        managedUrls: [...pair.managedUrls],
      }
    : null
}

export function boundaryOf(value: unknown): BoundaryPair[] | null {
  if (!Array.isArray(value) || value.length > MOST_PAIRS) {
    return null
  }

  const pairs = value.map(pairOf)

  return pairs.every((pair) => pair !== null) ? (pairs as BoundaryPair[]) : null
}

export function receiverIdHandedOver<Id>(
  boundary: readonly BoundaryPair[],
  id: Id | null,
): Id | null {
  return permittedEverywhere(boundary, 'deviceIdentifier') ? id : null
}
