'use client'

import { useCallback, useSyncExternalStore } from 'react'

import { cookieIn, forgettingCookie, storingCookie } from '@/lib/stored-flag'

const CHANGED = 'vela-stored-flag-changed'

const ACROSS_TABS = 'vela-stored-flag'

/** What was set in this page but could not be kept in a cookie, and null for what was taken away. */
const unstored = new Map<string, string | null>()

/** The keys set or taken away since the page was opened, here or in another tab: for them, no cookie means nothing, not what the page started with. */
const touched = new Set<string>()

function tellTheOtherTabs(key: string): void {
  if (typeof BroadcastChannel !== 'function') {
    return
  }

  const channel = new BroadcastChannel(ACROSS_TABS)

  channel.postMessage(key)
  channel.close()
}

function readStored(key: string, stored: string | undefined) {
  const said = cookieIn(document.cookie, key)

  if (said !== undefined) {
    return said
  }

  if (unstored.has(key)) {
    return unstored.get(key) ?? undefined
  }

  return touched.has(key) ? undefined : stored
}

/** A value kept in a cookie of its own, the same in every tab: what the server read from the request is what the page starts with, and a change here or in another tab reaches every component that reads it. Setting undefined takes the cookie away. */
export function useStoredText(
  key: string,
  stored: string | undefined,
): [string | undefined, (next: string | undefined) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const otherTabs =
        typeof BroadcastChannel === 'function'
          ? new BroadcastChannel(ACROSS_TABS)
          : null

      function fromAnotherTab(event: MessageEvent) {
        if (event.data === key) {
          touched.add(key)
          unstored.delete(key)
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

  const read = useCallback(() => readStored(key, stored), [key, stored])

  const readOnTheServer = useCallback(() => stored, [stored])

  const value = useSyncExternalStore(subscribe, read, readOnTheServer)

  const set = useCallback(
    (next: string | undefined) => {
      touched.add(key)
      unstored.delete(key)
      document.cookie =
        next === undefined ? forgettingCookie(key) : storingCookie(key, next)

      if (cookieIn(document.cookie, key) !== next) {
        console.warn(`[useStoredText] the cookie was not kept for ${key}`)

        unstored.set(key, next ?? null)
      }

      window.dispatchEvent(new Event(CHANGED))
      tellTheOtherTabs(key)
    },
    [key],
  )

  return [value, set]
}
