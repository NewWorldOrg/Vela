import { cache } from 'react'

import type { BrowserDecoding } from '@/lib/browser-decodes'
import { unaskedIn } from '@/lib/live-profiles'
import { shapeFor } from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import {
  codecThisBuildKnows,
  type EncodeCodec,
} from '@/repository/encode-terms'
import type { components } from '@/repository/client/schema'
import { fetchLiveProfiles, type LiveProfile } from '@/repository/live'
import {
  BOTH_SOURCES,
  sourceThisBuildKnows,
  type PlaybackSource,
} from '@/repository/playback-sources'
import { EVERY_SOUND, type SoundTrack } from '@/repository/sounds'
import {
  CAPTION_STANDINGS,
  type CaptionStanding,
} from '@/repository/video-captions'
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

/** The kinds of chapter a person may be offered to skip: a break, an opening theme and an ending theme. */
export type SkippableKind = 'break' | 'opening' | 'ending'

export type ChapterKind = 'programme' | SkippableKind | 'unknown'

export interface PlaybackChapter {
  startsAtSec: number
  endsAtSec: number
  kind: ChapterKind
  skippable: boolean
}

export interface PlaybackPlan {
  standing: PlaybackStanding
  route: PlaybackRoute
  source?: PlaybackSource
  alternative?: PlaybackSource
  externalPlayerSources?: PlaybackSource[]
  decodes?: BrowserDecoding[]
  seeking?: PlaybackSeeking
  canSeek: boolean
  transcodes: boolean
  showsAsAWholeRecording: boolean
  mediaType: string
  bytes?: number
  resumeAtSec?: number
  sounds: SoundTrack[]
  chapters: PlaybackChapter[]
  captions: CaptionStanding
  artefactCodec?: EncodeCodec
  /** How far a time in the recording stands ahead of the same moment in the file played; nothing when no time in the recording can be placed on that file. */
  recordingOffsetSec?: number
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
    opening: 'opening',
    ending: 'ending',
  }

function toChapter(
  one: components['schemas']['PlaybackChapterResponder'],
): PlaybackChapter {
  return {
    startsAtSec: Number(one.startsAtSec),
    endsAtSec: Number(one.endsAtSec),
    kind: shapeFor(CHAPTER_KINDS, one.kind, 'unknown'),
    skippable: one.skippable === true,
  }
}

function sourcesThisBuildKnows(
  said: readonly string[] | null | undefined,
): PlaybackSource[] | undefined {
  if (!Array.isArray(said)) {
    return undefined
  }

  return said.flatMap((one) => sourceThisBuildKnows(one) ?? [])
}

function offsetIn(said: number | string | null | undefined) {
  const offset = said == null ? undefined : Number(said)

  return offset !== undefined && Number.isFinite(offset) ? offset : undefined
}

function toPlan(
  data: components['schemas']['PlaybackPlanResponder'],
  decodes: BrowserDecoding[],
): PlaybackPlan {
  return {
    standing: data.standing,
    route: data.route,
    source: sourceThisBuildKnows(data.source),
    alternative: sourceThisBuildKnows(data.alternative ?? undefined),
    externalPlayerSources: sourcesThisBuildKnows(data.externalPlayerSources),
    decodes,
    seeking: data.seeking ?? undefined,
    canSeek: data.canSeek,
    transcodes: data.transcodes,
    showsAsAWholeRecording: data.showsAsAWholeRecording,
    mediaType: data.mediaType,
    bytes: data.bytes == null ? undefined : Number(data.bytes),
    resumeAtSec:
      data.resumeAtSec == null ? undefined : Number(data.resumeAtSec),
    sounds: Array.isArray(data.sounds) ? [...data.sounds] : [],
    chapters: Array.isArray(data.chapters) ? data.chapters.map(toChapter) : [],
    captions: shapeFor(CAPTION_STANDINGS, data.captions, 'none'),
    artefactCodec: codecThisBuildKnows(data.artefactFile?.codec),
    recordingOffsetSec: offsetIn(data.recordingOffsetSec),
  }
}

export const getPlaybackPlan = cache(
  async (
    id: string,
    sound?: SoundTrack,
    source?: PlaybackSource,
    decodes: readonly BrowserDecoding[] = [],
  ): Promise<PlaybackRead> => {
    if (sound !== undefined && !EVERY_SOUND.includes(sound)) {
      return { state: 'refused', refusal: 'nothingToPlay' }
    }

    if (source !== undefined && !BOTH_SOURCES.includes(source)) {
      return { state: 'refused', refusal: 'nothingToPlay' }
    }

    const told = [...decodes]

    const { data, response } = await carinaClient().GET(
      '/api/videos/{id}/play',
      {
        params: {
          path: { id },
          query: { sound, source, decodes: told.length ? told : undefined },
        },
        headers: { accept: 'application/json' },
      },
    )

    if (response.ok && data?.data) {
      return { state: 'planned', plan: toPlan(data.data, told) }
    }

    return {
      state: 'refused',
      refusal: REFUSALS[response.status] ?? 'unreadable',
    }
  },
)

/** The profiles a recording is transcoded at as it plays, and the formats each is transcoded in: the live list, which answers the same for a recording. */
export const getPlaybackProfiles = cache(async (): Promise<LiveProfile[]> => {
  try {
    return await fetchLiveProfiles()
  } catch {
    return []
  }
})

/** The codings a Carina from before it named its formats takes, refusing any other. */
const TAKEN_BY_EVERY_CARINA: readonly BrowserDecoding[] = ['h265']

/** What the browser plays as it is, cut to what this Carina takes: AV1 only where it names a format beyond H.264, since one from before refuses it. */
export async function decodesCarinaTakes(
  decodes: readonly BrowserDecoding[],
): Promise<BrowserDecoding[]> {
  const profiles = await getPlaybackProfiles()
  const namesMore = profiles.some((one) =>
    one.formats?.some((format) => format !== 'h264'),
  )

  return decodes.filter(
    (one) => namesMore || TAKEN_BY_EVERY_CARINA.includes(one),
  )
}

export const getUnaskedPlaybackProfile = cache(
  async (): Promise<PlaybackProfile | undefined> => {
    const named = unaskedIn(await getPlaybackProfiles())

    return PLAYBACK_PROFILES.find((one) => one === named)
  },
)

const TICKET_REFUSAL: Partial<Record<number, string>> = {
  400: 'この録画の指定が正しくないため、外部プレイヤーの札を発行できませんでした。',
  404: 'この録画は残っていないため、外部プレイヤーの札を発行できませんでした。',
  409: 'この録画はまだ書き込み中のため、外部プレイヤーの札を発行できませんでした。',
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

export type PositionWrite = { state: 'ok' } | { state: 'notKept' }

export async function keepPlaybackPosition(
  id: string,
  positionSec: number,
): Promise<PositionWrite> {
  const { response } = await carinaClient().PUT('/api/videos/{id}/position', {
    params: { path: { id } },
    body: { positionSec },
  })

  return response.ok ? { state: 'ok' } : { state: 'notKept' }
}
