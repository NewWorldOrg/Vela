import type { operations } from '@/repository/client/schema'
import type { SoundTrack } from '@/repository/sounds'

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

export interface PlaybackAsking {
  fell: string
}

export const WHEN_CARRYING_A_SOUND: PlaybackAsking = {
  fell: '再生を開始できませんでした',
}

const REFUSAL_SAYINGS: [RegExp, string][] = [
  [
    /has no secondary sound/i,
    'この録画のもとになった放送は音声を 1 つしか運んでいないため、副音声を再生できません。',
  ],
  [
    /there is no sound to choose/i,
    'この録画は成果物をそのまま渡すため、音声を選べません。',
  ],
  [
    /with the main sound the broadcast carried or with its secondary sound/i,
    '再生できるのは主音声か副音声のどちらかです。',
  ],
  [
    /sounds this recording carries could not be read/i,
    'この録画が運んでいる音声を読み取れなかったため、副音声を再生できません。',
  ],
]

export function whyItRefused(
  asking: PlaybackAsking,
  status: number,
  said: string | undefined,
): string {
  const saying = REFUSAL_SAYINGS.find(([reads]) => reads.test(said ?? ''))

  if (saying) {
    return saying[1]
  }

  return `${asking.fell}(${status})。`
}

function whole(seconds: number) {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
}

export function videoPictureHref(
  id: string,
  from = 0,
  profile?: PlaybackProfile,
  sound?: SoundTrack,
) {
  const asked = new URLSearchParams({ from: String(whole(from)) })

  if (profile) {
    asked.set('profile', profile)
  }

  if (sound) {
    asked.set('sound', sound)
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
