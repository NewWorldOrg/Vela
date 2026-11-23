import { PICTURE_NEAR_SECONDS } from '@/lib/live-buffer'

export const PART_SECONDS = 0.05

export const TOLERANCE_SECONDS = 0.4

export const NEAR_TOLERANCE_SECONDS = 0.1

export const CATCH_UP_RATE = 1.05

export const EASE_OFF_RATE = 0.95

export const SEEK_FROM_SECONDS = 8

export const WARN_FROM_SECONDS = 1

export interface LivePlayhead {
  rate: number
  at: number
  edge: number
  reach: number
  from: number
  target: number
}

export interface LiveHold {
  rate: number
  seekTo?: number
}

export function windowOf(target: number): { start: number; stop: number } {
  return { start: target + TOLERANCE_SECONDS, stop: target }
}

export function nearWindowOf(target: number): { start: number; stop: number } {
  return { start: target - NEAR_TOLERANCE_SECONDS, stop: target }
}

export function holdOf(playhead: LivePlayhead): LiveHold {
  const { at, edge, reach, from, target, rate } = playhead
  const behind = Math.max(0, edge - at)
  const window = windowOf(target)
  const near = nearWindowOf(target)
  const toTheEdge = {
    rate: 1,
    seekTo: Math.max(from, edge - target),
  }

  if (behind >= SEEK_FROM_SECONDS) {
    return toTheEdge
  }

  if (edge - reach > PART_SECONDS) {
    return toTheEdge
  }

  if (behind > window.start || (rate > 1 && behind > window.stop)) {
    return { rate: CATCH_UP_RATE }
  }

  if (behind < near.start || (rate < 1 && behind < near.stop)) {
    return { rate: EASE_OFF_RATE }
  }

  return { rate: 1 }
}

export interface LiveRun {
  from: number
  to: number
}

export function reachOf(runs: readonly LiveRun[], at: number): number {
  const holding = runs.find((run) => run.from <= at && at <= run.to)

  return holding ? holding.to : at
}

export function pictureFromOf(
  runs: readonly LiveRun[],
  pictures: readonly number[],
): number | undefined {
  const run = runs.at(-1)

  if (!run) {
    return undefined
  }

  const heldBefore = runs.at(-2)?.to ?? Number.NEGATIVE_INFINITY
  const since = pictures.filter((picture) => picture > heldBefore)
  const first = Math.min(...since)

  return since.length === 0 || first > run.to + PICTURE_NEAR_SECONDS
    ? run.from
    : Math.max(run.from, first)
}

export const SUPPLY_GRACE_SECONDS = 0.5

export const NOT_GAINING_AFTER_SECONDS = 60

export interface LiveReading {
  behind: number
  stalledFor: number
}

export function delayOf(reading: LiveReading): number {
  return reading.behind + Math.max(0, reading.stalledFor - SUPPLY_GRACE_SECONDS)
}

export interface LiveCatchUp {
  forSeconds: number
  gapWas: number
  gapIs: number
}

export function losingGround(run: LiveCatchUp | null): boolean {
  return (
    run !== null &&
    run.forSeconds >= NOT_GAINING_AFTER_SECONDS &&
    run.gapIs >= run.gapWas
  )
}

export function latencyTone(
  seconds: number,
  losing: boolean,
): 'ok' | 'warn' | 'err' {
  if (losing || seconds >= SEEK_FROM_SECONDS) {
    return 'err'
  }

  return seconds > WARN_FROM_SECONDS ? 'warn' : 'ok'
}
