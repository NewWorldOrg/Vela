'use client'

import type { ReactElement } from 'react'

import { channelInFull } from '@/lib/live-in-full'
import type { LiveChannel } from '@/repository/live'
import { InFull } from '@/components/vela/in-full'

export function ChannelInFull({
  channel,
  children,
}: {
  channel: LiveChannel
  children: ReactElement<{ className?: string; tabIndex?: number }>
}) {
  const said = channelInFull(channel)

  return (
    <InFull
      alreadyFocusable
      says={
        <>
          <b className="block font-bold">{said.name}</b>
          {said.now && <span className="mt-1 block">{said.now}</span>}
          {said.description && (
            <span className="mt-1 block text-ink-2">{said.description}</span>
          )}
          {said.next && (
            <span className="mt-1 block text-ink-3">
              次 <span className="font-code">{said.next.at}</span>{' '}
              {said.next.title}
            </span>
          )}
        </>
      }
    >
      {children}
    </InFull>
  )
}
