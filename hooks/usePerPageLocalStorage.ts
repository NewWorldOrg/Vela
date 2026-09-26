'use client'

import { useSyncExternalStore } from 'react'
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
}

export interface UsePerPageLocalStorageResult {
  perPage: PageSize
  setPerPage: (next: PageSize) => void
}

function followStoredPerPage(notify: () => void) {
  function handleStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY) {
      notify()
    }
  }
  window.addEventListener(SAME_WINDOW_SYNC_EVENT, notify)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(SAME_WINDOW_SYNC_EVENT, notify)
    window.removeEventListener('storage', handleStorage)
  }
}

function nothingStoredOnTheServer(): PageSize | null {
  return null
}

function setPerPage(next: PageSize) {
  writeStoredPerPage(next)
  window.dispatchEvent(
    new CustomEvent<PageSize>(SAME_WINDOW_SYNC_EVENT, { detail: next }),
  )
}

export function usePerPageLocalStorage({
  defaultPerPage,
}: UsePerPageLocalStorageOptions): UsePerPageLocalStorageResult {
  const stored = useSyncExternalStore(
    followStoredPerPage,
    readStoredPerPage,
    nothingStoredOnTheServer,
  )

  return {
    perPage: stored ?? defaultPerPage,
    setPerPage,
  }
}
