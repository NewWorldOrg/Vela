import { MAIN_SOUND, type SoundTrack } from '@/repository/sounds'

export interface SoundChoice {
  of: string
  track: SoundTrack
}

export function soundChoiceStillStands(
  choice: SoundChoice | null,
  channelId: string | undefined,
  announced: readonly SoundTrack[],
): SoundChoice | null {
  if (
    choice === null ||
    choice.of !== channelId ||
    !announced.includes(choice.track)
  ) {
    return null
  }

  return choice
}

export function soundBeingHeard(choice: SoundChoice | null): SoundTrack {
  return choice?.track ?? MAIN_SOUND
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
