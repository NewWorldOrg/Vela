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

export const RECONNECT_MS = 10_000

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

function SessionEndedBanner({ returnPath }: { returnPath: string }) {
  return (
    <Banner
      tone="danger"
      actions={[{ label: 'ログイン', href: loginHref(returnPath) as Route }]}
    >
      <b className="block font-bold">セッションが切れました。</b>
    </Banner>
  )
}

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
