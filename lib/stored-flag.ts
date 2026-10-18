export interface FlagSpelling {
  yes: string
  no: string
}

export const FOLD_SPELLING: FlagSpelling = { yes: 'folded', no: 'open' }

export const AUTO_OPEN_SPELLING: FlagSpelling = { yes: 'opens', no: 'waits' }

export const LINE_SPELLING: FlagSpelling = { yes: 'allows', no: 'refuses' }

export const RECEIVER_ID_SPELLING: FlagSpelling = { yes: 'hands', no: 'keeps' }

export const HYBRIDCAST_SPELLING: FlagSpelling = {
  yes: 'allows',
  no: 'refuses',
}

export const SOUNDS_SPELLING: FlagSpelling = { yes: 'plays', no: 'silent' }

export const GUIDE_SUB_CHANNELS_FOLDED = 'vela-guide-sub-channels-folded'

export const LIVE_CHANNELS_FOLDED = 'vela-live-channels-folded'

export const LIVE_SUB_CHANNELS_FOLDED = 'vela-live-sub-channels-folded'

export const DATA_BROADCAST_AUTO_OPEN = 'vela-data-broadcast-auto-open'

export const DATA_BROADCAST_LINE = 'vela-data-broadcast-network'

export const DATA_BROADCAST_RECEIVER_ID = 'vela-data-broadcast-receiver-id'

export const DATA_BROADCAST_HYBRIDCAST = 'vela-data-broadcast-hybridcast'

export const DATA_BROADCAST_SOUNDS = 'vela-data-broadcast-sounds'

const KEPT_S = 31536000

/** Whether a flag is on by what its cookie says: on only for the word for yes, and as it starts out while there is no cookie. */
export function flagOf(
  said: string | undefined,
  spelling: FlagSpelling,
  unsaid = false,
): boolean {
  return said === undefined ? unsaid : said === spelling.yes
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
