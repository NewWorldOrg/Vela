'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { SeekEvents } from '@/lib/seek-events'
import { SkipEvents } from '@/lib/skip-events'
import type {
  SeekEvent,
  SkipEvent,
  SkipWrite,
} from '@/repository/recording-segments'

export type NoteSkip = (id: string, skip: SkipEvent) => Promise<SkipWrite>

export type NoteSeek = (id: string, seek: SeekEvent) => Promise<SkipWrite>

const Shared = createContext<SkipEvents | undefined>(undefined)

const SharedSeeks = createContext<SeekEvents | undefined>(undefined)

/** Sends what a person did without waiting on it: playback goes on whether it arrives or not. */
function sending<T extends { event: string }>(
  what: string,
  id: string,
  onNote: (id: string, noted: T) => Promise<SkipWrite>,
) {
  return (noted: T) => {
    void onNote(id, noted)
      .then((sent) => {
        if (sent.state === 'refused') {
          console.warn(`[${what}] one was not taken`, id, noted.event)
        }
      })
      .catch((error: unknown) => {
        console.warn(`[${what}] one was not sent`, id, error)
      })
  }
}

/**
 * Where the player of one recording sends what a person did with the button that skips a break, an opening or an
 * ending, and the seeks they made.
 */
export function SkipEventsSeat({
  recordingId,
  modelVersion,
  onNoteSkip,
  onNoteSeek,
  children,
}: {
  recordingId: string
  modelVersion: number | undefined
  onNoteSkip: NoteSkip
  onNoteSeek: NoteSeek
  children: ReactNode
}) {
  const [events] = useState(
    () =>
      new SkipEvents(modelVersion, sending('skips', recordingId, onNoteSkip)),
  )
  const [seeks] = useState(
    () => new SeekEvents(sending('seeks', recordingId, onNoteSeek)),
  )

  useEffect(() => {
    events.standsWith(modelVersion)
  }, [events, modelVersion])

  useEffect(() => () => seeks.leaves(), [seeks])

  return (
    <Shared.Provider value={events}>
      <SharedSeeks.Provider value={seeks}>{children}</SharedSeeks.Provider>
    </Shared.Provider>
  )
}

export function useSkipEvents(): SkipEvents | undefined {
  return useContext(Shared)
}

export function useSeekEvents(): SeekEvents | undefined {
  return useContext(SharedSeeks)
}
