'use client'

import { startTransition, useEffect, useState } from 'react'

/** False for the first drawing, the server's HTML included, and true right after: the guide's frame is drawn first and its columns are filled in the browser. */
export function useFilledSoon(): boolean {
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    if (!filled) {
      startTransition(() => setFilled(true))
    }
  }, [filled])

  return filled
}
