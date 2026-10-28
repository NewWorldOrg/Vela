'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

type Settlement<T> = { value: T } | { error: unknown }

const settled = new WeakMap<Promise<unknown>, Settlement<unknown>>()

const watched = new WeakSet<Promise<unknown>>()

/** What a promise settled with, or nothing while it has not, held as one object for as long as the promise lives. */
export function settlementOf<T>(
  promise: Promise<T>,
): Settlement<T> | undefined {
  return settled.get(promise) as Settlement<T> | undefined
}

/** Tells `then` once the promise has settled and what it settled with can be read. Returns how to stop being told. */
export function whenSettled(
  promise: Promise<unknown>,
  then: () => void,
): () => void {
  if (!watched.has(promise)) {
    watched.add(promise)
    promise.then(
      (value) => settled.set(promise, { value }),
      (error: unknown) => settled.set(promise, { error }),
    )
  }

  let listening = true
  const tell = () => {
    if (listening) {
      then()
    }
  }

  promise.then(tell, tell)

  return () => {
    listening = false
  }
}

/** What a promise handed down from the server settled with, read without suspending: nothing in the server's HTML and while it is on its way, its value once it has come. A failure is thrown where it is read. */
export function useSettled<T>(promise: Promise<T> | undefined): T | undefined {
  const subscribe = useCallback(
    (notify: () => void) =>
      promise ? whenSettled(promise, notify) : () => undefined,
    [promise],
  )
  const settlement = useSyncExternalStore(
    subscribe,
    () => (promise ? settlementOf(promise) : undefined),
    () => undefined,
  )

  if (settlement && 'error' in settlement) {
    throw settlement.error
  }

  return settlement?.value
}

/** What a promise last settled with, and for which page: its day and kind. */
export interface Kept<T> {
  key: string
  value: T
}

/** What to show while a promise is on its way: what it settled with once it has, and until then what the last one settled with, if that was for the same page. */
export function keptWhileSettling<T>(
  settled: T | undefined,
  kept: Kept<T> | null,
  key: string,
): T | undefined {
  if (settled !== undefined) {
    return settled
  }

  return kept?.key === key ? kept.value : undefined
}

/** `useSettled`, holding on to what the last promise for the same page settled with while a new one, handed down by a refresh, is on its way. */
export function useSettledKept<T>(
  promise: Promise<T> | undefined,
  key: string,
): T | undefined {
  const settled = useSettled(promise)
  const [kept, keep] = useState<Kept<T> | null>(null)

  if (settled !== undefined && (kept?.value !== settled || kept.key !== key)) {
    keep({ key, value: settled })
  }

  return keptWhileSettling(settled, kept, key)
}
