import { liveStreamHref } from '@/repository/live-paths'
import type { TakeLiveTicket } from '@/repository/live'
import { videoFileHref } from '@/repository/video-paths'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import {
  BOTH_SOURCES,
  sourceLabel,
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
