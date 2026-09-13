import { wordFor } from '@/lib/not-yet-in-this-build'
import type { components } from '@/repository/client/schema'
import { soundsAnnounced } from '@/repository/sounds'

export type AudioMode = components['schemas']['AudioMode']

export type VideoMode = components['schemas']['VideoMode']

const NOTHING_TO_SAY = ''

const AUDIO_SAYINGS: Record<AudioMode, string> = {
  undetermined: NOTHING_TO_SAY,
  mono: 'モノラル',
  stereo: 'ステレオ',
  dualMono: '二か国語',
  surround: '5.1ch',
}

const VIDEO_SAYINGS: Record<VideoMode, string> = {
  undetermined: NOTHING_TO_SAY,
  progressive180: '180p',
  progressive240: '240p',
  interlaced480: '480i',
  progressive480: '480p',
  progressive720: '720p',
  interlaced1080: '1080i',
  progressive1080: '1080p',
  progressive2160: '2160p',
  progressive4320: '4320p',
}

const A_SECOND_SOUND = '副音声あり'

export function audioSaying(audio: AudioMode | undefined): string | undefined {
  return audio === undefined
    ? undefined
    : wordFor(AUDIO_SAYINGS, audio) || undefined
}

export function videoSaying(video: VideoMode | undefined): string | undefined {
  return video === undefined
    ? undefined
    : wordFor(VIDEO_SAYINGS, video) || undefined
}

export function secondSoundSaying(
  sounds: number | undefined,
): string | undefined {
  return sounds !== undefined && soundsAnnounced(sounds).length > 1
    ? A_SECOND_SOUND
    : undefined
}
