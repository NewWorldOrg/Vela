'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { SkipEvents } from '@/lib/skip-events'
import type { SkipEvent, SkipWrite } from '@/repository/recording-segments'

export type NoteSkip = (id: string, skip: SkipEvent) => Promise<SkipWrite>

const Shared = createContext<SkipEvents | undefined>(undefined)

/** Sends what a person did with the skip button without waiting on it: playback goes on whether it arrives or not. */
function sending(id: string, onNoteSkip: NoteSkip) {
  return (skip: SkipEvent) => {
    void onNoteSkip(id, skip)
      .then((sent) => {
        if (sent.state === 'refused') {
          console.warn('[skips] a skip was not taken', id, skip.event)
        }
      })
      .catch((error: unknown) => {
        console.warn('[skips] a skip was not sent', id, error)
      })
  }
}

/** Where the player of one recording sends what a person did with the button that skips a break. */
export function SkipEventsSeat({
  recordingId,
  modelVersion,
  onNoteSkip,
  children,
}: {
  recordingId: string
  modelVersion: number | undefined
  onNoteSkip: NoteSkip
  children: ReactNode
}) {
  const [events] = useState(
    () => new SkipEvents(modelVersion, sending(recordingId, onNoteSkip)),
  )

  useEffect(() => {
    events.standsWith(modelVersion)
  }, [events, modelVersion])

  return <Shared.Provider value={events}>{children}</Shared.Provider>
}

export function useSkipEvents(): SkipEvents | undefined {
  return useContext(Shared)
}
