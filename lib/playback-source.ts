import {
  sourceThisBuildKnows,
  THE_ARTEFACT,
  type PlaybackSource,
} from '@/repository/playback-sources'
import { wholeSecond } from '@/lib/playback-resume'

export const SOURCE_ASKED_AS = 'source'

export const SECOND_ASKED_AS = 'at'

export function theSourceAsked(
  asked: string | string[] | undefined,
): PlaybackSource | undefined {
  return sourceThisBuildKnows(typeof asked === 'string' ? asked : undefined)
}

export function whereThatSourceOpens(
  pathname: string,
  asked: string,
  source: PlaybackSource,
  watchingAt?: number,
): string {
  const params = new URLSearchParams(asked)

  if (watchingAt !== undefined) {
    params.set(SECOND_ASKED_AS, String(wholeSecond(watchingAt)))
  }

  if (source === THE_ARTEFACT) {
    params.delete(SOURCE_ASKED_AS)
  } else {
    params.set(SOURCE_ASKED_AS, source)
  }

  const query = params.toString()

  return query ? `${pathname}?${query}` : pathname
}

export function whatOpensThePlayerAnew(
  id: string,
  at: number | undefined,
  source: PlaybackSource | undefined,
): string {
  return `${id}:${at ?? ''}:${source ?? ''}`
}
