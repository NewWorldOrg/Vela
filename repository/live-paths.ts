/**
 * Where the browser opens a live picture.
 *
 * A `WebSocket` is opened in the browser, so this path cannot come out of
 * `repository/live`: that module reaches the API and is server-only for it.
 * It sits here for the same reason `video-paths` holds the paths a `<video>`
 * asks for.
 *
 * The path is the API's own, reached same-origin, and the session travels on
 * the cookie the browser already holds. A deployment routes `/api` straight
 * to the API; there is no relay for a socket on the dev server, so one that
 * serves the screen has to route it the same way.
 */
const LIVE_WIRE_PATH = '/api/live/ws'

/**
 * The surface asked, once a wire has closed without saying why, whether the
 * session still stands. A socket that failed its handshake says nothing about
 * the status it met, so the cheapest read the API offers is asked instead.
 */
export const LIVE_SESSION_PROBE_PATH = '/api/live/profiles'

/** Where the live screen is. */
const LIVE_SCREEN_PATH = '/live'

/**
 * The live screen with this channel chosen, the way the screen itself writes
 * it: the channel in `ch`, and the broadcast type in `kind` only where it is
 * not the one the screen opens on. The URL is the state, so a way in is an
 * address the screen would have arrived at on its own.
 */
export function liveScreenHref(
  channelId: string,
  kind?: 'terrestrial' | 'bs' | 'cs110',
): string {
  const asked = new URLSearchParams({ ch: channelId })

  if (kind && kind !== 'terrestrial') {
    asked.set('kind', kind)
  }

  return `${LIVE_SCREEN_PATH}?${asked.toString()}`
}

export function liveWireHref(
  networkId: number,
  serviceId: number,
  profile: string,
): string {
  const asked = new URLSearchParams({
    network: String(networkId),
    service: String(serviceId),
    profile,
  })

  return `${LIVE_WIRE_PATH}?${asked.toString()}`
}

/**
 * Where the API counts what every running session has thrown away. Read from
 * the browser while a channel is watched, on the cookie the wire itself rides
 * on: the count moves while the picture plays, and nothing on the wire says so.
 */
export const LIVE_SESSIONS_PATH = '/api/live/sessions'
