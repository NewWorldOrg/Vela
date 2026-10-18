'use client'

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { WatchLink } from '@/lib/watch-link'
import type { SkipEvent, SkipWrite } from '@/repository/recording-segments'

export type NoteSkip = (id: string, skip: SkipEvent) => Promise<SkipWrite>

const Shared = createContext<WatchLink | undefined>(undefined)

function nothingToHear() {
  return () => {}
}

function nowhere() {
  return undefined
}

function unfollowed() {
  return false
}

/** Sends what a person did with the skip button without waiting on it: playback goes on whether it arrives or not. */
function sending(id: string, onNoteSkip: NoteSkip) {
  return (skip: SkipEvent) => {
    void onNoteSkip(id, skip)
      .then((sent) => {
        if (sent.state === 'refused') {
          console.warn('[segments] a skip was not taken', id, skip.event)
        }
      })
      .catch((error: unknown) => {
        console.warn('[segments] a skip was not sent', id, error)
      })
  }
}

/** The link between the player and the stretches under it, for the one recording the page is about. */
export function WatchLinkSeat({
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
  const [link] = useState(
    () => new WatchLink(modelVersion, sending(recordingId, onNoteSkip)),
  )

  return <Shared.Provider value={link}>{children}</Shared.Provider>
}

export function useWatchLink(): WatchLink | undefined {
  return useContext(Shared)
}

/** The second of the recording the player stands at, or nothing while there is no player to follow. */
export function usePlayhead(link: WatchLink | undefined): number | undefined {
  return useSyncExternalStore(
    link?.subscribe ?? nothingToHear,
    link?.playhead ?? nowhere,
    nowhere,
  )
}

/** Whether the stretches can follow and seek a player: there is one, on a clock they can be read against. */
export function useFollows(link: WatchLink | undefined): boolean {
  return useSyncExternalStore(
    link?.subscribe ?? nothingToHear,
    link?.follows ?? unfollowed,
    unfollowed,
  )
}
