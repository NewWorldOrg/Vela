'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

type Settlement<T> = { value: T } | { error: unknown }

const settled = new WeakMap<Promise<unknown>, Settlement<unknown>>()

const watched = new WeakSet<Promise<unknown>>()

export function settlementOf<T>(
  promise: Promise<T>,
): Settlement<T> | undefined {
  return settled.get(promise) as Settlement<T> | undefined
}

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

export interface Kept<T> {
  key: string
  value: T
}

export function keptWhileSettling<T>(
  waiting: boolean,
  settled: T | undefined,
  kept: Kept<T> | null,
  key: string,
): T | undefined {
  if (settled !== undefined) {
    return settled
  }

  return waiting && kept?.key === key ? kept.value : undefined
}

export function useSettledKept<T>(
  promise: Promise<T> | undefined,
  key: string,
): T | undefined {
  const settled = useSettled(promise)
  const [kept, keep] = useState<Kept<T> | null>(null)

  if (settled !== undefined && (kept?.value !== settled || kept.key !== key)) {
    keep({ key, value: settled })
  }

  return keptWhileSettling(promise !== undefined, settled, kept, key)
}
