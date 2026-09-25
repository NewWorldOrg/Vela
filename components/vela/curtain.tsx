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
      className="pointer-events-none fixed inset-0 z-50"
    >
      <span className="curtain-panel absolute inset-y-0 left-0 w-[calc(50%+72px)] rounded-br-[72px] bg-bg [--curtain-away:-101%] [--curtain-crack:-8px]" />
      <span
        className="curtain-panel absolute inset-y-0 right-0 w-[calc(50%+72px)] rounded-bl-[72px] bg-bg [--curtain-away:101%] [--curtain-crack:8px]"
        onAnimationEnd={() => setRaising(false)}
      />
      <span className="curtain-line absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-brand" />
    </div>
  )
}
