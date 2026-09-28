'use client'

import { useSyncExternalStore } from 'react'

const listenToNothing = (): (() => void) => () => undefined

/** サーバの HTML を組み上げている(hydration の)間だけ true。ブラウザで組んだときは false。 */
export function useCameWithTheHtml(): boolean {
  return useSyncExternalStore(
    listenToNothing,
    () => false,
    () => true,
  )
}
