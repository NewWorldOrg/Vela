import { BOTH_SOUNDS, MAIN_SOUND, type SoundTrack } from '@/repository/sounds'

export interface SoundChoice {
  of: string
  track: SoundTrack
}

export function soundBeingHeard(
  choice: SoundChoice | null,
  channelId: string | undefined,
): SoundTrack {
  return choice !== null && choice.of === channelId ? choice.track : MAIN_SOUND
}

export function soundsToOffer(
  announced: readonly SoundTrack[],
  heard: SoundTrack,
): readonly SoundTrack[] {
  return heard === MAIN_SOUND ? announced : BOTH_SOUNDS
}

export function liveSeat(
  networkId: number | undefined,
  serviceId: number | undefined,
  profile: string | undefined,
  sound: SoundTrack,
): string | null {
  if (
    networkId === undefined ||
    serviceId === undefined ||
    profile === undefined
  ) {
    return null
  }

  return `${networkId}:${serviceId}:${profile}:${sound}`
}

export function wireKey(seat: string | null, attempt: number): string | null {
  return seat === null ? null : `${seat}:${attempt}`
}
