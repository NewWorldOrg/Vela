'use client'

import { useEffect, useLayoutEffect, useState } from 'react'

const CURTAIN_KEY = 'vela.curtain'

const RAISE = 'raise'

const useOnFirstPaint =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

export function askForTheCurtain(): void {
  try {
    window.sessionStorage.setItem(CURTAIN_KEY, RAISE)
  } catch {
    return
  }
}

function asked(): boolean {
  try {
    if (window.sessionStorage.getItem(CURTAIN_KEY) !== RAISE) {
      return false
    }

    window.sessionStorage.removeItem(CURTAIN_KEY)

    return true
  } catch {
    return false
  }
}

export function Curtain() {
  const [raising, setRaising] = useState<boolean>(false)

  useOnFirstPaint(() => {
    if (asked()) {
      setRaising(true)
    }
  }, [])

  if (!raising) {
    return null
  }

  return (
    <div
      data-slot="curtain"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex"
    >
      <span className="curtain-panel h-full flex-1 bg-bg [--curtain-away:-101%] [--curtain-round:0_0_0_100%]" />
      <span
        className="curtain-panel h-full flex-1 bg-bg [--curtain-away:101%] [--curtain-round:0_0_100%_0]"
        onAnimationEnd={() => setRaising(false)}
      />
    </div>
  )
}
