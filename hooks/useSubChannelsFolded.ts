'use client'

import { FOLD_SPELLING, GUIDE_SUB_CHANNELS_FOLDED } from '@/lib/stored-flag'
import { useStoredFlag } from '@/hooks/useStoredFlag'

export function useSubChannelsFolded(
  stored: boolean,
): [boolean, (next: boolean) => void] {
  return useStoredFlag(GUIDE_SUB_CHANNELS_FOLDED, FOLD_SPELLING, stored)
}
