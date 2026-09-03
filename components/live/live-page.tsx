'use client'

import { useCallback } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import { useChannelsFolded } from '@/hooks/useChannelsFolded'
import type { LiveScreen } from '@/repository/live'
import { ScreenMain } from '@/components/vela/app-shell'
import { PLAYER_COLUMN } from '@/components/recordings/player-palette'
import { ChannelList } from '@/components/live/channel-list'
import { LivePlayer } from '@/components/live/live-player'
import { LiveUnchosen } from '@/components/live/live-unchosen'
import type { OpenSocket } from '@/components/live/live-session'
import { NowNext } from '@/components/live/now-next'

/**
 * The live screen: the picture, what is on it, and the channels it is chosen
 * from, read side by side.
 *
 * The picture takes the column the list leaves it, up to the width the window's
 * height allows, and what is on now is held to the same width, so the two stay
 * one column with the list beside them however wide the window is.
 *
 * The screen is that wide only while there is a picture on it. Before a channel
 * is chosen there is nothing to spend the width on, and a full-width screen
 * spent it on nothing: at 2560 the list sat at one edge with two thirds of the
 * desk empty beside it. Unchosen, the screen is the step every other one is
 * read at, and choosing opens it out.
 *
 * The channel and the broadcast type are in the URL — a second reader opening
 * the link sees the same channel, and a reload brings it back. Choosing a
 * channel changes the URL, the screen re-reads what is on it, and the player
 * opens the new wire once the channel reaches it.
 *
 * That change is an entry in the history, not a rewrite of the one standing.
 * Rewritten, the screen with nothing chosen — the one every reader arrives at,
 * and the one the list belongs to — was thrown away the moment a channel was
 * pressed, so back left the live screen entirely and landed wherever the reader
 * had been before it. Pressed on a screen whose middle had just filled with a
 * picture, that reads as having been carried off to another page.
 *
 * Every choice is an entry, the second and the tenth as much as the first: back
 * is the channel before this one, and back again the one before that, down to
 * the screen with nothing chosen. Measured on the services that do this for a
 * living, both zap the same way — ABEMA's channel switcher and radiko's station
 * list each add an entry per change, so back on either is the last thing
 * watched. Collapsing the later ones would make back mean the empty screen
 * after the second press and the previous channel after the first, which is a
 * press whose meaning depends on history the reader cannot see.
 *
 * While a channel is being watched the list folds away, and the picture takes
 * the width it leaves. Before one is chosen it does not: the list is the whole
 * of the screen's business then, and a fold would leave a screen with one press
 * on it and nothing to press it for.
 */
export function LiveView({
  screen,
  openSocket,
  askSignedOut,
  startupDeadlineMs,
}: {
  screen: LiveScreen
  openSocket?: OpenSocket
  askSignedOut?: () => Promise<boolean>
  startupDeadlineMs?: number
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

      router.push((qs ? `${pathname}?${qs}` : pathname) as Route, {
        scroll: false,
      })
    },
    [router, pathname, searchParams],
  )

  const watching = screen.watching
  const [folded, fold] = useChannelsFolded()

  // Folded is the viewer's, and it is kept while they are watching. With
  // nothing on the picture the list is the screen, so it is opened out
  // whatever the last fold said, and the press that folds it is not offered.
  const away = folded && watching !== undefined

  return (
    <ScreenMain
      width={watching ? 'full' : 'default'}
      className="flex items-start gap-[26px] px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[30px] max-[1180px]:flex-col"
    >
      <div className={cn('min-w-0 flex-1', PLAYER_COLUMN)}>
        {watching ? (
          <>
            <LivePlayer
              channel={watching.channel}
              profiles={screen.profiles}
              returnPath={query ? `${pathname}?${query}` : pathname}
              openSocket={openSocket}
              askSignedOut={askSignedOut}
              startupDeadlineMs={startupDeadlineMs}
            />
            <NowNext watching={watching} />
          </>
        ) : (
          // With no channel to watch at all, the list beside this says so on
          // its own, and an invitation to choose from it would be the second
          // thing on the screen saying there is nothing to choose.
          screen.channels.length > 0 && <LiveUnchosen />
        )}
      </div>
      <aside
        aria-label="チャンネル"
        className={cn(
          'sticky top-[62px] flex max-h-[calc(100dvh-78px)] shrink-0 flex-col max-[1180px]:static max-[1180px]:max-h-[60dvh] max-[1180px]:w-full',
          away ? 'w-11' : 'w-[344px]',
        )}
      >
        <ChannelList
          kind={screen.kind}
          channels={screen.channels}
          watchingId={watching?.channel.id}
          folded={away}
          onFold={watching ? fold : undefined}
          onKind={(kind) =>
            patch({ kind: kind === 'terrestrial' ? null : kind })
          }
          onSelect={(channel) => patch({ ch: channel.id })}
        />
      </aside>
    </ScreenMain>
  )
}
