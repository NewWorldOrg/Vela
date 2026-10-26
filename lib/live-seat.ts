import { MAIN_SOUND, type SoundTrack } from '@/repository/sounds'

const SPLIT_DUAL_MONO = 'dualMono'

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
  splitsDualMono: boolean,
  format?: string,
): string | null {
  if (
    networkId === undefined ||
    serviceId === undefined ||
    profile === undefined
  ) {
    return null
  }

  const seat = `${networkId}:${serviceId}:${profile}:${sound}`
  const split = splitsDualMono ? `${seat}:${SPLIT_DUAL_MONO}` : seat

  return format === undefined ? split : `${split}:${format}`
}

export function wireKey(seat: string | null, attempt: number): string | null {
  return seat === null ? null : `${seat}:${attempt}`
}
