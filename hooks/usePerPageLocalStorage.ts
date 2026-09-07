'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_SIZES, type PageSize } from '@/types/dataTable'

export const STORAGE_PREFIX = 'vela-per-page-'
export const GLOBAL_STORAGE_KEY = 'global'
const STORAGE_KEY = STORAGE_PREFIX + GLOBAL_STORAGE_KEY
const SAME_WINDOW_SYNC_EVENT = 'vela-per-page-changed'

function isValidPerPage(parsed: number): parsed is PageSize {
  if (!Number.isSafeInteger(parsed)) {
    return false
  }
  return (PAGE_SIZES as readonly number[]).includes(parsed)
}

function parsePerPage(raw: string | null): PageSize | null {
  if (raw == null) {
    return null
  }
  if (!/^(0|[1-9]\d*)$/.test(raw)) {
    return null
  }
  const parsed = Number(raw)
  return isValidPerPage(parsed) ? parsed : null
}

function readStoredPerPage(): PageSize | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return parsePerPage(window.localStorage.getItem(STORAGE_KEY))
  } catch (error) {
    console.warn('[usePerPageLocalStorage] read failed', error)
    return null
  }
}

function writeStoredPerPage(value: PageSize) {
  if (typeof window === 'undefined') {
    return
  }
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
  defaultPerPage: PageSize
  onInitialMismatch?: () => void | Promise<void>
}

export interface UsePerPageLocalStorageResult {
  perPage: PageSize
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
    if (!cb) {
      return
    }
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    function applyExternalChange(next: PageSize | null) {
      if (next == null || next === perPageRef.current) {
        return
      }
      setPerPageState(next)
      runMismatchCallback()
    }
    function handleSameWindow(e: Event) {
      applyExternalChange((e as CustomEvent<PageSize>).detail)
    }
    function handleStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) {
        return
      }
      applyExternalChange(parsePerPage(e.newValue))
    }
    window.addEventListener(SAME_WINDOW_SYNC_EVENT, handleSameWindow)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(SAME_WINDOW_SYNC_EVENT, handleSameWindow)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const didRunRef = useRef(false)
  useEffect(() => {
    if (didRunRef.current) {
      return
    }
    didRunRef.current = true
    if (initial.mismatch) {
      runMismatchCallback()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    perPage,
    setPerPage,
  }
}
