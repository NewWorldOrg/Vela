import {
  sourceThisBuildKnows,
  THE_ARTEFACT,
  type PlaybackSource,
} from '@/repository/playback-sources'
import { wholeSecond } from '@/lib/playback-resume'

export const SOURCE_ASKED_AS = 'source'

export const SECOND_ASKED_AS = 'at'

export const HOLD_ASKED_AS = 'paused'

const HELD = '1'

export function theSourceAsked(
  asked: string | string[] | undefined,
): PlaybackSource | undefined {
  return sourceThisBuildKnows(typeof asked === 'string' ? asked : undefined)
}

export function theHoldAsked(asked: string | string[] | undefined): boolean {
  return asked === HELD
}

export function whereThatSourceOpens(
  pathname: string,
  asked: string,
  source: PlaybackSource,
  watchingAt?: number,
  held = false,
): string {
  const params = new URLSearchParams(asked)

  if (watchingAt !== undefined) {
    params.set(SECOND_ASKED_AS, String(wholeSecond(watchingAt)))

    if (held) {
      params.set(HOLD_ASKED_AS, HELD)
    } else {
      params.delete(HOLD_ASKED_AS)
    }
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
  held = false,
): string {
  return `${id}:${at ?? ''}:${source ?? ''}:${held ? HOLD_ASKED_AS : ''}`
}

export type WhenTheArtefactMoves = 'stay' | 'learn' | 'reopen' | 'replan'

export function whatTheStandingArtefactAsks(
  opened: string | undefined,
  standing: string | undefined,
  source: PlaybackSource | undefined,
  started: boolean,
): WhenTheArtefactMoves {
  if (
    source !== THE_ARTEFACT ||
    standing === undefined ||
    standing === opened
  ) {
    return 'stay'
  }

  if (opened === undefined) {
    return 'learn'
  }

  return started ? 'reopen' : 'replan'
}
