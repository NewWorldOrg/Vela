/** Where a Hybridcast application's frame reaches the broadcaster: Vela's origin, which the frame's documents are served from, the path its documents and resources are relayed on, and the path its WebSockets are carried on. */
export interface AppRelay {
  origin: string
  app: string
  socket: string
}

/** What becomes of an address the application asks for: relayed to the broadcaster through Carina, left to the browser (`data:`, `blob:` and the like, which name no server), or refused. */
export type Routed =
  { to: 'relay'; url: string } | { to: 'browser' } | { to: 'refused' }

const URI = 'uri'

const WEB = new Set(['http:', 'https:'])

const SOCKETS: Record<string, string> = { 'ws:': 'http:', 'wss:': 'https:' }

const BROWSER_ONLY = new Set(['data:', 'blob:', 'about:'])

function urlOf(written: string, base?: string): URL | null {
  try {
    return new URL(written, base)
  } catch {
    return null
  }
}

/** The relay's address for a broadcaster's URL, as Carina writes it into the markup: the relay's path with the URL, fragment aside, as `uri`, and the fragment after. */
export function relayedAddress(relay: string, target: URL): string {
  const fragment = target.hash
  const asked = new URL(target.href)

  asked.hash = ''

  return `${relay}?${URI}=${encodeURIComponent(asked.href)}${fragment}`
}

/** The broadcaster's URL a relay address names, or null when the address is not the relay's. */
export function relayedTarget(url: URL, relay: AppRelay): URL | null {
  if (url.origin !== relay.origin || url.pathname !== relay.app) {
    return null
  }

  const named = url.searchParams.get(URI)
  const target = named === null ? null : urlOf(named)

  if (!target || !WEB.has(target.protocol)) {
    return null
  }

  target.hash = url.hash

  return target
}

function directoryOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1)
}

/** What the application meant by an address the browser resolved against the frame's own, which is on Vela's origin: a relay address, the broadcaster's URL it names; anything else on Vela's origin, the same path on the broadcaster's server, taken beside the document when it lies beside the relay; an address elsewhere, itself. */
export function intendedTarget(
  url: URL,
  relay: AppRelay,
  documentAt: URL,
): URL {
  const relayed = relayedTarget(url, relay)

  if (relayed) {
    return relayed
  }

  if (url.origin !== relay.origin || !WEB.has(url.protocol)) {
    return url
  }

  const beside = directoryOf(relay.app)
  const path = url.pathname.startsWith(beside)
    ? `${directoryOf(documentAt.pathname)}${url.pathname.slice(beside.length)}`
    : url.pathname

  return new URL(`${path}${url.search}${url.hash}`, documentAt)
}

/** The broadcaster's URL an address the application wrote stands for: what it wrote resolved against the document's own URL on the broadcaster's server, unless it is whole, and then as the browser would have resolved it against the frame. */
export function writtenTarget(
  written: string | URL,
  relay: AppRelay,
  documentAt: URL,
): URL | null {
  const text = String(written).trim()
  const whole = urlOf(text)

  if (whole) {
    return intendedTarget(whole, relay, documentAt)
  }

  return urlOf(text, documentAt.href)
}

/** Where a request the application makes goes: through the relay when it is for an `http:` or `https:` address inside the boundary, to the browser when it names no server, and nowhere otherwise. */
export function routeRequest(
  written: string | URL,
  relay: AppRelay,
  documentAt: URL,
  inside: (address: string) => boolean,
): Routed {
  const target = writtenTarget(written, relay, documentAt)

  if (!target) {
    return { to: 'refused' }
  }

  if (BROWSER_ONLY.has(target.protocol)) {
    return { to: 'browser' }
  }

  if (!WEB.has(target.protocol) || !inside(target.href)) {
    return { to: 'refused' }
  }

  return {
    to: 'relay',
    url: `${relay.origin}${relayedAddress(relay.app, target)}`,
  }
}

/** Where a WebSocket the application opens goes: carried by the relay when its address, read as `http:` for `ws:` and `https:` for `wss:`, is inside the boundary, and nowhere otherwise. */
export function routeSocket(
  written: string | URL,
  relay: AppRelay,
  documentAt: URL,
  inside: (address: string) => boolean,
): Routed {
  const text = String(written).trim()
  const whole = urlOf(text)
  const scheme = whole ? SOCKETS[whole.protocol] : undefined
  const asWeb =
    whole && scheme ? `${scheme}${text.slice(whole.protocol.length)}` : text
  const target = writtenTarget(asWeb, relay, documentAt)

  if (!target || !WEB.has(target.protocol) || !inside(target.href)) {
    return { to: 'refused' }
  }

  const socket = new URL(target.href)

  socket.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:'
  socket.hash = ''

  const origin = relay.origin.replace(/^http/, 'ws')

  return {
    to: 'relay',
    url: `${origin}${relay.socket}?${URI}=${encodeURIComponent(socket.href)}`,
  }
}
