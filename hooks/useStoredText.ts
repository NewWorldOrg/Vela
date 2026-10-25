'use client'

import { useCallback, useSyncExternalStore } from 'react'

import { cookieIn, forgettingCookie, storingCookie } from '@/lib/stored-flag'

const CHANGED = 'vela-stored-flag-changed'

const ACROSS_TABS = 'vela-stored-flag'

/** This page among the tabs: what it tells the others carries it, so it does not take its own word as another tab's. */
const THIS_PAGE = Math.random().toString(36).slice(2)

/** What was set in this page but could not be kept in a cookie, and null for what was taken away. */
const unstored = new Map<string, string | null>()

/** The keys set or taken away since the page was opened, here or in another tab: for them, no cookie means nothing, not what the page started with. */
const touched = new Set<string>()

interface Told {
  key: string
  from: string
}

function toldByAnotherTab(said: unknown, key: string): boolean {
  if (typeof said !== 'object' || said === null) {
    return false
  }

  const told = said as Partial<Told>

  return told.key === key && told.from !== THIS_PAGE
}

function tellTheOtherTabs(key: string): void {
  if (typeof BroadcastChannel !== 'function') {
    return
  }

  const channel = new BroadcastChannel(ACROSS_TABS)
  const told: Told = { key, from: THIS_PAGE }

  channel.postMessage(told)
  channel.close()
}

/** Follows a stored value: `onChange` is told when it is set in this page or in another tab. */
export function followStoredText(
  key: string,
  onChange: () => void,
): () => void {
  const otherTabs =
    typeof BroadcastChannel === 'function'
      ? new BroadcastChannel(ACROSS_TABS)
      : null

  function fromAnotherTab(event: MessageEvent) {
    if (toldByAnotherTab(event.data, key)) {
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
}

/** The stored value as this page knows it: the cookie, what could not be kept in one, or what the page started with while nothing has been set. */
export function readStoredText(
  key: string,
  stored: string | undefined,
): string | undefined {
  const said = cookieIn(document.cookie, key)

  if (said !== undefined) {
    return said
  }

  if (unstored.has(key)) {
    return unstored.get(key) ?? undefined
  }

  return touched.has(key) ? undefined : stored
}

/** Keeps a value in its cookie, or takes the cookie away for undefined, and tells this page and the other tabs. A value the browser will not keep in a cookie is kept for this page instead. */
export function storeText(key: string, next: string | undefined): void {
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
}

/** A value kept in a cookie of its own, the same in every tab: what the server read from the request is what the page starts with, and a change here or in another tab reaches every component that reads it. Setting undefined takes the cookie away. */
export function useStoredText(
  key: string,
  stored: string | undefined,
): [string | undefined, (next: string | undefined) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => followStoredText(key, onChange),
    [key],
  )

  const read = useCallback(() => readStoredText(key, stored), [key, stored])

  const readOnTheServer = useCallback(() => stored, [stored])

  const value = useSyncExternalStore(subscribe, read, readOnTheServer)

  const set = useCallback(
    (next: string | undefined) => storeText(key, next),
    [key],
  )

  return [value, set]
}
