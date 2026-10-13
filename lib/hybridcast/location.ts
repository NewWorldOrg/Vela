/** The name the relay gives `location` in the application's scripts, and `window.location`, `document.location` and the like as a property of the window. */
export const STATION_LOCATION = '__hcLocation'

/** What the application's location stands on: the station URL the frame is on now, whether an address is inside the boundary, and how the frame goes to an address through the relay, moves within its document, reloads, or leaves for the documents. */
export interface StationNavigation {
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

/** Goes where an address the application wrote says, resolved against the station: within the document when only the fragment changes, through the relay inside the boundary, and back to the documents outside it. An address that names no server is not followed. */
export function navigateTo(
  nav: StationNavigation,
  written: string | URL,
  how: 'assign' | 'replace',
): void {
  let target: URL

  try {
    target = new URL(String(written), nav.station())
  } catch {
    return
  }

  if (!WEB.has(target.protocol)) {
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

/** The application's `location`, as a receiver's would read on the broadcaster's server: every part is the station URL's, and setting `href`, a part, `assign` and `replace` go where the station URL with that change says. Setting `hash` stays in the document. */
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
