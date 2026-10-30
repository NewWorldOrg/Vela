import {
  sourceThisBuildKnows,
  THE_ARTEFACT,
  type PlaybackSource,
} from '@/repository/playback-sources'
import { wholeSecond } from '@/lib/playback-resume'

export const SOURCE_ASKED_AS = 'source'

export const SECOND_ASKED_AS = 'at'

export const HOLD_ASKED_AS = 'paused'

export const PLAY_ASKED_AS = 'play'

const HELD = '1'

const PLAYING_ON = '1'

export function theSourceAsked(
  asked: string | string[] | undefined,
): PlaybackSource | undefined {
  return sourceThisBuildKnows(typeof asked === 'string' ? asked : undefined)
}

export function theHoldAsked(asked: string | string[] | undefined): boolean {
  return asked === HELD
}

/** Whether the address asks the recording to play on from where it was left as soon as it opens. */
export function thePlayAsked(asked: string | string[] | undefined): boolean {
  return asked === PLAYING_ON
}

export function playingOnHref(id: string): string {
  return `/recordings/${id}?${PLAY_ASKED_AS}=${PLAYING_ON}`
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

/** Whether reopening there leaves the address, and with it the player, exactly as it stands. */
export function theAddressStands(
  pathname: string,
  asked: string,
  source: PlaybackSource,
  watchingAt: number,
  held: boolean,
): boolean {
  const stands = new URLSearchParams(asked).toString()

  return (
    whereThatSourceOpens(pathname, asked, source, watchingAt, held) ===
    (stands ? `${pathname}?${stands}` : pathname)
  )
}

/** The artefact the player is seated on, moved to the one it asked for once the page has read that one. */
export function whichArtefactSeats(
  seated: string | undefined,
  asked: string | undefined,
  read: string | undefined,
): string | undefined {
  return asked !== undefined && asked === read ? asked : seated
}

export function whatOpensThePlayerAnew(
  id: string,
  at: number | undefined,
  source: PlaybackSource | undefined,
  held = false,
  playingOn = false,
): string {
  return `${id}:${at ?? ''}:${source ?? ''}:${held ? HOLD_ASKED_AS : ''}:${playingOn ? PLAY_ASKED_AS : ''}`
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
