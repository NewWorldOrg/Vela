import { wordFor } from '@/lib/not-yet-in-this-build'
import type { components } from '@/repository/client/schema'

export type SoundTrack = components['schemas']['SoundTrack']

type AudioMode = components['schemas']['AudioMode']

const SOUND_LABEL: Record<SoundTrack, string> = {
  main: '主音声',
  secondary: '副音声',
  third: '第2音声',
}

export const EVERY_SOUND: readonly SoundTrack[] = Object.keys(
  SOUND_LABEL,
) as SoundTrack[]

export const MAIN_SOUND: SoundTrack = 'main'

const MAIN_AND_SECONDARY: readonly SoundTrack[] = ['main', 'secondary']

export function soundsAnnounced(count: number): readonly SoundTrack[] {
  return MAIN_AND_SECONDARY.slice(0, Math.max(0, count))
}

export function splitsDualMono(count: number, audio: AudioMode): boolean {
  return count >= 1 && audio === 'dualMono'
}

export function soundsOnAir(
  count: number,
  audio: AudioMode,
): readonly SoundTrack[] {
  if (!splitsDualMono(count, audio)) {
    return soundsAnnounced(count)
  }

  return count === 1 ? MAIN_AND_SECONDARY : EVERY_SOUND
}

export function soundLabel(track: SoundTrack): string {
  return wordFor(SOUND_LABEL, track)
}
