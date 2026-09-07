'use client'

import { useStoredFlag } from '@/hooks/useStoredFlag'

export const LIVE_SUB_CHANNELS_FOLDED_KEY = 'vela-live-sub-channels-folded'

const SPELLING = { yes: 'folded', no: 'open' }

export function useLiveSubChannelsFolded(): [boolean, (next: boolean) => void] {
  return useStoredFlag(LIVE_SUB_CHANNELS_FOLDED_KEY, SPELLING)
}
