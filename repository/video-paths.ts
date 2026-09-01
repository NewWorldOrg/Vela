import type { operations } from '@/repository/client/schema'

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

/**
 * The profiles a picture made as it plays can be encoded in. The API takes one
 * of these and refuses anything else, so the control that chooses one is drawn
 * from this list rather than from steps of its own: a step the API has no name
 * for is a control that cannot do what it says.
 */
export type PlaybackProfile = NonNullable<
  NonNullable<operations['playVideo']['parameters']['query']>['profile']
>

export const PLAYBACK_PROFILES: readonly PlaybackProfile[] = [
  '1080p60',
  '1080p30',
  '720p60',
  '720p30',
]

/** The profile a picture is made in when none is asked for. */
export const PLAYBACK_PROFILE_UNASKED: PlaybackProfile = '720p30'

/**
 * The header the API names its refusal in when it will not start a picture.
 * The status alone does not separate the machine being full from a transcoder
 * that would not run — both are 503 — and those are not the same thing to do
 * next.
 */
export const PLAYBACK_REFUSAL_HEADER = 'carina-playback-refusal'

/** The refusal that means the machine is already transcoding all it will. */
export const PLAYBACK_REFUSAL_TOO_MANY = 'tooManyAlready'

function whole(seconds: number) {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
}

/**
 * The picture itself, starting the given number of seconds into the recording
 * and encoded in the profile asked for.
 *
 * A recording transcoded as it plays is handed over with `Accept-Ranges: none`,
 * so there is no byte range to seek by and the second asked for is what decides
 * where the picture starts. Another second is another request, and another
 * transcoder behind it. A profile is the same: the picture is built in it, so
 * choosing one starts the stream again.
 */
export function videoPictureHref(
  id: string,
  from = 0,
  profile?: PlaybackProfile,
) {
  const asked = new URLSearchParams({ from: String(whole(from)) })

  if (profile) {
    asked.set('profile', profile)
  }

  return `${VIDEOS}/${encodeURIComponent(id)}/play?${asked.toString()}`
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
