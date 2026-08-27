'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { loginHref } from '@/repository/auth'
import {
  APP_EVENTS_PATH,
  EPG_COLLECTION_EVENT,
  PROGRAMS_EVENT,
} from '@/repository/events'
import { Banner } from '@/components/vela/banner'

const DEBOUNCE_MS = 200

/** Exported so a story holds the retry to the same clock the screen uses. */
export const RECONNECT_MS = 10_000

/**
 * Re-reads the page when the event hub signals that programmes or the
 * collection ledger moved. Signals carry no payload, so a burst of them is
 * debounced into one re-read, held in a transition so the guide on screen
 * stays put while the new one arrives.
 *
 * A dropped stream is retried; the built-in retry only covers network blips,
 * not a refused subscription. A refused session is not retried at all — the
 * stream is closed and the screen says so, rather than looking connected while
 * nothing ever arrives again.
 */
export function GuideLive() {
  const router = useRouter()
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const [, startTransition] = useTransition()
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | undefined
    let reconnect: ReturnType<typeof setTimeout> | undefined
    let source: EventSource | undefined
    let stopped = false

    const signalled = () => {
      clearTimeout(debounce)
      debounce = setTimeout(
        () => startTransition(() => router.refresh()),
        DEBOUNCE_MS,
      )
    }

    const dropped = async () => {
      source?.close()

      const refused = await sessionRefused()

      if (stopped) {
        return
      }

      if (refused) {
        stopped = true
        setEnded(true)

        return
      }

      reconnect = setTimeout(listen, RECONNECT_MS)
    }

    const listen = () => {
      source = new EventSource(APP_EVENTS_PATH)
      source.addEventListener(PROGRAMS_EVENT, signalled)
      source.addEventListener(EPG_COLLECTION_EVENT, signalled)
      source.onerror = () => {
        if (source?.readyState === EventSource.CLOSED && !stopped) {
          void dropped()
        }
      }
    }

    listen()

    return () => {
      stopped = true
      clearTimeout(debounce)
      clearTimeout(reconnect)
      source?.close()
    }
  }, [router, startTransition])

  if (!ended) {
    return null
  }

  return (
    <div className="px-3.5 pt-4 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <SessionEndedBanner
        returnPath={query ? `${pathname}?${query}` : pathname}
      />
    </div>
  )
}

/**
 * What is left of the guide once the hub refuses the session: the page on
 * screen is the last one that arrived, and the way back is a fresh sign-in.
 */
function SessionEndedBanner({ returnPath }: { returnPath: string }) {
  return (
    <Banner
      tone="danger"
      actions={[{ label: 'ログイン', href: loginHref(returnPath) as Route }]}
    >
      <b className="block font-bold">セッションが切れました。</b>
      接続を閉じました。再接続は行われません。ログインし直すと、番組表の自動更新に戻れます。
    </Banner>
  )
}

/**
 * `EventSource` reports a failure without a status, so the stream is opened
 * once by hand to read one. Anything other than a refusal is a blip worth
 * retrying. The body is never read — the ask is aborted as soon as the status
 * is known.
 */
async function sessionRefused(): Promise<boolean> {
  const ask = new AbortController()

  try {
    const response = await fetch(APP_EVENTS_PATH, {
      headers: { accept: 'text/event-stream' },
      cache: 'no-store',
      signal: ask.signal,
    })

    return response.status === 401
  } catch {
    return false
  } finally {
    ask.abort()
  }
}
