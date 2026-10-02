'use client'

import { useSyncExternalStore } from 'react'

import {
  NO_PLAYER_APPS,
  playerAppsOn,
  type PlayerApp,
} from '@/lib/external-player'

const listenToNothing = (): (() => void) => () => undefined

/** この端末で開けるプレイヤーのアプリ。サーバの HTML には無い。 */
export function usePlayerApps(): readonly PlayerApp[] {
  return useSyncExternalStore(
    listenToNothing,
    () => playerAppsOn(navigator),
    () => NO_PLAYER_APPS,
  )
}
