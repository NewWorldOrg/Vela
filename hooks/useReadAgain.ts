'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function useReadAgain(
  atMs: number | undefined,
  everyMs: number | undefined,
): void {
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (atMs === undefined && everyMs === undefined) {
      return
    }

    const read = () => {
      if (document.visibilityState === 'visible') {
        startTransition(() => router.refresh())
      }
    }

    const waited = atMs === undefined ? -1 : atMs - Date.now()
    const boundary = waited > 0 ? setTimeout(read, waited) : undefined
    const polling =
      everyMs === undefined ? undefined : setInterval(read, everyMs)

    document.addEventListener('visibilitychange', read)

    return () => {
      clearTimeout(boundary)
      clearInterval(polling)
      document.removeEventListener('visibilitychange', read)
    }
  }, [atMs, everyMs, router, startTransition])
}
