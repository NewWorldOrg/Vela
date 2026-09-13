'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useReadAgain } from '@/hooks/useReadAgain'
import {
  askLiveViewers,
  type LiveViewerCounts,
} from '@/repository/live-viewers'

export function useLiveViewers(
  everyMs: number | undefined,
): LiveViewerCounts | undefined {
  const [counts, setCounts] = useState<LiveViewerCounts>()
  const watching = useRef(true)

  useEffect(() => {
    watching.current = true

    return () => {
      watching.current = false
    }
  }, [])

  const read = useCallback(() => {
    void askLiveViewers().then((told) => {
      if (told !== undefined && watching.current) {
        setCounts(told)
      }
    })
  }, [])

  useReadAgain(undefined, everyMs, read)

  return counts
}
