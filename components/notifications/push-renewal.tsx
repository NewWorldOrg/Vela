'use client'

import { useEffect } from 'react'

import { renewThisBrowser, type PushCarina } from '@/lib/web-push'
import {
  PUSH_HANDS,
  PUSH_MEMORY,
  readTheFingerprint,
} from '@/components/notifications/this-browser'

let renewed = false

/** Puts the subscription this browser made anew to its row when Vela opens. Draws nothing, asks nothing and says nothing. */
export function PushRenewal({
  readKey,
  rows,
  replace,
}: Omit<PushCarina, 'add'>) {
  useEffect(() => {
    if (renewed) {
      return
    }

    renewed = true
    void renewThisBrowser(
      PUSH_HANDS,
      { readKey, rows, replace },
      PUSH_MEMORY,
    ).then(readTheFingerprint)
  }, [readKey, rows, replace])

  return null
}
