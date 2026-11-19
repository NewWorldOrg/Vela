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

export function calendarDayOf(at: string | number | Date): string {
  return CALENDAR_DAY.format(new Date(at))
}

export interface DayHeading {
  near?: string
  date: string
}

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

export function goesOnFrom(recording: Watched): boolean {
  return whereToPickUp(recording.watchedSec, recording.lengthSec) !== undefined
}

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

export function watchStateOf(recording: Watched): WatchState {
  if (
    recording.watchedSec === undefined ||
    recording.watchedSec < ALREADY_AT_THE_BEGINNING_SEC
  ) {
    return 'unwatched'
  }

  return goesOnFrom(recording) ? 'partway' : 'watched'
}
