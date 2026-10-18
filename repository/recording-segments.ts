import { unstable_rethrow } from 'next/navigation'

import { shapeFor } from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { Reading } from '@/repository/system'

type SegmentsResponder = components['schemas']['RecordingSegmentsResponder']

/** The kinds of stretch a person can give a recording in this build: the programme and the breaks. */
export type SegmentKind = 'programme' | 'break'

/** A stretch of a kind this build has no word for is read as `unknown`, drawn as nothing and never sent back. */
export type SegmentKindRead = SegmentKind | 'unknown'

export interface RecordingSegment {
  startsAtSec: number
  endsAtSec: number
  kind: SegmentKindRead
}

export interface AnsweredSegment {
  startsAtSec: number
  endsAtSec: number
  kind: SegmentKind
}

export type SegmentsSource = 'answered' | 'detected' | 'none'

/** The stretches of one recording in the recording's own time, where they come from, and the seconds a boundary is drawn to. */
export interface RecordingSegments {
  lengthSec: number
  source: SegmentsSource
  modelVersion?: number
  confirmed: boolean
  segments: RecordingSegment[]
  snaps: number[]
}

export type SegmentsRefusal =
  | 'gap'
  | 'overlap'
  | 'outside'
  | 'unknownKind'
  | 'tooMany'
  | 'endsBeforeStarts'
  | 'stillRecording'
  | 'gone'
  | 'unanswered'

export type SegmentsWrite =
  | { state: 'ok'; segments: RecordingSegments }
  | { state: 'unauthenticated' }
  | { state: 'refused'; refusal: SegmentsRefusal }

export type SkipEventKind = 'skipped' | 'dismissed' | 'returned'

/** What a person did with the button that skips a break, in the recording's own time. */
export interface SkipEvent {
  event: SkipEventKind
  kind: 'break'
  fromSec: number
  toSec: number
  modelVersion?: number
}

export type SkipWrite =
  | { state: 'ok' }
  | { state: 'tooMany' }
  | { state: 'unauthenticated' }
  | { state: 'refused' }

const KINDS: Record<components['schemas']['SegmentKind'], SegmentKindRead> = {
  programme: 'programme',
  break: 'break',
  opening: 'unknown',
  ending: 'unknown',
}

const SOURCES: Record<components['schemas']['SegmentSource'], SegmentsSource> =
  {
    answered: 'answered',
    detected: 'detected',
    none: 'none',
  }

/** The sentence Carina refuses an answer with names what is wrong with it and nothing it was sent. */
const SAID: Record<string, SegmentsRefusal> = {
  'segments: a gap between segments': 'gap',
  'segments: segments overlap': 'overlap',
  'segments: outside the recording': 'outside',
  'segments: unknown kind': 'unknownKind',
  'segments: too many segments': 'tooMany',
  'segments: a segment ends before it starts': 'endsBeforeStarts',
}

const BY_STATUS: Partial<Record<number, SegmentsRefusal>> = {
  404: 'gone',
  409: 'stillRecording',
}

function seconds(said: number | string): number {
  return Number(said)
}

function toSegments(data: SegmentsResponder): RecordingSegments {
  const version =
    data.modelVersion == null ? undefined : Number(data.modelVersion)

  return {
    lengthSec: seconds(data.lengthSec),
    source: shapeFor(SOURCES, data.source, 'none'),
    modelVersion: Number.isFinite(version) ? version : undefined,
    confirmed: data.confirmed === true,
    segments: data.segments.map((one) => ({
      startsAtSec: seconds(one.startsAtSec),
      endsAtSec: seconds(one.endsAtSec),
      kind: shapeFor(KINDS, one.kind, 'unknown'),
    })),
    snaps: data.snaps.map(seconds).filter(Number.isFinite),
  }
}

function refusalOf(status: number, message: string | undefined) {
  return (
    BY_STATUS[status] ??
    (message === undefined ? undefined : shapeFor(SAID, message, undefined)) ??
    'unanswered'
  )
}

export async function getRecordingSegments(
  id: string,
): Promise<Reading<RecordingSegments>> {
  try {
    const { data, response } = await carinaClient().GET(
      '/api/recordings/{id}/segments',
      {
        params: { path: { id } },
      },
    )

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    const segments = data?.data

    return segments
      ? { state: 'ok', value: toSegments(segments) }
      : { state: 'unavailable' }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unavailable' }
  }
}

async function settled(
  asked: Promise<{
    data?: components['schemas']['BaseResponderOfRecordingSegmentsResponder']
    error?: components['schemas']['BaseResponderOfRecordingSegmentsResponder']
    response: Response
  }>,
): Promise<SegmentsWrite> {
  try {
    const { data, error, response } = await asked

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    if (response.ok && data?.data) {
      return { state: 'ok', segments: toSegments(data.data) }
    }

    return {
      state: 'refused',
      refusal: refusalOf(response.status, error?.message),
    }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'refused', refusal: 'unanswered' }
  }
}

export async function answerRecordingSegments(
  id: string,
  segments: readonly AnsweredSegment[],
  confirmed: boolean,
): Promise<SegmentsWrite> {
  return settled(
    carinaClient().PUT('/api/recordings/{id}/segments', {
      params: { path: { id } },
      body: {
        segments: segments.map((one) => ({
          startsAtSec: one.startsAtSec,
          endsAtSec: one.endsAtSec,
          kind: one.kind,
        })),
        confirmed,
      },
    }),
  )
}

export async function withdrawSegmentAnswer(
  id: string,
): Promise<SegmentsWrite> {
  return settled(
    carinaClient().DELETE('/api/recordings/{id}/segments/answer', {
      params: { path: { id } },
    }),
  )
}

export async function noteSkip(
  id: string,
  skip: SkipEvent,
): Promise<SkipWrite> {
  try {
    const { response } = await carinaClient().POST(
      '/api/recordings/{id}/skips',
      {
        params: { path: { id } },
        body: {
          event: skip.event,
          kind: skip.kind,
          fromSec: skip.fromSec,
          toSec: skip.toSec,
          modelVersion: skip.modelVersion ?? null,
        },
      },
    )

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    if (response.status === 429) {
      return { state: 'tooMany' }
    }

    return response.ok ? { state: 'ok' } : { state: 'refused' }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'refused' }
  }
}
