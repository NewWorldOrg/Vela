'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_SIZES, type PageSize } from '@/types/dataTable'

/**
 * Persists a list table's per-page value to localStorage under one global key,
 * so changing it on one screen carries to others.
 *
 * - Multiple hook instances on the same page sync via a `CustomEvent`; other
 *   tabs/windows sync via the `storage` event.
 * - Invalid / out-of-range / Storage-exception values fall back to
 *   `defaultPerPage` and emit `console.warn` (never a silent failure).
 *
 * SSR / hydration note: on the server this hook yields `defaultPerPage`
 * (localStorage is unavailable), but on the client the lazy initializer reads
 * the persisted value, which may differ. So the first paint must use the parent
 * Server Component's initial value rather than this hook's `perPage`, to avoid a
 * hydration mismatch. This hook is for the post-mount refetch trigger.
 */

export const STORAGE_PREFIX = 'next-base-per-page-'
export const GLOBAL_STORAGE_KEY = 'global'
const STORAGE_KEY = STORAGE_PREFIX + GLOBAL_STORAGE_KEY
const SAME_WINDOW_SYNC_EVENT = 'next-base-per-page-changed'

function isValidPerPage(parsed: number): parsed is PageSize {
  if (!Number.isSafeInteger(parsed)) return false
  return (PAGE_SIZES as readonly number[]).includes(parsed)
}

function parsePerPage(raw: string | null): PageSize | null {
  if (raw == null) return null
  // Accept only a canonical positive integer (reject '050', ' 20', '20.5', …).
  if (!/^(0|[1-9]\d*)$/.test(raw)) return null
  const parsed = Number(raw)
  return isValidPerPage(parsed) ? parsed : null
}

function readStoredPerPage(): PageSize | null {
  if (typeof window === 'undefined') return null
  try {
    return parsePerPage(window.localStorage.getItem(STORAGE_KEY))
  } catch (error) {
    console.warn('[usePerPageLocalStorage] read failed', error)
    return null
  }
}

function writeStoredPerPage(value: PageSize) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch (error) {
    console.warn(
      `[usePerPageLocalStorage] write failed (value=${value})`,
      error,
    )
  }
}

export interface UsePerPageLocalStorageOptions {
  /** Value used when localStorage is empty or invalid. */
  defaultPerPage: PageSize
  /**
   * Called on mount (or when another instance updates the value) if the stored
   * value differs from the current React state — e.g. to refetch the table.
   * A rejected promise is caught and logged. Identity need not be stable.
   */
  onInitialMismatch?: () => void | Promise<void>
}

export interface UsePerPageLocalStorageResult {
  perPage: PageSize
  /** Ref-stable setter (identity is stable like a `useState` setter). */
  setPerPage: (next: PageSize) => void
}

interface InitialState {
  perPage: PageSize
  mismatch: boolean
}

export function usePerPageLocalStorage(
  options: UsePerPageLocalStorageOptions,
): UsePerPageLocalStorageResult {
  const { defaultPerPage } = options

  const [initial] = useState<InitialState>(() => {
    const stored = readStoredPerPage()
    return {
      perPage: stored ?? defaultPerPage,
      mismatch: stored !== null && stored !== defaultPerPage,
    }
  })

  const [perPage, setPerPageState] = useState<PageSize>(initial.perPage)

  // Mirror of the latest perPage so cross-instance/tab handlers can compare
  // against the current value without performing side effects inside a state
  // updater (which React may double-invoke in StrictMode).
  const perPageRef = useRef(perPage)
  useEffect(() => {
    perPageRef.current = perPage
  })

  const onInitialMismatchRef = useRef(options.onInitialMismatch)
  useEffect(() => {
    onInitialMismatchRef.current = options.onInitialMismatch
  })

  function runMismatchCallback() {
    const cb = onInitialMismatchRef.current
    if (!cb) return
    try {
      const result = cb()
      if (result instanceof Promise) {
        result.catch((err) =>
          console.warn(
            '[usePerPageLocalStorage] onInitialMismatch rejected',
            err,
          ),
        )
      }
    } catch (err) {
      console.warn('[usePerPageLocalStorage] onInitialMismatch threw', err)
    }
  }

  const setPerPage = useCallback((next: PageSize) => {
    setPerPageState(next)
    writeStoredPerPage(next)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent<PageSize>(SAME_WINDOW_SYNC_EVENT, { detail: next }),
      )
    }
  }, [])

  // Receive per-page changes from other instances (same window) / tabs (storage).
  useEffect(() => {
    if (typeof window === 'undefined') return
    function applyExternalChange(next: PageSize | null) {
      if (next == null || next === perPageRef.current) return
      setPerPageState(next)
      runMismatchCallback()
    }
    function handleSameWindow(e: Event) {
      applyExternalChange((e as CustomEvent<PageSize>).detail)
    }
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      applyExternalChange(parsePerPage(e.newValue))
    }
    window.addEventListener(SAME_WINDOW_SYNC_EVENT, handleSameWindow)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(SAME_WINDOW_SYNC_EVENT, handleSameWindow)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Fire onInitialMismatch once after mount when stored != default.
  const didRunRef = useRef(false)
  useEffect(() => {
    if (didRunRef.current) return
    didRunRef.current = true
    if (initial.mismatch) runMismatchCallback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    perPage,
    setPerPage,
  }
}
