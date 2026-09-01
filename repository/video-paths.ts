/**
 * Where the browser asks for the pictures of a recording.
 *
 * A `<video>` and an `<img>` are drawn in the browser, so these paths cannot
 * come out of `repository/videos`: that module reaches the API and is
 * server-only for it. They sit here for the same reason `events` holds the
 * path its subscriber needs.
 *
 * The paths are the API's own, reached same-origin. A deployment routes
 * `/api` straight to the API and answers them there; the dev server carries
 * them through the relay in `app/api/videos`.
 */
const VIDEOS = '/api/videos'

function whole(seconds: number) {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
}

/**
 * The picture itself, starting the given number of seconds into the recording.
 *
 * A recording transcoded as it plays is handed over with `Accept-Ranges: none`,
 * so there is no byte range to seek by and the second asked for is what decides
 * where the picture starts. Another second is another request, and another
 * transcoder behind it.
 */
export function videoPictureHref(id: string, from = 0) {
  return `${VIDEOS}/${encodeURIComponent(id)}/play?from=${whole(from)}`
}

/** The picture drawn of the recording once it had ended. */
export function videoThumbnailHref(id: string) {
  return `${VIDEOS}/${encodeURIComponent(id)}/thumbnail`
}

/** One frame taken out of the recording at the second asked for. */
export function videoFrameHref(id: string, at: number) {
  return `${VIDEOS}/${encodeURIComponent(id)}/scrub?at=${whole(at)}`
}

/**
 * The recording served by the byte range. This is the external player's path
 * and not one a browser plays through: it is reached with a ticket in the URL
 * and answers a byte range, which is what a player outside the page needs.
 */
export function videoFileHref(id: string) {
  return `${VIDEOS}/${encodeURIComponent(id)}`
}
