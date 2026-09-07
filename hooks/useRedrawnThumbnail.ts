'use client'

import { useCallback, useSyncExternalStore } from 'react'

const CHANGED = 'vela-thumbnail-redrawn'

const KEY = 'vela-thumbnail-redrawn:'

const unstored = new Map<string, number>()

function unset(): undefined {
  return undefined
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange)

  return () => window.removeEventListener(CHANGED, onChange)
}

export function noteThumbnailRedrawn(id: string, at: number = Date.now()) {
  try {
    window.sessionStorage.setItem(`${KEY}${id}`, String(at))
  } catch (error) {
    console.warn(`[useRedrawnThumbnail] write failed for ${id}`, error)

    unstored.set(id, at)
  }

  window.dispatchEvent(new Event(CHANGED))
}

export function useRedrawnThumbnail(id: string): number | undefined {
  const read = useCallback(() => {
    let held: string | null = null

    try {
      held = window.sessionStorage.getItem(`${KEY}${id}`)
    } catch (error) {
      console.warn(`[useRedrawnThumbnail] read failed for ${id}`, error)

      return unstored.get(id)
    }

    return held === null ? undefined : Number(held)
  }, [id])

  return useSyncExternalStore(subscribe, read, unset)
}
