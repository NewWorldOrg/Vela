'use client'

import { useSyncExternalStore } from 'react'

import { PHONE_EITHER_WAY, PHONE_ON_ITS_SIDE, PHONE_UPRIGHT } from '@/lib/phone'

function followed(query: string): (notify: () => void) => () => void {
  return (notify) => {
    const mediaQuery = window.matchMedia(query)

    mediaQuery.addEventListener('change', notify)

    return () => mediaQuery.removeEventListener('change', notify)
  }
}

const followTheUpright = followed(PHONE_UPRIGHT)
const followTheSide = followed(PHONE_ON_ITS_SIDE)
const followEitherWay = followed(PHONE_EITHER_WAY)

function notOnTheServer(): boolean {
  return false
}

/** Whether the window is a phone held upright; not on the server, where nothing is laid out. Asked of the window, not of a board, because a board's own width moves with what opens beside and under it. */
export function usePhoneUpright(): boolean {
  return useSyncExternalStore(
    followTheUpright,
    () => window.matchMedia(PHONE_UPRIGHT).matches,
    notOnTheServer,
  )
}

/** Whether the window is a phone held on its side; not on the server. */
export function usePhoneOnItsSide(): boolean {
  return useSyncExternalStore(
    followTheSide,
    () => window.matchMedia(PHONE_ON_ITS_SIDE).matches,
    notOnTheServer,
  )
}

/** Whether the window is a phone held either way; not on the server. */
export function useOnAPhone(): boolean {
  return useSyncExternalStore(
    followEitherWay,
    () => window.matchMedia(PHONE_EITHER_WAY).matches,
    notOnTheServer,
  )
}
