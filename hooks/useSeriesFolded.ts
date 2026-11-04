'use client'

import { FOLD_SPELLING, RECORDING_SERIES_FOLDED } from '@/lib/stored-flag'
import { useStoredFlag } from '@/hooks/useStoredFlag'

export function useSeriesFolded(
  stored: boolean,
): [boolean, (next: boolean) => void] {
  return useStoredFlag(RECORDING_SERIES_FOLDED, FOLD_SPELLING, stored)
}
