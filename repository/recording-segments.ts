import { unstable_rethrow } from 'next/navigation'

import { carinaClient } from '@/repository/client/carina'
import { seekBody } from '@/repository/recording-seek-paths'
import type { Reading } from '@/repository/system'
import type { SkippableKind } from '@/repository/videos'

export type SkipEventKind = 'skipped' | 'dismissed' | 'returned'

/** What a person did with the button that skips a break, an opening or an ending, in the recording's own time. */
export interface SkipEvent {
  event: SkipEventKind
  kind: SkippableKind
  fromSec: number
  toSec: number
  modelVersion?: number
}

export type SeekEventKind = 'forward' | 'returned'

export type SeekMeans = 'bar' | 'step' | 'chapter' | 'key'

/**
 * A seek a person made in a recording, in the recording's own time: forward past a stretch, the steps made one after
 * another as one, or back into a stretch a seek forward passed moments before, once they watched on from there.
 */
export interface SeekEvent {
  event: SeekEventKind
  means: SeekMeans
  fromSec: number
  toSec: number
}

export type SkipWrite =
  | { state: 'ok' }
  | { state: 'tooMany' }
  | { state: 'unauthenticated' }
  | { state: 'refused' }

function versionIn(said: number | string | null): number | undefined {
  const version = said == null ? undefined : Number(said)

  return version !== undefined && Number.isFinite(version) ? version : undefined
}

/** The version of the model that found the stretches of one recording, or nothing when no model found them. */
export async function getSegmentModelVersion(
  id: string,
): Promise<Reading<number | undefined>> {
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
      ? { state: 'ok', value: versionIn(segments.modelVersion) }
      : { state: 'unavailable' }
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'unavailable' }
  }
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

export async function noteSeek(
  id: string,
  seek: SeekEvent,
): Promise<SkipWrite> {
  try {
    const { response } = await carinaClient().POST(
      '/api/recordings/{id}/seeks',
      {
        params: { path: { id } },
        body: seekBody(seek),
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
