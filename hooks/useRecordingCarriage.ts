'use client'

import { useSyncExternalStore } from 'react'

import {
  recordingCarriage,
  type RecordingCarriage,
} from '@/components/recordings/recording-carriage'

const nothingToFollow = () => () => {}

const asked = () => recordingCarriage()

const notInTheBrowserYet = () => undefined

/** How this browser takes a recording transcoded as it plays; nothing until the page is in the browser. */
export function useRecordingCarriage(): RecordingCarriage | undefined {
  return useSyncExternalStore(nothingToFollow, asked, notInTheBrowserYet)
}
