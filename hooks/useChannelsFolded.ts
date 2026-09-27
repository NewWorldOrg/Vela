'use client'

import { FOLD_SPELLING, LIVE_CHANNELS_FOLDED } from '@/lib/stored-flag'
import { useStoredFlag } from '@/hooks/useStoredFlag'

export function useChannelsFolded(
  stored: boolean,
): [boolean, (next: boolean) => void] {
  return useStoredFlag(LIVE_CHANNELS_FOLDED, FOLD_SPELLING, stored)
}
