'use client'

import { useCallback, useSyncExternalStore } from 'react'

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
