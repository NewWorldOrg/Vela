'use client'

import { useCallback } from 'react'

import { type FlagSpelling, flagOf } from '@/lib/stored-flag'
import { useStoredText } from '@/hooks/useStoredText'

export function useStoredFlag(
  key: string,
  spelling: FlagSpelling,
  stored: boolean,
): [boolean, (next: boolean) => void] {
  const [said, setSaid] = useStoredText(
    key,
    stored ? spelling.yes : spelling.no,
  )

  const set = useCallback(
    (next: boolean) => setSaid(next ? spelling.yes : spelling.no),
    [setSaid, spelling.yes, spelling.no],
  )

  return [flagOf(said, spelling, stored), set]
}
