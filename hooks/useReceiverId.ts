'use client'

import { useEffect, useState } from 'react'

import type { ReceiverId } from '@/lib/bml/line'
import type { LineRelay } from '@/repository/live-data-broadcast'

interface Named {
  relay: LineRelay
  id: ReceiverId | null
}

export function useReceiverId(
  relay: LineRelay | null,
  asks: boolean,
): ReceiverId | null {
  const [named, setNamed] = useState<Named | null>(null)

  useEffect(() => {
    if (!asks || relay === null) {
      return
    }

    let current = true

    void relay.receiverId().then((id) => {
      if (current) {
        setNamed({ relay, id })
      }
    })

    return () => {
      current = false
    }
  }, [relay, asks])

  return asks && named !== null && named.relay === relay ? named.id : null
}
