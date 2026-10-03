import type { CaptionCanvas, CaptionPicture } from '@/lib/live-wire'

export const READS_AHEAD_WITHIN_SEC = 120

export interface TimedCaption {
  atSec: number
  picture: CaptionPicture | null
}

export interface CaptionWindow {
  canvas: CaptionCanvas
  untilSec: number
  cues: TimedCaption[]
}

/** The captions held for one stretch of a source: every change in [fromSec, untilSec), led by the one already showing at fromSec. */
export interface CaptionTimeline {
  fromSec: number
  untilSec: number
  lastFromSec: number
  cues: TimedCaption[]
}

export type CaptionNeed =
  | { need: 'nothing' }
  | { need: 'ahead'; fromSec: number }
  | { need: 'wait' }
  | { need: 'anew'; fromSec: number }

function inOrder(cues: readonly TimedCaption[]): TimedCaption[] {
  return [...cues].sort((one, other) => one.atSec - other.atSec)
}

function endOf(window: CaptionWindow, fromSec: number): number {
  return window.untilSec > fromSec ? window.untilSec : Infinity
}

export function timelineOf(
  window: CaptionWindow,
  fromSec: number,
): CaptionTimeline {
  return {
    fromSec,
    untilSec: endOf(window, fromSec),
    lastFromSec: fromSec,
    cues: inOrder(window.cues),
  }
}

export function standingAt(timeline: CaptionTimeline, second: number): number {
  let low = 0
  let high = timeline.cues.length

  while (low < high) {
    const middle = (low + high) >> 1

    if (timeline.cues[middle].atSec <= second) {
      low = middle + 1
    } else {
      high = middle
    }
  }

  return low - 1
}

export function captionAt(
  timeline: CaptionTimeline,
  second: number,
): TimedCaption | null {
  const at = standingAt(timeline, second)

  return at < 0 ? null : timeline.cues[at]
}

export function extended(
  timeline: CaptionTimeline,
  window: CaptionWindow,
  fromSec: number,
): CaptionTimeline {
  if (fromSec !== timeline.untilSec) {
    return timeline
  }

  const kept = Math.max(0, standingAt(timeline, timeline.lastFromSec))

  return {
    fromSec: timeline.lastFromSec,
    untilSec: endOf(window, fromSec),
    lastFromSec: fromSec,
    cues: [
      ...timeline.cues.slice(kept),
      ...inOrder(window.cues).filter((cue) => cue.atSec >= fromSec),
    ],
  }
}

function covers(timeline: CaptionTimeline, second: number): boolean {
  return second >= timeline.fromSec && second < timeline.untilSec
}

export function whatTheCaptionsNeed(
  timeline: CaptionTimeline | null,
  second: number,
  asking?: number,
): CaptionNeed {
  if (timeline === null || !covers(timeline, second)) {
    const awaited =
      asking !== undefined &&
      second >= asking &&
      second < asking + READS_AHEAD_WITHIN_SEC

    return awaited ? { need: 'wait' } : { need: 'anew', fromSec: second }
  }

  const until = timeline.untilSec

  if (until - second < READS_AHEAD_WITHIN_SEC && asking !== until) {
    return { need: 'ahead', fromSec: until }
  }

  return { need: 'nothing' }
}
