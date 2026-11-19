'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import { fitOf, type PlayerFit } from '@/lib/player-fit'

function nothingToFollow(): () => void {
  return () => undefined
}

function wideOnTheServer(): PlayerFit {
  return 'wide'
}

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
