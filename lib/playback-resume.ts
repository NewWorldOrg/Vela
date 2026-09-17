export const ALREADY_AT_THE_BEGINNING_SEC = 30

export const AS_GOOD_AS_WATCHED_THROUGH_SEC = 60

export const KEPT_EVERY_MS = 15_000

export function wholeSecond(position: number): number {
  return Number.isFinite(position) ? Math.max(0, Math.floor(position)) : 0
}

export function hasMovedOn(
  sent: number | undefined,
  position: number,
): boolean {
  return sent === undefined || sent !== position
}

export function whereToPickUp(
  resumeAtSec: number | undefined,
  lengthSec: number | undefined,
): number | undefined {
  if (resumeAtSec === undefined || !Number.isFinite(resumeAtSec)) {
    return undefined
  }

  const at = Math.floor(resumeAtSec)

  if (at < ALREADY_AT_THE_BEGINNING_SEC) {
    return undefined
  }

  const watchedThrough =
    lengthSec !== undefined &&
    lengthSec > 0 &&
    lengthSec - at < AS_GOOD_AS_WATCHED_THROUGH_SEC

  return watchedThrough ? undefined : at
}

export interface WhereItOpens {
  at?: number
  playing: boolean
}

export function howThePlayerOpens(
  askedFor: number | undefined,
  resumeAtSec: number | undefined,
  lengthSec: number | undefined,
): WhereItOpens {
  if (askedFor !== undefined) {
    return { at: askedFor, playing: true }
  }

  return { at: whereToPickUp(resumeAtSec, lengthSec), playing: false }
}
