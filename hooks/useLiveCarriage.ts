'use client'

import { useSyncExternalStore } from 'react'

import {
  liveCarriage,
  type LiveCarriage,
} from '@/components/live/live-carriage'

const nothingToFollow = () => () => {}

const asked = () => liveCarriage()

const notInTheBrowserYet = () => undefined

/** How this browser takes a live channel; nothing until the page is in the browser. */
export function useLiveCarriage(): LiveCarriage | undefined {
  return useSyncExternalStore(nothingToFollow, asked, notInTheBrowserYet)
}
