'use client'

import { useCallback } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { LiveScreen } from '@/repository/live'
import { ScreenMain } from '@/components/vela/app-shell'
import { PLAYER_COLUMN } from '@/components/recordings/player-palette'
import { ChannelList } from '@/components/live/channel-list'
import { LivePlayer } from '@/components/live/live-player'
import type { OpenSocket } from '@/components/live/live-session'
import { NowNext } from '@/components/live/now-next'

/**
 * The live screen: the picture, what is on it, and the channels it is chosen
 * from. Full width, because the picture and the list are read side by side.
 *
 * Full width is the screen and not the picture: the player's board stops at the
 * step the default screens are read at, and what is on now stops with it, so
 * the two stay one column with the list beside them however wide the window is.
 *
 * The channel and the broadcast type are in the URL — a second reader opening
 * the link sees the same channel, and a reload brings it back. Choosing a
 * channel changes the URL, the screen re-reads what is on it, and the player
 * opens the new wire once the channel reaches it.
 */
export function LiveView({
  screen,
  openSocket,
  askSignedOut,
}: {
  screen: LiveScreen
  openSocket?: OpenSocket
  askSignedOut?: () => Promise<boolean>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  const patch = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(next)) {
        if (value == null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      const qs = params.toString()

      router.replace((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )

  const watching = screen.watching

  return (
    <ScreenMain
      width="full"
      className="flex items-start gap-[26px] px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[30px] max-[1180px]:flex-col"
    >
      <div className={cn('min-w-0 flex-1', PLAYER_COLUMN)}>
        <LivePlayer
          channel={watching?.channel}
          profiles={screen.profiles}
          returnPath={query ? `${pathname}?${query}` : pathname}
          openSocket={openSocket}
          askSignedOut={askSignedOut}
        />
        {watching && <NowNext watching={watching} />}
      </div>
      <aside
        aria-label="チャンネル"
        className="sticky top-[62px] flex max-h-[calc(100dvh-78px)] w-[344px] shrink-0 flex-col max-[1180px]:static max-[1180px]:max-h-[60dvh] max-[1180px]:w-full"
      >
        <ChannelList
          kind={screen.kind}
          channels={screen.channels}
          watchingId={watching?.channel.id}
          onKind={(kind) =>
            patch({ kind: kind === 'terrestrial' ? null : kind })
          }
          onSelect={(channel) => patch({ ch: channel.id })}
        />
      </aside>
    </ScreenMain>
  )
}
