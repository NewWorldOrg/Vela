export interface AppRelay {
  origin: string
  app: string
  socket: string
}

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

export function relayedAddress(relay: string, target: URL): string {
  const fragment = target.hash
  const asked = new URL(target.href)

  asked.hash = ''

  return `${relay}?${URI}=${encodeURIComponent(asked.href)}${fragment}`
}

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

  const onTheRelay = urlOf(text, relay.origin)
  const relayed = onTheRelay ? relayedTarget(onTheRelay, relay) : null

  return relayed ?? urlOf(text, documentAt.href)
}

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
