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
