'use client'

import { useEffect, useState } from 'react'

export function usePaintedAfter(ready: boolean): boolean {
  const [painted, setPainted] = useState(false)

  useEffect(() => {
    if (!ready || painted) {
      return
    }

    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPainted(true))
    })

    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [ready, painted])

  return painted
}
