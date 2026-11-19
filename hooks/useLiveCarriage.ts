'use client'

import { useSyncExternalStore } from 'react'

import {
  liveCarriage,
  type LiveCarriage,
} from '@/components/live/live-carriage'

const nothingToFollow = () => () => {}

const asked = () => liveCarriage()

const notInTheBrowserYet = () => undefined

export function useLiveCarriage(): LiveCarriage | undefined {
  return useSyncExternalStore(nothingToFollow, asked, notInTheBrowserYet)
}
