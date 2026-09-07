import { cache } from 'react'

import { unaskedIn } from '@/lib/live-profiles'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { fetchLiveProfiles } from '@/repository/live'
import {
  PLAYBACK_PROFILES,
  type PlaybackProfile,
} from '@/repository/video-paths'

export type PlaybackStanding = components['schemas']['PlaybackStanding']

export type PlaybackRoute = components['schemas']['PlaybackRoute']

export type PlaybackSeeking = NonNullable<
  components['schemas']['PlaybackSeeking']
>

export interface PlaybackPlan {
  standing: PlaybackStanding
  route: PlaybackRoute
  seeking?: PlaybackSeeking
  canSeek: boolean
  transcodes: boolean
  showsAsAWholeRecording: boolean
  mediaType: string
  bytes?: number
}

export type PlaybackRefusal =
  'stillRecording' | 'nothingToPlay' | 'outOfReach' | 'unreadable'

export type PlaybackRead =
  | { state: 'planned'; plan: PlaybackPlan }
  | { state: 'refused'; refusal: PlaybackRefusal }

const REFUSALS: Partial<Record<number, PlaybackRefusal>> = {
  400: 'nothingToPlay',
  404: 'nothingToPlay',
  409: 'stillRecording',
  503: 'outOfReach',
}

function toPlan(
  data: components['schemas']['PlaybackPlanResponder'],
): PlaybackPlan {
  return {
    standing: data.standing,
    route: data.route,
    seeking: data.seeking ?? undefined,
    canSeek: data.canSeek,
    transcodes: data.transcodes,
    showsAsAWholeRecording: data.showsAsAWholeRecording,
    mediaType: data.mediaType,
    bytes: data.bytes == null ? undefined : Number(data.bytes),
  }
}

export const getPlaybackPlan = cache(
  async (id: string): Promise<PlaybackRead> => {
    const { data, response } = await carinaClient().GET(
      '/api/videos/{id}/play',
      {
        params: { path: { id } },
        headers: { accept: 'application/json' },
      },
    )

    if (response.ok && data?.data) {
      return { state: 'planned', plan: toPlan(data.data) }
    }

    return {
      state: 'refused',
      refusal: REFUSALS[response.status] ?? 'unreadable',
    }
  },
)

export const getUnaskedPlaybackProfile = cache(
  async (): Promise<PlaybackProfile | undefined> => {
    try {
      const named = unaskedIn(await fetchLiveProfiles())

      return PLAYBACK_PROFILES.find((one) => one === named)
    } catch {
      return undefined
    }
  },
)

export interface PlaybackTicket {
  inTheClear: string
  lapsesAt: string
}

export type TicketWrite =
  | { state: 'ok'; ticket: PlaybackTicket }
  | { state: 'refused'; message: string }

const TICKET_REFUSAL: Partial<Record<number, string>> = {
  400: 'この録画の指定が正しくないため、外部プレイヤーの札を発行できませんでした。',
  404: 'この録画は残っていないため、外部プレイヤーの札を発行できませんでした。',
  409: 'この録画はまだ書き込み中のため、外部プレイヤーの札を発行できません。',
  429: '発行の上限に達しています。しばらく待つと発行できます。',
}

export async function takePlaybackTicket(id: string): Promise<TicketWrite> {
  const { data, response } = await carinaClient().POST(
    '/api/videos/{id}/ticket',
    { params: { path: { id } } },
  )

  if (response.ok && data?.data) {
    return { state: 'ok', ticket: data.data }
  }

  return {
    state: 'refused',
    message:
      TICKET_REFUSAL[response.status] ??
      `外部プレイヤーの札を発行できませんでした(${response.status})。`,
  }
}
