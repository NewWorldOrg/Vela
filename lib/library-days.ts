import { formatCalendarDate } from '@/lib/format'
import {
  ALREADY_AT_THE_BEGINNING_SEC,
  whereToPickUp,
} from '@/lib/playback-resume'

const CALENDAR_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const DAY_MS = 24 * 60 * 60 * 1000

/** The day a moment falls on in Tokyo, as `YYYY-MM-DD`. */
export function calendarDayOf(at: string | number | Date): string {
  return CALENDAR_DAY.format(new Date(at))
}

export interface DayHeading {
  /** `今日`, `昨日` or `明日`, where the day is one of those. */
  near?: string
  date: string
}

/** How a day's group is headed: today, yesterday and tomorrow by name, then the date. */
export function dayHeadingOf(day: string, now: Date): DayHeading {
  const date = formatCalendarDate(day, now)

  if (day === calendarDayOf(now)) {
    return { near: '今日', date }
  }

  if (day === calendarDayOf(now.getTime() - DAY_MS)) {
    return { near: '昨日', date }
  }

  if (day === calendarDayOf(now.getTime() + DAY_MS)) {
    return { near: '明日', date }
  }

  return { date }
}

/** Items in the order given, gathered under the day each started on; a day keeps the place of its first item. */
export function byDay<T extends { startedAt: string }>(
  items: readonly T[],
): { day: string; items: T[] }[] {
  const days: { day: string; items: T[] }[] = []

  for (const item of items) {
    const day = calendarDayOf(item.startedAt)
    const last = days.find((one) => one.day === day)

    if (last) {
      last.items.push(item)
    } else {
      days.push({ day, items: [item] })
    }
  }

  return days
}

interface Watched {
  watchedSec?: number
  lengthSec?: number
}

/** Whether a recording has a place to go on from: watched past its first moments and not to its end. */
export function goesOnFrom(recording: Watched): boolean {
  return whereToPickUp(recording.watchedSec, recording.lengthSec) !== undefined
}

/** The whole minutes left after where a recording was watched to. */
export function minutesLeftOf(recording: Watched): number | undefined {
  if (
    recording.watchedSec === undefined ||
    recording.lengthSec === undefined ||
    recording.lengthSec <= 0
  ) {
    return undefined
  }

  return Math.max(
    0,
    Math.ceil((recording.lengthSec - recording.watchedSec) / 60),
  )
}

/** How much of a recording has been watched, from 0 to 1; none where it has not. */
export function watchedShareOf(recording: Watched): number | undefined {
  if (
    recording.watchedSec === undefined ||
    recording.lengthSec === undefined ||
    recording.lengthSec <= 0
  ) {
    return undefined
  }

  return Math.min(1, Math.max(0, recording.watchedSec / recording.lengthSec))
}

export type WatchState = 'unwatched' | 'partway' | 'watched'

/** Unwatched until watched past its first moments, part-way while there is a place to go on from, and watched after. */
export function watchStateOf(recording: Watched): WatchState {
  if (
    recording.watchedSec === undefined ||
    recording.watchedSec < ALREADY_AT_THE_BEGINNING_SEC
  ) {
    return 'unwatched'
  }

  return goesOnFrom(recording) ? 'partway' : 'watched'
}
