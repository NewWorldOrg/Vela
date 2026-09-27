export interface FlagSpelling {
  yes: string
  no: string
}

export const FOLD_SPELLING: FlagSpelling = { yes: 'folded', no: 'open' }

export const GUIDE_SUB_CHANNELS_FOLDED = 'vela-guide-sub-channels-folded'

export const LIVE_CHANNELS_FOLDED = 'vela-live-channels-folded'

export const LIVE_SUB_CHANNELS_FOLDED = 'vela-live-sub-channels-folded'

const KEPT_S = 31536000

export function flagOf(
  said: string | undefined,
  spelling: FlagSpelling,
): boolean {
  return said === spelling.yes
}

export function cookieIn(jar: string, key: string): string | undefined {
  for (const pair of jar.split(';')) {
    const at = pair.indexOf('=')

    if (at !== -1 && pair.slice(0, at).trim() === key) {
      return decodeURIComponent(pair.slice(at + 1).trim())
    }
  }

  return undefined
}

export function storingCookie(key: string, value: string): string {
  return `${key}=${value};path=/;max-age=${KEPT_S};SameSite=Lax`
}

export function forgettingCookie(key: string): string {
  return `${key}=;path=/;max-age=0;SameSite=Lax`
}
