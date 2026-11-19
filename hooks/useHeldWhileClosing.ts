import { useState } from 'react'

export interface Held<T> {
  value: T | null
  held: T | null
}

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
