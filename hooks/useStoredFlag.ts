'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * A flag one reader keeps for themselves, held in the browser.
 *
 * It is not in the URL. What the URL holds is the state a second reader opening
 * the link would need — the channel, the day, the broadcast type — and how one
 * reader has arranged their own screen is not that. The screens carrying these
 * flags rewrite the URL on every choice made on them, so a flag carried there
 * would be re-read on every one of those choices as well.
 *
 * It is remembered because the alternative is a press that has to be repeated
 * after every such choice: the screen re-reads each time, and a flag held only
 * in the render would come back to its default exactly when the reader is using
 * the screen most.
 *
 * Every window of the browser reads one value. The window that wrote it tells
 * its own readers, and the others hear the store.
 */

/** This window's own signal, for the other readers of a stored flag. */
const CHANGED = 'vela-stored-flag-changed'

/**
 * Where a flag is kept when the browser has no store to keep it in. Without
 * this the press would be dead there rather than merely forgetful, which is the
 * worse of the two failures: a control that does nothing.
 */
const unstored = new Map<string, boolean>()

/** How a flag is spelled in the store, which is the flag's own two words. */
export interface FlagSpelling {
  yes: string
  no: string
}

/** The server has no store to read, and a flag is not part of the document. */
function unset(): boolean {
  return false
}

export function useStoredFlag(
  key: string,
  spelling: FlagSpelling,
): [boolean, (next: boolean) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      function fromAnotherTab(event: StorageEvent) {
        if (event.key === key || event.key === null) {
          onChange()
        }
      }

      window.addEventListener(CHANGED, onChange)
      window.addEventListener('storage', fromAnotherTab)

      return () => {
        window.removeEventListener(CHANGED, onChange)
        window.removeEventListener('storage', fromAnotherTab)
      }
    },
    [key],
  )

  const read = useCallback(() => {
    try {
      return window.localStorage.getItem(key) === spelling.yes
    } catch (error) {
      console.warn(`[useStoredFlag] read failed for ${key}`, error)

      return unstored.get(key) ?? false
    }
  }, [key, spelling.yes])

  const on = useSyncExternalStore(subscribe, read, unset)

  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, next ? spelling.yes : spelling.no)
      } catch (error) {
        console.warn(`[useStoredFlag] write failed for ${key}`, error)

        unstored.set(key, next)
      }

      window.dispatchEvent(new Event(CHANGED))
    },
    [key, spelling.yes, spelling.no],
  )

  return [on, set]
}
