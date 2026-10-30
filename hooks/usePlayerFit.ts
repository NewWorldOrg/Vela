'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import { fitOf, type PlayerFit } from '@/lib/player-fit'

function nothingToFollow(): () => void {
  return () => undefined
}

function wideOnTheServer(): PlayerFit {
  return 'wide'
}

/** The layout of the player's controls for the width its board is laid out at and the width its wide row needs, following the board as it changes. The layout width, not the drawn one: a screen that rises in is drawn scaled for a moment, and no resize follows when it settles. */
export function usePlayerFit(
  board: HTMLElement | null,
  needs: number,
  settle = 0,
): PlayerFit {
  const was = useRef<PlayerFit>('wide')
  const follow = useCallback(
    (notify: () => void) => {
      if (!board) {
        return nothingToFollow()
      }

      const resizing = new ResizeObserver(notify)

      resizing.observe(board)

      return () => resizing.disconnect()
    },
    [board],
  )

  const fit = useSyncExternalStore(
    follow,
    () => fitOf(board ? board.offsetWidth : 0, needs, was.current, settle),
    wideOnTheServer,
  )

  useEffect(() => {
    was.current = fit
  }, [fit])

  return fit
}

/** A phone held on its side: a finger's screen whose window is short and wide. */
export const PHONE_ON_ITS_SIDE =
  '(pointer: coarse) and (orientation: landscape) and (height < 600px)'

function followTheSide(notify: () => void): () => void {
  const query = window.matchMedia(PHONE_ON_ITS_SIDE)

  query.addEventListener('change', notify)

  return () => query.removeEventListener('change', notify)
}

function notOnTheServer(): boolean {
  return false
}

/** Whether the window is a phone held on its side; not on the server. */
export function usePhoneOnItsSide(): boolean {
  return useSyncExternalStore(
    followTheSide,
    () => window.matchMedia(PHONE_ON_ITS_SIDE).matches,
    notOnTheServer,
  )
}

/** A phone held upright: a window narrower than 600px. */
export const PHONE_WIDTH = '(width < 600px)'

function followTheWidth(notify: () => void): () => void {
  const query = window.matchMedia(PHONE_WIDTH)

  query.addEventListener('change', notify)

  return () => query.removeEventListener('change', notify)
}

/** Whether the window is a phone's width; not on the server. Asked of the window, not of the board, because the board's own width moves with what opens beside and under it. */
export function usePhoneWidth(): boolean {
  return useSyncExternalStore(
    followTheWidth,
    () => window.matchMedia(PHONE_WIDTH).matches,
    notOnTheServer,
  )
}
