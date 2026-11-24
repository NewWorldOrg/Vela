'use client'

import { useCallback, useEffect, useState } from 'react'

import type { CaptionStyle } from '@/lib/caption-style'
import { useCaptionStyle } from '@/hooks/useCaptionStyle'
import { CaptionBoard } from '@/lib/caption-board'

export function useCaptionBoard(stored: CaptionStyle) {
  const [style, setStyle] = useCaptionStyle(stored)
  const [board] = useState(() => new CaptionBoard(style))

  useEffect(() => board.restyle(style), [board, style])

  useEffect(() => {
    board.whenMoved((shift) => setStyle({ ...style, shift }))

    return () => board.whenMoved(null)
  }, [board, style, setStyle])

  useEffect(() => () => board.close(), [board])

  const grip = useCallback(
    (element: HTMLDivElement | null) => board.gripBy(element),
    [board],
  )

  return { board, style, setStyle, grip }
}
