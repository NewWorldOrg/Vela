import { cache } from 'react'

import { unaskedIn } from '@/lib/live-profiles'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { fetchLiveProfiles } from '@/repository/live'
import { BOTH_SOUNDS, type SoundTrack } from '@/repository/sounds'
import { whyNoTicket, type TicketWrite } from '@/repository/tickets'
import {
  PLAYBACK_PROFILES,
  type PlaybackProfile,
} from '@/repository/video-paths'

export type PlaybackStanding = components['schemas']['PlaybackStanding']

export type PlaybackRoute = components['schemas']['PlaybackRoute']

export type PlaybackSeeking = NonNullable<
  components['schemas']['PlaybackSeeking']
>

export type ChapterKind = 'programme' | 'break' | 'unknown'

export interface PlaybackChapter {
  startsAtSec: number
  endsAtSec: number
  kind: ChapterKind
}

export interface PlaybackPlan {
  standing: PlaybackStanding
  route: PlaybackRoute
  seeking?: PlaybackSeeking
  canSeek: boolean
  transcodes: boolean
  showsAsAWholeRecording: boolean
  mediaType: string
  bytes?: number
  sounds: SoundTrack[]
  chapters: PlaybackChapter[]
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

const CHAPTER_KINDS: Record<components['schemas']['ChapterKind'], ChapterKind> =
  {
    programme: 'programme',
    break: 'break',
  }

function toChapter(
  one: components['schemas']['PlaybackChapterResponder'],
): PlaybackChapter {
  return {
    startsAtSec: Number(one.startsAtSec),
    endsAtSec: Number(one.endsAtSec),
    kind: shapeFor(CHAPTER_KINDS, one.kind, 'unknown'),
  }
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
    sounds: Array.isArray(data.sounds) ? [...data.sounds] : [],
    chapters: Array.isArray(data.chapters) ? data.chapters.map(toChapter) : [],
  }
}

export const getPlaybackPlan = cache(
  async (id: string, sound?: SoundTrack): Promise<PlaybackRead> => {
    if (sound !== undefined && !BOTH_SOUNDS.includes(sound)) {
      return { state: 'refused', refusal: 'nothingToPlay' }
    }

    const { data, response } = await carinaClient().GET(
      '/api/videos/{id}/play',
      {
        params: { path: { id }, query: { sound } },
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

const TICKET_REFUSAL: Partial<Record<number, string>> = {
  400: 'この録画の指定が正しくないため、外部プレイヤーの札を発行できませんでした。',
  404: 'この録画は残っていないため、外部プレイヤーの札を発行できませんでした。',
  409: 'この録画はまだ書き込み中のため、外部プレイヤーの札を発行できません。',
}

export async function takePlaybackTicket(id: string): Promise<TicketWrite> {
  const { data, response } = await carinaClient().POST(
    '/api/videos/{id}/ticket',
    { params: { path: { id } } },
  )

  if (response.ok && data?.data) {
    return { state: 'ok', ticket: data.data }
  }

  return whyNoTicket(response.status, TICKET_REFUSAL)
}
