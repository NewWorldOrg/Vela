import { DISPLAY_ZONE, formatPlayerTime } from '@/lib/format'

export const CAPTURED_TYPE = 'image/png'

const SUFFIX = '.png'

const NOT_IN_A_NAME = /[\\/:*?"<>|]/g

const CONTROL = /[\u0000-\u001f\u007f]/g

const RUN_OF_SPACES = /\s+/g

const CLOCK = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function inAFileName(text: string): string {
  return text
    .replace(CONTROL, '')
    .replace(NOT_IN_A_NAME, '')
    .replace(RUN_OF_SPACES, ' ')
    .trim()
}

export function capturedAt(second: number): string {
  return formatPlayerTime(second).split(':').join('-')
}

export function capturedOn(at: number): string {
  const parts = CLOCK.formatToParts(new Date(at))
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return `${read('year')}-${read('month')}-${read('day')} ${read('hour')}-${read('minute')}-${read('second')}`
}

export function capturedName(of: string, at: string): string {
  const named = inAFileName(of)

  return named === '' ? `${at}${SUFFIX}` : `${named} ${at}${SUFFIX}`
}
