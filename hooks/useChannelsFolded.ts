'use client'

import { useStoredFlag } from '@/hooks/useStoredFlag'

export const CHANNELS_FOLDED_KEY = 'vela-live-channels-folded'

const SPELLING = { yes: 'folded', no: 'open' }

export function useChannelsFolded(): [boolean, (next: boolean) => void] {
  return useStoredFlag(CHANNELS_FOLDED_KEY, SPELLING)
}
