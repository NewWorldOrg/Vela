'use client'

import { useCallback, useState } from 'react'

import { useReadAgain } from '@/hooks/useReadAgain'
import {
  askLiveViewers,
  type LiveViewerCounts,
} from '@/repository/live-viewers'

export function useLiveViewers(
  everyMs: number | undefined,
): LiveViewerCounts | undefined {
  const [counts, setCounts] = useState<LiveViewerCounts>()

  const read = useCallback(() => {
    void askLiveViewers().then((told) => {
      if (told !== undefined) {
        setCounts(told)
      }
    })
  }, [])

  useReadAgain(undefined, everyMs, read)

  return counts
}
