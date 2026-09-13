import type { SoundTrack } from '@/repository/sounds'

const LIVE_WIRE_PATH = '/api/live/ws'

export const LIVE_SESSION_PROBE_PATH = '/api/live/profiles'

const LIVE_SCREEN_PATH = '/live'

export function liveScreenHref(
  channelId: string,
  kind?: 'terrestrial' | 'bs' | 'cs110',
): string {
  const asked = new URLSearchParams({ ch: channelId })

  if (kind && kind !== 'terrestrial') {
    asked.set('kind', kind)
  }

  return `${LIVE_SCREEN_PATH}?${asked.toString()}`
}

export function liveWireHref(
  networkId: number,
  serviceId: number,
  profile: string,
  sound: SoundTrack,
): string {
  const asked = new URLSearchParams({
    network: String(networkId),
    service: String(serviceId),
    profile,
    sound,
  })

  return `${LIVE_WIRE_PATH}?${asked.toString()}`
}

export const LIVE_SESSIONS_PATH = '/api/live/sessions'

const LIVE_CHANNELS_PATH = '/api/live/channels'

const EVERY_CHANNEL = 200

export function liveChannelsHref(): string {
  return `${LIVE_CHANNELS_PATH}?perPage=${EVERY_CHANNEL}`
}
