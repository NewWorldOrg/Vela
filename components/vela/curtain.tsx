'use client'

import { useCallback, useState } from 'react'

import { CURTAIN_ASKING, CURTAIN_FORGETTING } from '@/lib/curtain'

export function askForTheCurtain(): void {
  document.cookie = CURTAIN_ASKING
}

function allFinished(node: HTMLElement): Promise<unknown> {
  if (typeof node.getAnimations !== 'function') {
    return Promise.resolve()
  }

  return Promise.all(
    node.getAnimations({ subtree: true }).map((running) => running.finished),
  )
}

export function Curtain() {
  const [raising, setRaising] = useState<boolean>(true)

  const raised = useCallback((node: HTMLDivElement | null) => {
    if (node === null) {
      return
    }

    document.cookie = CURTAIN_FORGETTING

    let gone = false

    allFinished(node).then(
      () => {
        if (!gone) {
          setRaising(false)
        }
      },
      () => undefined,
    )

    return () => {
      gone = true
    }
  }, [])

  if (!raising) {
    return null
  }

  return (
    <div
      ref={raised}
      data-slot="curtain"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    >
      <span className="curtain-panel absolute inset-y-0 left-0 w-[calc(50%+72px)] rounded-br-[72px] bg-bg [--curtain-away:-101%] [--curtain-crack:-8px]" />
      <span className="curtain-panel absolute inset-y-0 right-0 w-[calc(50%+72px)] rounded-bl-[72px] bg-bg [--curtain-away:101%] [--curtain-crack:8px]" />
      <span className="curtain-line absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-brand" />
    </div>
  )
}
