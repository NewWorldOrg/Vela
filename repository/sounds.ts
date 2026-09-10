import { wordFor } from '@/lib/not-yet-in-this-build'
import type { components } from '@/repository/client/schema'

export type SoundTrack = components['schemas']['SoundTrack']

const SOUND_LABEL: Record<SoundTrack, string> = {
  main: '主音声',
  secondary: '副音声',
}

export const BOTH_SOUNDS: readonly SoundTrack[] = Object.keys(
  SOUND_LABEL,
) as SoundTrack[]

export const MAIN_SOUND: SoundTrack = 'main'

export function soundLabel(track: SoundTrack): string {
  return wordFor(SOUND_LABEL, track)
}
