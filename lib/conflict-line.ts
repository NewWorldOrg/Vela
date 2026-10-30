import { formatClock } from '@/lib/format'

export interface Span {
  startAt: string
  endAt: string
}

export interface Placed {
  left: number
  width: number
}

export interface ConflictLine {
  ticks: { label: string; at: number }[]
  kept: Placed[]
  lost: Placed
  overlap?: Placed
}

const HALF_HOUR_MS = 30 * 60 * 1000

function msOf(at: string): number {
  return new Date(at).getTime()
}

/** The line a phone draws for a conflict: the programmes that keep the tuner and the one that loses it, placed on one axis of half hours, and the stretch where they overlap. Places are shares of the axis, from 0 to 1. */
export function conflictLineOf(kept: Span[], lost: Span): ConflictLine {
  const every = [...kept, lost]
  const from =
    Math.floor(
      Math.min(...every.map((one) => msOf(one.startAt))) / HALF_HOUR_MS,
    ) * HALF_HOUR_MS
  const to =
    Math.ceil(Math.max(...every.map((one) => msOf(one.endAt))) / HALF_HOUR_MS) *
    HALF_HOUR_MS
  const whole = Math.max(to - from, HALF_HOUR_MS)
  const place = (start: number, end: number): Placed => ({
    left: (start - from) / whole,
    width: Math.max(0, end - start) / whole,
  })
  const step = whole > 4 * 60 * 60 * 1000 ? 2 * HALF_HOUR_MS : HALF_HOUR_MS
  const ticks: { label: string; at: number }[] = []

  for (let at = from; at <= to; at += step) {
    ticks.push({ label: formatClock(at), at: (at - from) / whole })
  }

  const lostStart = msOf(lost.startAt)
  const lostEnd = msOf(lost.endAt)
  const keptStart = Math.min(...kept.map((one) => msOf(one.startAt)))
  const keptEnd = Math.max(...kept.map((one) => msOf(one.endAt)))
  const overlapStart = Math.max(lostStart, keptStart)
  const overlapEnd = Math.min(lostEnd, keptEnd)

  return {
    ticks,
    kept: kept.map((one) => place(msOf(one.startAt), msOf(one.endAt))),
    lost: place(lostStart, lostEnd),
    overlap:
      overlapEnd > overlapStart ? place(overlapStart, overlapEnd) : undefined,
  }
}

/** What the programme that loses the tuner goes without: its head, its tail, a stretch in its middle, or all of it. */
export function whatIsLost(kept: Span[], lost: Span): string | undefined {
  const lostStart = msOf(lost.startAt)
  const lostEnd = msOf(lost.endAt)
  const keptStart = Math.min(...kept.map((one) => msOf(one.startAt)))
  const keptEnd = Math.max(...kept.map((one) => msOf(one.endAt)))
  const start = Math.max(lostStart, keptStart)
  const end = Math.min(lostEnd, keptEnd)

  if (end <= start) {
    return undefined
  }

  if (start <= lostStart && end >= lostEnd) {
    return '全部が欠ける'
  }

  const minutes = Math.ceil((end - start) / 60_000)

  if (start <= lostStart) {
    return `頭 ${minutes} 分が欠ける`
  }

  return end >= lostEnd
    ? `終わり ${minutes} 分が欠ける`
    : `途中 ${minutes} 分が欠ける`
}
