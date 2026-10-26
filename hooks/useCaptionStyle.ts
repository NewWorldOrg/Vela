'use client'

import { useCallback, useEffect, useMemo } from 'react'

import {
  CAPTION_STYLE_COOKIE,
  captionStyleOf,
  captionStyleSpelling,
  type CaptionStyle,
} from '@/lib/caption-style'
import { cookieIn, storingCookie } from '@/lib/stored-flag'
import { useStoredText } from '@/hooks/useStoredText'

/** The caption style this browser keeps, the same in every tab, starting from what the server read. Opening a player writes the cookie again, since Safari lets a cookie written by the page lapse after seven days. */
export function useCaptionStyle(
  stored: CaptionStyle,
): [CaptionStyle, (next: CaptionStyle) => void] {
  const [said, setSaid] = useStoredText(
    CAPTION_STYLE_COOKIE,
    captionStyleSpelling(stored),
  )

  const style = useMemo(() => captionStyleOf(said), [said])

  const set = useCallback(
    (next: CaptionStyle) => setSaid(captionStyleSpelling(next)),
    [setSaid],
  )

  useEffect(() => {
    const kept = cookieIn(document.cookie, CAPTION_STYLE_COOKIE)

    if (kept) {
      document.cookie = storingCookie(CAPTION_STYLE_COOKIE, kept)
    }
  }, [])

  return [style, set]
}
