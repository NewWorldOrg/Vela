import type { PlaybackFormat } from '@/lib/playback-format'
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
  format?: PlaybackFormat,
): string {
  const asked = new URLSearchParams({
    network: String(networkId),
    service: String(serviceId),
    profile,
    sound,
  })

  if (format) {
    asked.set('format', format)
  }

  return `${LIVE_WIRE_PATH}?${asked.toString()}`
}

export const LIVE_SESSIONS_PATH = '/api/live/sessions'

const LIVE_CHANNELS_PATH = '/api/live/channels'

const EVERY_CHANNEL = 200

export function liveChannelsHref(): string {
  return `${LIVE_CHANNELS_PATH}?perPage=${EVERY_CHANNEL}`
}

const LIVE_STREAM_PATH = '/api/live'

/** How the live routes name a channel: its network and service. */
export function liveChannelOf(networkId: number, serviceId: number): string {
  return `${networkId}-${serviceId}`
}

export function liveStreamHref(networkId: number, serviceId: number): string {
  return `${LIVE_STREAM_PATH}/${liveChannelOf(networkId, serviceId)}/stream`
}

/** The channel with the ticket in the path and a name at the end that a player shows as the title. */
export function liveStreamWithTicketHref(
  networkId: number,
  serviceId: number,
  ticket: string,
  fileName: string,
): string {
  return `${LIVE_STREAM_PATH}/${liveChannelOf(networkId, serviceId)}/with-ticket/${encodeURIComponent(ticket)}/${encodeURIComponent(fileName)}`
}
