'use client'

import { useCallback } from 'react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import { foldedLineupOf, foldsAChannel } from '@/lib/live-lineup'
import { useChannelsFolded } from '@/hooks/useChannelsFolded'
import { useLiveSubChannelsFolded } from '@/hooks/useLiveSubChannelsFolded'
import type { LiveScreen } from '@/repository/live'
import { ScreenMain } from '@/components/vela/app-shell'
import { PLAYER_COLUMN } from '@/components/recordings/player-palette'
import { ChannelGrid } from '@/components/live/channel-grid'
import { ChannelKinds } from '@/components/live/channel-kinds'
import { ChannelList } from '@/components/live/channel-list'
import { LivePlayer } from '@/components/live/live-player'
import type { OpenSocket } from '@/components/live/live-session'
import { NowNext } from '@/components/live/now-next'

/**
 * The live screen, which is two screens.
 *
 * Before a channel is chosen it is a screen for choosing one: the channels
 * across the width as cards, with what is on each of them. Once one is chosen
 * it is a screen for watching: the picture takes the width, what is on it is
 * read under it, and the channels stand beside it as a list that folds away.
 *
 * It used to be the second of those with nothing in it — an empty 16:9 panel
 * where the picture would go, seven tenths of the width, with the channels in
 * a column beside it and nothing at all underneath. The shape of watching,
 * before there was anything to watch. What every product that has this screen
 * does instead is make the choosing the screen: KonomiTV and Chinachu open on
 * their channels, Plex and Jellyfin on theirs.
 *
 * The channel and the broadcast type are in the URL — a second reader opening
 * the link sees the same channel, and a reload brings it back. Choosing a
 * channel changes the URL, the screen re-reads what is on it, and the player
 * opens the new wire once the channel reaches it.
 *
 * That change is an entry in the history, not a rewrite of the one standing.
 * Rewritten, the screen with nothing chosen — the one every reader arrives at,
 * and the one the channels belong to — was thrown away the moment a channel
 * was pressed, so back left the live screen entirely and landed wherever the
 * reader had been before it.
 *
 * Every choice is an entry, the second and the tenth as much as the first: back
 * is the channel before this one, and back again the one before that, down to
 * the screen with nothing chosen. Measured on the services that do this for a
 * living, they all zap the same way — ABEMA, radiko, TVer and KonomiTV each add
 * an entry per change, so back on any of them is the last thing watched.
 * Collapsing the later ones would make back mean the choosing screen after the
 * second press and the previous channel after the first, which is a press whose
 * meaning depends on history the reader cannot see.
 *
 * There is no press that goes back to the choosing screen, because no product
 * that was measured has one: the way to another channel while watching is the
 * list beside the picture, which is KonomiTV's panel and Twitch's chat rail,
 * and the way back to the choosing screen is the way back to any screen.
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
  const [away, fold] = useChannelsFolded()
  /**
   * A station splits into two or three for the hours it has that much to show
   * and puts the one thing out on all of them for the rest of the day, so most
   * of the time most of the line-up is one programme listed two or three times
   * over. Folded, the splits showing nothing their station is not showing come
   * out — of the grid and of the list alike, because both are drawn from the
   * one line-up, and a fold that held on one of them would come undone the
   * moment a channel was chosen.
   *
   * It is offered only where it would take a card away, and only on the screen
   * where the channels are what is being read. It is the reader's, held in the
   * browser and not in the URL: the channel and the broadcast type are what a
   * second reader opening the link needs, and how many cards this one is
   * looking at is not.
   */
  const [subsFolded, foldSubs] = useLiveSubChannelsFolded()
  const foldable = foldsAChannel(screen.channels, watching?.channel.id)
  const channels =
    subsFolded && foldable
      ? foldedLineupOf(screen.channels, watching?.channel.id)
      : screen.channels

  const choose = (id: string) => patch({ ch: id })
  const kind = (value: string) =>
    patch({ kind: value === 'terrestrial' ? null : value })

  if (!watching) {
    return (
      <ScreenMain className="px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[30px]">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <ChannelKinds kind={screen.kind} onKind={kind} />
          {foldable && (
            <button
              type="button"
              aria-pressed={!subsFolded}
              onClick={() => foldSubs(!subsFolded)}
              className={cn(
                'tap-target ml-auto cursor-pointer rounded-full border border-edge bg-surface px-3.5 py-1.5 text-sub font-medium whitespace-nowrap text-ink-2 shadow-pop transition-[translate,box-shadow,color,background-color] duration-150 ease-toy hover:-translate-x-px hover:-translate-y-px hover:text-ink hover:shadow-pop-lg',
                !subsFolded &&
                  'border-brand bg-brand-soft font-bold text-brand',
              )}
            >
              副チャンネル
            </button>
          )}
        </div>
        <ChannelGrid
          channels={channels}
          onSelect={(channel) => choose(channel.id)}
        />
      </ScreenMain>
    )
  }

  return (
    <ScreenMain
      width="full"
      className="flex items-start gap-[26px] px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[30px] max-[1180px]:flex-col"
    >
      <div className={cn('min-w-0 flex-1', PLAYER_COLUMN)}>
        <LivePlayer
          channel={watching.channel}
          profiles={screen.profiles}
          returnPath={query ? `${pathname}?${query}` : pathname}
          openSocket={openSocket}
          askSignedOut={askSignedOut}
          startupDeadlineMs={startupDeadlineMs}
        />
        <NowNext watching={watching} />
      </div>
      {/*
        102px is what the list is not allowed to have: the top bar (46), the
        screen's own padding above it (16) and below it (40). Given less than
        it takes away — it was written as 78 — the list runs 24px past the
        bottom of the window, the document grows to hold it, and the page
        draws a scrollbar of its own beside the one the list already has.
      */}
      <aside
        aria-label="チャンネル"
        className={cn(
          'sticky top-[62px] flex max-h-[calc(100dvh-102px)] shrink-0 flex-col max-[1180px]:static max-[1180px]:max-h-[60dvh] max-[1180px]:w-full',
          away ? 'w-11' : 'w-[344px]',
        )}
      >
        <ChannelList
          kind={screen.kind}
          channels={channels}
          watchingId={watching.channel.id}
          folded={away}
          onFold={fold}
          onKind={kind}
          onSelect={(channel) => choose(channel.id)}
        />
      </aside>
    </ScreenMain>
  )
}
