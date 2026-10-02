import { liveStreamHref } from '@/repository/live-paths'
import type { TakeLiveTicket } from '@/repository/live'
import { videoFileHref } from '@/repository/video-paths'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import {
  BOTH_SOURCES,
  sourceLabel,
  THE_ARTEFACT,
  THE_RECORDING_ITSELF,
  type PlaybackSource,
} from '@/repository/playback-sources'
import { formatBytes } from '@/lib/format'

export interface Handover {
  path: string
  user: string
  take: () => Promise<TicketWrite>
}

export function ticketedHref(
  handover: Handover,
  base: string,
  inTheClear: string,
): string {
  const url = new URL(handover.path, base)

  url.username = handover.user
  url.password = inTheClear

  return url.toString()
}

export interface HandoverChoice {
  source: PlaybackSource
  label: string
  size?: string
  handover: Handover
}

export function recordingHandover(
  id: string,
  take: (id: string) => Promise<TicketWrite>,
  source?: PlaybackSource,
): Handover {
  return {
    path: videoFileHref(id, source),
    user: 'ticket',
    take: () => take(id),
  }
}

export function recordingHandoverChoices(
  id: string,
  take: (id: string) => Promise<TicketWrite>,
  plan: Pick<PlaybackPlan, 'source' | 'alternative'>,
  recordedBytes: number | null | undefined,
): HandoverChoice[] {
  return BOTH_SOURCES.filter(
    (one) => one === plan.source || one === plan.alternative,
  ).map((source) => ({
    source,
    label: sourceLabel(source),
    size:
      source === THE_RECORDING_ITSELF && recordedBytes != null
        ? formatBytes(recordedBytes)
        : undefined,
    handover: recordingHandover(id, take, source),
  }))
}

export function liveHandover(
  networkId: number,
  serviceId: number,
  take: TakeLiveTicket,
): Handover {
  return {
    path: liveStreamHref(networkId, serviceId),
    user: '',
    take: () => take(networkId, serviceId),
  }
}

export function airPlayCanBeHanded(
  plan: Pick<PlaybackPlan, 'source' | 'alternative'>,
): boolean {
  return plan.source === THE_ARTEFACT || plan.alternative === THE_ARTEFACT
}

export type PlayerApp = 'vlc' | 'infuse'

export interface Browsing {
  userAgent: string
  maxTouchPoints: number
}

const THE_APPS: Record<PlayerApp, { says: string; opens: string }> = {
  vlc: {
    says: 'VLC で開く',
    opens: 'vlc-x-callback://x-callback-url/stream?url=',
  },
  infuse: {
    says: 'Infuse で開く',
    opens: 'infuse://x-callback-url/play?url=',
  },
}

const IN_THE_HAND = /\b(iPhone|iPad|iPod)\b/

const A_MAC = /\bMacintosh\b/

const ON_A_TOUCH_DEVICE_OF_APPLE: readonly PlayerApp[] = ['vlc', 'infuse']

const ON_A_MAC: readonly PlayerApp[] = ['infuse']

const NOWHERE: readonly PlayerApp[] = []

/** The player apps a browser can hand a URL to, in the order they are offered. */
export function playerAppsOn({
  userAgent,
  maxTouchPoints,
}: Browsing): readonly PlayerApp[] {
  if (IN_THE_HAND.test(userAgent)) {
    return ON_A_TOUCH_DEVICE_OF_APPLE
  }

  if (!A_MAC.test(userAgent)) {
    return NOWHERE
  }

  return maxTouchPoints > 1 ? ON_A_TOUCH_DEVICE_OF_APPLE : ON_A_MAC
}

export const NO_PLAYER_APPS = NOWHERE

export function appSays(app: PlayerApp): string {
  return THE_APPS[app].says
}

export function appHref(app: PlayerApp, url: string): string {
  return `${THE_APPS[app].opens}${encodeURIComponent(url)}`
}
