import type { BrowserDecoding } from '@/lib/browser-decodes'
import { couldNot } from '@/lib/try-again'
import type { operations } from '@/repository/client/schema'
import type { PlaybackSource } from '@/repository/playback-sources'
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

export const THE_SOUNDS_COULD_NOT_BE_READ =
  'この録画が運んでいる音声を読み取れなかったため、選んだ音声を再生できません。'

const REFUSAL_SAYINGS: [RegExp, string][] = [
  [
    /did not carry the sound asked for/i,
    'この録画のもとになった放送は選んだ音声を運んでいないため、再生できません。',
  ],
  [
    /there is no sound to choose/i,
    'この録画は成果物をそのまま渡すため、音声を選べません。',
  ],
  [
    /played with one of the sounds/i,
    '再生できるのは主音声・副音声・第2音声のどれかです。',
  ],
  [
    /sounds this recording carries could not be read/i,
    THE_SOUNDS_COULD_NOT_BE_READ,
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

  return couldNot(asking.fell)
}

function whole(seconds: number) {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
}

export function videoPictureHref(
  id: string,
  from = 0,
  profile?: PlaybackProfile,
  sound?: SoundTrack,
  source?: PlaybackSource,
  decodes: readonly BrowserDecoding[] = [],
) {
  const asked = new URLSearchParams({ from: String(whole(from)) })

  if (profile) {
    asked.set('profile', profile)
  }

  if (sound) {
    asked.set('sound', sound)
  }

  if (source) {
    asked.set('source', source)
  }

  for (const one of decodes) {
    asked.append('decodes', one)
  }

  return `${VIDEOS}/${encodeURIComponent(id)}/play?${asked.toString()}`
}

export function videoThumbnailHref(id: string) {
  return `${VIDEOS}/${encodeURIComponent(id)}/thumbnail`
}

export function videoFrameHref(id: string, at: number) {
  return `${VIDEOS}/${encodeURIComponent(id)}/scrub?at=${whole(at)}`
}

function asked(file: string, source?: PlaybackSource) {
  return source ? `${file}?source=${source}` : file
}

export function videoFileHref(id: string, source?: PlaybackSource) {
  return asked(`${VIDEOS}/${encodeURIComponent(id)}`, source)
}

/** The recording's file with the ticket in the path and a name at the end that a player shows as the title. */
export function videoFileWithTicketHref(
  id: string,
  ticket: string,
  fileName: string,
  source?: PlaybackSource,
) {
  return asked(
    `${VIDEOS}/${encodeURIComponent(id)}/with-ticket/${encodeURIComponent(ticket)}/${encodeURIComponent(fileName)}`,
    source,
  )
}
