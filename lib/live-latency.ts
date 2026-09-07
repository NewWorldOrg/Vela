export const PART_SECONDS = 0.05

export const TARGET_SECONDS = 0.6

export const TOLERANCE_SECONDS = 0.4

export const CATCH_UP_RATE = 1.05

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

export function holdOf(playhead: LivePlayhead): LiveHold {
  const { at, edge, reach, from, stalls, rate } = playhead
  const behind = Math.max(0, edge - at)
  const window = windowOf(stalls)
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
