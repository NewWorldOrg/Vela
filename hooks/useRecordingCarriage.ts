'use client'

import { useSyncExternalStore } from 'react'

import {
  recordingCarriage,
  type RecordingCarriage,
} from '@/lib/recording-carriage'

const nothingToFollow = () => () => {}

const asked = () => recordingCarriage()

const notInTheBrowserYet = () => undefined

export function useRecordingCarriage(): RecordingCarriage | undefined {
  return useSyncExternalStore(nothingToFollow, asked, notInTheBrowserYet)
}
