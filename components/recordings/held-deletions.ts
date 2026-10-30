'use client'

import { useSyncExternalStore } from 'react'

/** The recordings whose deletion a phone holds back while its toast stands, so the lists leave them out before the deletion is sent. */
let held: ReadonlySet<string> = new Set()

const listeners = new Set<() => void>()

function told(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function holdDeletion(id: string): void {
  held = new Set([...held, id])
  told()
}

export function releaseDeletion(id: string): void {
  if (!held.has(id)) {
    return
  }

  held = new Set([...held].filter((one) => one !== id))
  told()
}

function follow(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

const NONE: ReadonlySet<string> = new Set()

/** The recordings held back from deletion just now; none on the server. */
export function useHeldDeletions(): ReadonlySet<string> {
  return useSyncExternalStore(
    follow,
    () => held,
    () => NONE,
  )
}
