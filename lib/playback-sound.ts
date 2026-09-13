import { MAIN_SOUND, type SoundTrack } from '@/repository/sounds'
import { THE_SOUNDS_COULD_NOT_BE_READ } from '@/repository/video-paths'
import type { PlaybackPlan, PlaybackRead } from '@/repository/videos'

export interface SoundBecame {
  plan: PlaybackPlan
  sound: SoundTrack
  said?: string
}

export interface WhereItStarts {
  from: number
  land: number | null
}

export function soundToAsk(
  sounds: readonly SoundTrack[],
  sound: SoundTrack,
): SoundTrack | undefined {
  return sounds.length > 1 ? sound : undefined
}

export function whatTheSoundBecomes(
  standing: PlaybackPlan,
  asked: SoundTrack,
  answer: PlaybackRead,
): SoundBecame {
  if (answer.state !== 'planned') {
    return {
      plan: standing,
      sound: MAIN_SOUND,
      said: THE_SOUNDS_COULD_NOT_BE_READ,
    }
  }

  if (asked !== MAIN_SOUND && !answer.plan.sounds.includes(asked)) {
    return {
      plan: answer.plan,
      sound: MAIN_SOUND,
      said: THE_SOUNDS_COULD_NOT_BE_READ,
    }
  }

  return { plan: answer.plan, sound: asked }
}

export function whereItStarts(
  plan: PlaybackPlan,
  second: number,
): WhereItStarts {
  return plan.seeking === 'byRange'
    ? { from: 0, land: second > 0 ? second : null }
    : { from: second, land: null }
}
