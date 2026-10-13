import { MOST_URL } from '@/lib/bml/paths'

/** One pair of an application's boundary: the sixteen bits of what it is permitted, and the addresses the pair applies to, none meaning every address. */
export interface BoundaryPair {
  permissionBitmap: number
  managedUrls: string[]
}

/** The bits of the permission bitmap and what each lets an application do (IPTVFJ STD-0013 table 5.1). */
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

/** A bitmap whose upper three bits are 000 permits everything when its lower thirteen are all set, and nothing otherwise. */
export const EVERYTHING = 0x1fff

const BY_BIT = 0b001

export const MOST_PAIRS = 64

export const MOST_MANAGED_URLS = 64

/** Whether a bitmap permits what a bit stands for (IPTVFJ STD-0013 5.1.1): bit by bit under the upper three bits 001, all or nothing under 000, and nothing under any other. */
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

/** How narrow a managed URL is, where it applies: a deeper host first, then a longer path. -1 where it does not. */
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

/** How narrowly a pair applies to a URL: a pair with no managed URL applies to every one, least narrowly; one with managed URLs by its narrowest that applies, or not at all. */
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

/** The permission bitmap at a URL: the pair whose managed URL applies most narrowly, the later of two as narrow (IPTVFJ STD-0010 7.6.2, appendix A.4.1.6). With no boundary at all, everything is permitted everywhere. Null outside the boundary, and for what is not an `http:` or `https:` URL. */
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

/** Whether a URL is inside the boundary. */
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

/** An application's boundary as Carina answers it, or null when the value has another shape. */
export function boundaryOf(value: unknown): BoundaryPair[] | null {
  if (!Array.isArray(value) || value.length > MOST_PAIRS) {
    return null
  }

  const pairs = value.map(pairOf)

  return pairs.every((pair) => pair !== null) ? (pairs as BoundaryPair[]) : null
}
