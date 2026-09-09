'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { SignalWatch } from '@/lib/app-signals'
import { loginHref } from '@/repository/auth'
import type { AppEvent } from '@/repository/events'
import { Banner } from '@/components/vela/banner'

export function RefreshOnSignal({ events }: { events: readonly AppEvent[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const query = useSearchParams().toString()
  const [, startTransition] = useTransition()
  const [ended, setEnded] = useState(false)
  const asked = events.join(' ')

  useEffect(() => {
    const watch = new SignalWatch(
      asked.split(' ') as AppEvent[],
      () => startTransition(() => router.refresh()),
      () => setEnded(true),
    )

    watch.listen()

    return () => watch.close()
  }, [asked, router, startTransition])

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
