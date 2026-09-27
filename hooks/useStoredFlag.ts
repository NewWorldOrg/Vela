'use client'

import { useCallback, useSyncExternalStore } from 'react'

import { type FlagSpelling, cookieIn, storingCookie } from '@/lib/stored-flag'

const CHANGED = 'vela-stored-flag-changed'

const ACROSS_TABS = 'vela-stored-flag'

const unstored = new Map<string, boolean>()

function tellTheOtherTabs(key: string): void {
  if (typeof BroadcastChannel !== 'function') {
    return
  }

  const channel = new BroadcastChannel(ACROSS_TABS)

  channel.postMessage(key)
  channel.close()
}

export function useStoredFlag(
  key: string,
  spelling: FlagSpelling,
  stored: boolean,
): [boolean, (next: boolean) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const otherTabs =
        typeof BroadcastChannel === 'function'
          ? new BroadcastChannel(ACROSS_TABS)
          : null

      function fromAnotherTab(event: MessageEvent) {
        if (event.data === key) {
          onChange()
        }
      }

      window.addEventListener(CHANGED, onChange)
      otherTabs?.addEventListener('message', fromAnotherTab)

      return () => {
        window.removeEventListener(CHANGED, onChange)
        otherTabs?.close()
      }
    },
    [key],
  )

  const read = useCallback(() => {
    const said = cookieIn(document.cookie, key)

    return said === undefined
      ? (unstored.get(key) ?? stored)
      : said === spelling.yes
  }, [key, spelling.yes, stored])

  const readOnTheServer = useCallback(() => stored, [stored])

  const on = useSyncExternalStore(subscribe, read, readOnTheServer)

  const set = useCallback(
    (next: boolean) => {
      const value = next ? spelling.yes : spelling.no

      document.cookie = storingCookie(key, value)

      if (cookieIn(document.cookie, key) !== value) {
        console.warn(`[useStoredFlag] the cookie was not kept for ${key}`)

        unstored.set(key, next)
      }

      window.dispatchEvent(new Event(CHANGED))
      tellTheOtherTabs(key)
    },
    [key, spelling.yes, spelling.no],
  )

  return [on, set]
}
