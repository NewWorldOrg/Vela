import { liveStreamHref } from '@/repository/live-paths'
import type { TakeLiveTicket } from '@/repository/live'
import { videoFileHref } from '@/repository/video-paths'
import type { TicketWrite } from '@/repository/videos'

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

export function recordingHandover(
  id: string,
  take: (id: string) => Promise<TicketWrite>,
): Handover {
  return { path: videoFileHref(id), user: 'ticket', take: () => take(id) }
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
