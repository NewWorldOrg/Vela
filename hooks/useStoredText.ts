'use client'

import { useCallback, useSyncExternalStore } from 'react'

import { cookieIn, forgettingCookie, storingCookie } from '@/lib/stored-flag'

const CHANGED = 'vela-stored-flag-changed'

const ACROSS_TABS = 'vela-stored-flag'

const THIS_PAGE = Math.random().toString(36).slice(2)

const unstored = new Map<string, string | null>()

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
