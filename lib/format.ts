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
 * `MM/DD HH:mm` in the zone the process runs in — a self-hosted deployment
 * sets `TZ` once and every screen follows it, so no zone is named here.
 */
export function formatStamp(iso: string) {
  const at = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${pad(at.getMonth() + 1)}/${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

/** `HH:mm` — a moment close enough that the day of it says nothing. */
export function formatClock(at: number) {
  const moment = new Date(at)
  const pad = (value: number) => String(value).padStart(2, '0')

  return `${pad(moment.getHours())}:${pad(moment.getMinutes())}`
}

/** `YYYY/MM` — for a date old enough that the day of it says nothing. */
export function formatMonth(iso: string) {
  const at = new Date(iso)

  return `${at.getFullYear()}/${String(at.getMonth() + 1).padStart(2, '0')}`
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
export function formatSpan(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)

  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}
