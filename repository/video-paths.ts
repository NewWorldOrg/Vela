import type { operations } from '@/repository/client/schema'

const VIDEOS = '/api/videos'

export type PlaybackProfile = NonNullable<
  NonNullable<operations['playVideo']['parameters']['query']>['profile']
>

export const PLAYBACK_PROFILES: readonly PlaybackProfile[] = [
  '1080p60',
  '1080p30',
  '720p60',
  '720p30',
]

export const PLAYBACK_REFUSAL_HEADER = 'carina-playback-refusal'

export const PLAYBACK_REFUSAL_TOO_MANY = 'tooManyAlready'

function whole(seconds: number) {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
}

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

export function videoThumbnailHref(id: string) {
  return `${VIDEOS}/${encodeURIComponent(id)}/thumbnail`
}

export function videoFrameHref(id: string, at: number) {
  return `${VIDEOS}/${encodeURIComponent(id)}/scrub?at=${whole(at)}`
}

export function videoFileHref(id: string) {
  return `${VIDEOS}/${encodeURIComponent(id)}`
}
