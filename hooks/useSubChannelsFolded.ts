'use client'

import { useStoredFlag } from '@/hooks/useStoredFlag'

export const SUB_CHANNELS_FOLDED_KEY = 'vela-guide-sub-channels-folded'

const SPELLING = { yes: 'folded', no: 'open' }

export function useSubChannelsFolded(): [boolean, (next: boolean) => void] {
  return useStoredFlag(SUB_CHANNELS_FOLDED_KEY, SPELLING)
}
