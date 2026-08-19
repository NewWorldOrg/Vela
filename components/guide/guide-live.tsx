'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import {
  APP_EVENTS_PATH,
  EPG_COLLECTION_EVENT,
  PROGRAMS_EVENT,
} from '@/repository/events'

const DEBOUNCE_MS = 200

const RECONNECT_MS = 10_000

/**
 * Re-reads the page when the event hub signals that programmes or the
 * collection ledger moved. Signals carry no payload, so a burst of them is
 * debounced into one re-read, held in a transition so the guide on screen
 * stays put while the new one arrives. A dropped stream is retried; the
 * built-in retry only covers network blips, not a refused subscription.
 */
export function GuideLive() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | undefined
    let reconnect: ReturnType<typeof setTimeout> | undefined
    let source: EventSource | undefined
    let unmounted = false

    const signalled = () => {
      clearTimeout(debounce)
      debounce = setTimeout(
        () => startTransition(() => router.refresh()),
        DEBOUNCE_MS,
      )
    }

    const listen = () => {
      source = new EventSource(APP_EVENTS_PATH)
      source.addEventListener(PROGRAMS_EVENT, signalled)
      source.addEventListener(EPG_COLLECTION_EVENT, signalled)
      source.onerror = () => {
        if (source?.readyState === EventSource.CLOSED && !unmounted) {
          reconnect = setTimeout(listen, RECONNECT_MS)
        }
      }
    }

    listen()

    return () => {
      unmounted = true
      clearTimeout(debounce)
      clearTimeout(reconnect)
      source?.close()
    }
  }, [router, startTransition])

  return null
}
