'use client'

import { useStoredFlag } from '@/hooks/useStoredFlag'

/**
 * Whether the guide is folding away the columns that carry nothing but what
 * the service they split from is carrying, kept per browser.
 *
 * It is not in the URL, for the reason the live screen's fold is not: the day
 * and the broadcast type are what a second reader opening the link needs, and
 * how many columns one reader is looking at is not. Paging to another day
 * rewrites the URL, so a fold carried there would go back and forth on every
 * day sent.
 */
export const SUB_CHANNELS_FOLDED_KEY = 'vela-guide-sub-channels-folded'

const SPELLING = { yes: 'folded', no: 'open' }

export function useSubChannelsFolded(): [boolean, (next: boolean) => void] {
  return useStoredFlag(SUB_CHANNELS_FOLDED_KEY, SPELLING)
}
