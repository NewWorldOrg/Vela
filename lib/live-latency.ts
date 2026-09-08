export const PART_SECONDS = 0.05

export const TARGET_SECONDS = 0.6

export const TOLERANCE_SECONDS = 0.4

export const NEAR_TOLERANCE_SECONDS = 0.2

export const CATCH_UP_RATE = 1.05

export const EASE_OFF_RATE = 0.95

export const SEEK_FROM_SECONDS = 8

export const STALL_ALLOWANCE_SECONDS = 0.2

export const STALL_ALLOWANCE_CAP_SECONDS = 1.0

export interface LivePlayhead {
  rate: number
  at: number
  edge: number
  reach: number
  from: number
  stalls: number
}

export interface LiveHold {
  rate: number
  seekTo?: number
}

export function targetOf(stalls: number): number {
  return (
    TARGET_SECONDS +
    Math.min(stalls * STALL_ALLOWANCE_SECONDS, STALL_ALLOWANCE_CAP_SECONDS)
  )
}

export function windowOf(stalls: number): { start: number; stop: number } {
  const target = targetOf(stalls)

  return { start: target + TOLERANCE_SECONDS, stop: target }
}

export function nearWindowOf(stalls: number): { start: number; stop: number } {
  const target = targetOf(stalls)

  return { start: target - NEAR_TOLERANCE_SECONDS, stop: target }
}

export function holdOf(playhead: LivePlayhead): LiveHold {
  const { at, edge, reach, from, stalls, rate } = playhead
  const behind = Math.max(0, edge - at)
  const window = windowOf(stalls)
  const near = nearWindowOf(stalls)
  const toTheEdge = {
    rate: 1,
    seekTo: Math.max(from, edge - targetOf(stalls)),
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

  return seconds > windowOf(0).start ? 'warn' : 'ok'
}
