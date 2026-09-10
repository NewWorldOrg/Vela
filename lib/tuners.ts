export const SILENCE_RANGE = { least: 1, most: 720 }

export function withinSilence(hours: number): boolean {
  return hours >= SILENCE_RANGE.least && hours <= SILENCE_RANGE.most
}

const MINUTE_MS = 60 * 1000

const HOUR_MS = 60 * MINUTE_MS

const DAY_MS = 24 * HOUR_MS

export function reachAgo(iso: string, now: number): string | undefined {
  const elapsed = now - Date.parse(iso)

  if (!Number.isFinite(elapsed) || elapsed < 0) {
    return undefined
  }

  if (elapsed < MINUTE_MS) {
    return 'たったいま'
  }

  if (elapsed < HOUR_MS) {
    return `${Math.floor(elapsed / MINUTE_MS)} 分前`
  }

  if (elapsed < DAY_MS) {
    return `${Math.floor(elapsed / HOUR_MS)} 時間前`
  }

  return `${Math.floor(elapsed / DAY_MS)} 日前`
}
