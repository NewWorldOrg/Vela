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

/** The profile chosen until another is asked for: the API's own default. */
export const LIVE_PROFILE_UNASKED = '720p30'

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
