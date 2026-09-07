'use client'

import { useCallback, useSyncExternalStore } from 'react'

const CHANGED = 'vela-stored-flag-changed'

const unstored = new Map<string, boolean>()

export interface FlagSpelling {
  yes: string
  no: string
}

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
