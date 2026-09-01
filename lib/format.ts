export function formatBytes(bytes: number) {
  if (bytes === 0) {
    return '0 B'
  }
  if (bytes >= 0.1 * 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(0)} MB`
  }
  return `${Math.ceil(bytes / 1024)} KB`
}

export function formatInstant(iso: string) {
  return iso.replace('T', ' ').replace(/\.\d+(?=[Z+-]|$)/, '')
}

/**
 * The zone every stamp below is spelled in. Broadcasting runs on Japan
 * Standard Time, so that is what a screen means by a date and an hour — never
 * the zone of whichever machine happens to render it. Naming it here is what
 * keeps a server and a browser on the same answer, and what keeps a container
 * without `TZ` from quietly serving times nine hours out.
 */
const DISPLAY_ZONE = 'Asia/Tokyo'

const CALENDAR = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

interface Stamp {
  year: string
  month: string
  day: string
  hour: string
  minute: string
}

function stampOf(at: string | number): Stamp {
  const parts = CALENDAR.formatToParts(new Date(at))
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  }
}

/** `MM/DD HH:mm`. */
export function formatStamp(iso: string) {
  const at = stampOf(iso)

  return `${at.month}/${at.day} ${at.hour}:${at.minute}`
}

/** `YYYY/MM/DD HH:mm` — the stamp an admin screen spells out in full. */
export function formatDateTime(iso: string) {
  const at = stampOf(iso)

  return `${at.year}/${at.month}/${at.day} ${at.hour}:${at.minute}`
}

/** `HH:mm` — a moment close enough that the day of it says nothing. */
export function formatClock(at: number) {
  const moment = stampOf(at)

  return `${moment.hour}:${moment.minute}`
}

/** `YYYY/MM` — for a date old enough that the day of it says nothing. */
export function formatMonth(iso: string) {
  const at = stampOf(iso)

  return `${at.year}/${at.month}`
}

export function formatLength(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

/** `6分32秒`, the way an elapsed span is spelled on the admin screens. */
/**
 * The playhead, which always carries its hour. A reading that drops the hour
 * changes width as playing passes an hour, and the figure beside it — the
 * length of the recording — keeps its own, so the two would stop lining up.
 */
export function formatPlayhead(sec: number) {
  const whole = Math.max(0, Math.floor(sec))
  const h = Math.floor(whole / 3600)
  const m = String(Math.floor((whole % 3600) / 60)).padStart(2, '0')
  const s = String(whole % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function formatSpan(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)

  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

const WEEKDAY = new Intl.DateTimeFormat('ja-JP', {
  timeZone: DISPLAY_ZONE,
  weekday: 'short',
})

/** `08/08(金) 21:10` — the moment a broadcast is announced for. */
export function formatBroadcastStart(iso: string) {
  const at = stampOf(iso)

  return `${at.month}/${at.day}(${WEEKDAY.format(new Date(iso))}) ${at.hour}:${at.minute}`
}

/** `08/08(金) 21:10–22:40` — the span a broadcast covers. */
export function formatBroadcastSpan(startIso: string, endIso: string) {
  const to = stampOf(endIso)

  return `${formatBroadcastStart(startIso)}–${to.hour}:${to.minute}`
}

/** `21:10–22:40` — the same span where the day has already been said. */
export function formatClockSpan(startIso: string, endIso: string) {
  const from = stampOf(startIso)
  const to = stampOf(endIso)

  return `${from.hour}:${from.minute}–${to.hour}:${to.minute}`
}

const ORIGIN_LABEL = { byHand: '手動', byRule: 'ルール' } as const

export type OriginLabel = (typeof ORIGIN_LABEL)[keyof typeof ORIGIN_LABEL]

/** Which side asked for a reservation, as the screens name it. */
export function formatReservationOrigin(
  origin: keyof typeof ORIGIN_LABEL,
): OriginLabel {
  return ORIGIN_LABEL[origin]
}
