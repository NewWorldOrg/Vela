'use client'

import { useSyncExternalStore } from 'react'

import {
  followThisBrowser,
  thisBrowserNow,
  type ThisBrowser,
} from '@/components/notifications/this-browser'

function notOnTheServer(): undefined {
  return undefined
}

/** The browser the page is open in; nothing on the server, where there is none. */
export function useThisBrowser(): ThisBrowser | undefined {
  return useSyncExternalStore(followThisBrowser, thisBrowserNow, notOnTheServer)
}
