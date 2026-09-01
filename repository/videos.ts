import { cache } from 'react'

import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'

/**
 * How the recording ended, said by the side that plays it. `whole` and
 * `cutShort` both hand over a picture; the two are not the same recording and
 * are not drawn the same way.
 */
export type PlaybackStanding = components['schemas']['PlaybackStanding']

/** Where the picture comes from: the file as it is, a transcoder, or nowhere. */
export type PlaybackRoute = components['schemas']['PlaybackRoute']

/**
 * What choosing a position costs. `byRange` is a byte range the file answers;
 * `byStartingAgain` is a new request and a transcoder built again behind it.
 */
export type PlaybackSeeking = NonNullable<
  components['schemas']['PlaybackSeeking']
>

export interface PlaybackPlan {
  standing: PlaybackStanding
  route: PlaybackRoute
  /** Unset where there is nothing to play, so nothing to seek in either. */
  seeking?: PlaybackSeeking
  canSeek: boolean
  transcodes: boolean
  showsAsAWholeRecording: boolean
  mediaType: string
  /** Unset while the picture is made as it plays, so its length is unknown. */
  bytes?: number
}

/**
 * Why the API would not plan a playback. Each of these is a different screen:
 * a recording still being written, one that wrote nothing, and one whose file
 * the API cannot reach are three separate answers, and drawing them alike
 * would leave the reader guessing which one they have.
 */
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

/**
 * The plan alone, read before any picture is asked for. Asking for the plan
 * costs a row and no transcoder, which is what lets the screen say how the
 * recording ended, and whether choosing a position rebuilds the stream, before
 * a single frame has been requested.
 */
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

/**
 * A ticket an external player reaches the recording with, and the moment it
 * lapses. It is short-lived on purpose, so it is taken when the button is
 * pressed rather than drawn into the page and left to go stale there.
 */
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
