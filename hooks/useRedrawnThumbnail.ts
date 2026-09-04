'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * When the picture of a recording was last drawn again in this tab.
 *
 * The picture is drawn in two places on two screens — the poster of the player
 * on the recording, and the row in the library the recording is reached from —
 * and the press that redraws it is on the first of them. Both ask for it at the
 * same path, which the browser holds an answer for (`lib/thumbnail-redraw`), so
 * both need to be told that the answer they hold is no longer the picture.
 *
 * It is not in the URL. What the URL holds is the state a second reader opening
 * the link would need, and a picture already redrawn for them is not that: they
 * were never handed the frame it replaced.
 *
 * It is kept for the tab rather than for the render because the reader who
 * presses it goes on to look at the library, and a reload of either screen
 * falls inside the minute the browser holds the old answer for.
 */

/** This window's own signal, for the other readers of a redrawn picture. */
const CHANGED = 'vela-thumbnail-redrawn'

const KEY = 'vela-thumbnail-redrawn:'

/**
 * Where the moment is kept when the browser has no store to keep it in. Without
 * it the press still works and the picture on screen still changes; only a
 * reload forgets, which is the failure a reader can undo by waiting.
 */
const unstored = new Map<string, number>()

/** The server holds no such moment, and a picture is not redrawn on it. */
function unset(): undefined {
  return undefined
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange)

  return () => window.removeEventListener(CHANGED, onChange)
}

/** Say that the picture of this recording has just been drawn again. */
export function noteThumbnailRedrawn(id: string, at: number = Date.now()) {
  try {
    window.sessionStorage.setItem(`${KEY}${id}`, String(at))
  } catch (error) {
    console.warn(`[useRedrawnThumbnail] write failed for ${id}`, error)

    unstored.set(id, at)
  }

  window.dispatchEvent(new Event(CHANGED))
}

export function useRedrawnThumbnail(id: string): number | undefined {
  const read = useCallback(() => {
    let held: string | null = null

    try {
      held = window.sessionStorage.getItem(`${KEY}${id}`)
    } catch (error) {
      console.warn(`[useRedrawnThumbnail] read failed for ${id}`, error)

      return unstored.get(id)
    }

    return held === null ? undefined : Number(held)
  }, [id])

  return useSyncExternalStore(subscribe, read, unset)
}
