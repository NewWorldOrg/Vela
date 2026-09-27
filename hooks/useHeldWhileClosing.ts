import { useState } from 'react'

export interface Held<T> {
  value: T | null
  held: T | null
}

/** The next held state when the value a face is opened on changes, or undefined when nothing changed. */
export function holdWhileClosing<T>(
  last: Held<T>,
  value: T | null,
): (Held<T> & { openedAnew: boolean }) | undefined {
  if (value === last.value) {
    return undefined
  }

  return {
    value,
    held: value ?? last.held,
    openedAnew: value !== null,
  }
}

/** The value a face was last opened on, kept while it plays its way out. */
export function useHeldWhileClosing<T>(
  value: T | null,
  onOpenedAnew?: () => void,
): T | null {
  const [last, setLast] = useState<Held<T>>({ value, held: value })
  const next = holdWhileClosing(last, value)

  if (next !== undefined) {
    setLast({ value: next.value, held: next.held })

    if (next.openedAnew) {
      onOpenedAnew?.()
    }
  }

  return value ?? next?.held ?? last.held
}
