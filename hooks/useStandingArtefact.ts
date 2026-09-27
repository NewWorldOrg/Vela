'use client'

import { useEffect, useEffectEvent } from 'react'

import type { StopListening } from '@/lib/app-signals'

export type ListenForEncodeJobs = (noticed: () => void) => StopListening

export function useStandingArtefact(
  listening: boolean,
  listen: ListenForEncodeJobs,
  ask: () => Promise<string | undefined>,
  heard: (standing: string | undefined) => void,
): void {
  const askNow = useEffectEvent(ask)
  const heardNow = useEffectEvent(heard)

  useEffect(() => {
    if (!listening) {
      return
    }

    let latest = 0

    const stop = listen(() => {
      const mine = (latest += 1)

      void askNow()
        .then((standing) => {
          if (mine === latest) {
            heardNow(standing)
          }
        })
        .catch((error) => {
          console.warn('[player] the standing artefact was not read', error)
        })
    })

    return () => {
      latest += 1
      stop()
    }
  }, [listening, listen])
}
