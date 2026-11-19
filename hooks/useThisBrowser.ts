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

export function useThisBrowser(): ThisBrowser | undefined {
  return useSyncExternalStore(followThisBrowser, thisBrowserNow, notOnTheServer)
}
