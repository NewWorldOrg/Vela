import { writtenTarget, type AppRelay } from '@/lib/hybridcast/relay'

export const STATION_LOCATION = '__hcLocation'

export interface StationNavigation {
  relay: AppRelay
  station(): URL
  inside(address: string): boolean
  go(target: URL, how: 'assign' | 'replace'): void
  hash(hash: string): void
  reload(): void
  leave(to: URL): void
}

const WEB = new Set(['http:', 'https:'])

function withoutHash(url: URL): string {
  return url.href.split('#')[0]
}

export function navigateTo(
  nav: StationNavigation,
  written: string | URL,
  how: 'assign' | 'replace',
): void {
  const target = writtenTarget(written, nav.relay, nav.station())

  if (!target || !WEB.has(target.protocol)) {
    return
  }

  if (!nav.inside(target.href)) {
    nav.leave(target)

    return
  }

  if (
    withoutHash(target) === withoutHash(nav.station()) &&
    String(written).includes('#')
  ) {
    nav.hash(target.hash)

    return
  }

  nav.go(target, how)
}

type Part = 'protocol' | 'host' | 'hostname' | 'port' | 'pathname' | 'search'

const PARTS: Part[] = [
  'protocol',
  'host',
  'hostname',
  'port',
  'pathname',
  'search',
]

export function stationLocation(nav: StationNavigation): Location {
  const location: Record<string, unknown> = {
    assign: (address: string | URL) => navigateTo(nav, address, 'assign'),
    replace: (address: string | URL) => navigateTo(nav, address, 'replace'),
    reload: () => nav.reload(),
    toString: () => nav.station().href,
  }

  Object.defineProperty(location, 'href', {
    enumerable: true,
    get: () => nav.station().href,
    set: (address: unknown) => navigateTo(nav, String(address), 'assign'),
  })
  Object.defineProperty(location, 'origin', {
    enumerable: true,
    get: () => nav.station().origin,
  })
  Object.defineProperty(location, 'hash', {
    enumerable: true,
    get: () => nav.station().hash,
    set: (hash: unknown) => {
      const text = String(hash)

      nav.hash(text.startsWith('#') ? text : `#${text}`)
    },
  })
  PARTS.forEach((part) =>
    Object.defineProperty(location, part, {
      enumerable: true,
      get: () => nav.station()[part],
      set: (value: unknown) => {
        const changed = new URL(nav.station().href)

        changed[part] = String(value)
        navigateTo(nav, changed, 'assign')
      },
    }),
  )

  return location as unknown as Location
}
