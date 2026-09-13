'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import { foldedLineupOf, foldsAChannel } from '@/lib/live-lineup'
import { foldColumn } from '@/lib/live-fold'
import { nextProgrammeChangeAt, screenAsOf } from '@/lib/live-clock'
import {
  channelBeingWatched,
  choiceStillStands,
  type ChannelChoice,
} from '@/lib/live-choice'
import { useChannelsFolded } from '@/hooks/useChannelsFolded'
import { useLiveSubChannelsFolded } from '@/hooks/useLiveSubChannelsFolded'
import { useNow } from '@/hooks/useNow'
import { useReadAgain } from '@/hooks/useReadAgain'
import type { LiveScreen } from '@/repository/live'
import { Button } from '@/components/ui/button'
import { ScreenMain } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { PLAYER_COLUMN } from '@/components/recordings/player-palette'
import { ChannelGrid } from '@/components/live/channel-grid'
import { ChannelsMissing } from '@/components/live/channels-missing'
import { ChannelKinds } from '@/components/live/channel-kinds'
import { ChannelList } from '@/components/live/channel-list'
import { useFoldingChannels } from '@/components/live/channel-fold'
import { LivePlayer } from '@/components/live/live-player'
import type { AskBacklog, OpenSocket } from '@/components/live/live-session'
import type { TakeCapture } from '@/components/recordings/take-capture'
import { NowNext } from '@/components/live/now-next'

const TICK_MS = 30_000

const READ_EVERY_MS = 60_000

export function LiveView({
  screen: given,
  clockHeldAt,
  openSocket,
  askSignedOut,
  askBacklog,
  startupDeadlineMs,
  takeCapture,
}: {
  screen: LiveScreen
  clockHeldAt?: Date
  openSocket?: OpenSocket
  askSignedOut?: () => Promise<boolean>
  askBacklog?: AskBacklog
  startupDeadlineMs?: number
  takeCapture?: TakeCapture
}) {
  const clock = useNow(TICK_MS, clockHeldAt)
  const screen = clock ? screenAsOf(given, clock) : given
  const changesAt = useMemo(
    () => (clockHeldAt ? undefined : nextProgrammeChangeAt(given, new Date())),
    [given, clockHeldAt],
  )

  useReadAgain(changesAt, clockHeldAt ? undefined : READ_EVERY_MS)

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
  const [away, remember] = useChannelsFolded()
  const { motion, fold } = useFoldingChannels(away, remember)
  const [subsFolded, foldSubs] = useLiveSubChannelsFolded()
  const foldable = foldsAChannel(screen.channels, watching?.channel.id)
  const channels =
    subsFolded && foldable
      ? foldedLineupOf(screen.channels, watching?.channel.id)
      : screen.channels

  const nothingIsOn =
    channels.length > 0 && channels.every((one) => one.now === undefined)
  const asked = searchParams.get('ch') ?? undefined
  const answered = watching?.channel.id
  const [choice, setChoice] = useState<ChannelChoice>()
  const standing = choiceStillStands(choice, asked)

  if (standing !== choice) {
    setChoice(standing)
  }

  const watchingId = channelBeingWatched(standing, asked, answered)
  const choose = (id: string) => {
    setChoice({ asked, chosen: id })
    patch({ ch: id })
  }
  const kind = (value: string) =>
    patch({ kind: value === 'terrestrial' ? null : value })

  if (!watching && screen.tuners === 0) {
    return (
      <ScreenMain className="px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[30px]">
        <EmptyState
          spot="tuner"
          titleLevel={2}
          title="チューナーが登録されていません"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/tuners">チューナー設定へ</Link>
            </Button>
          }
        />
      </ScreenMain>
    )
  }

  if (!watching) {
    return (
      <ScreenMain className="px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[30px]">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <ChannelKinds kind={screen.kind} kinds={screen.kinds} onKind={kind} />
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
        {screen.channels.length === 0 ? (
          <ChannelsMissing
            kind={screen.kind}
            kinds={screen.kinds}
            onKind={kind}
            titleLevel={2}
          />
        ) : (
          <ChannelGrid
            channels={channels}
            onSelect={(channel) => choose(channel.id)}
          />
        )}
        {nothingIsOn && (
          <EmptyState
            spot={null}
            title="EPG をまだ取得していません"
            className="mt-3.5"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/guide">EPG 取得の状況を見る</Link>
              </Button>
            }
          />
        )}
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
          askBacklog={askBacklog}
          startupDeadlineMs={startupDeadlineMs}
          takeCapture={takeCapture}
        />
        <NowNext watching={watching} />
      </div>
      <aside
        aria-label="チャンネル"
        className={cn(
          'sticky top-[62px] flex max-h-[calc(100dvh-102px)] shrink-0 flex-col items-end overflow-clip [overflow-clip-margin:14px] max-[1180px]:static max-[1180px]:max-h-[60dvh] max-[1180px]:w-full',
          foldColumn(away, motion),
        )}
      >
        <ChannelList
          kind={screen.kind}
          kinds={screen.kinds}
          channels={channels}
          watchingId={watchingId}
          folded={away}
          onFold={fold}
          motion={motion}
          onKind={kind}
          onSelect={(channel) => choose(channel.id)}
          className={motion.shown ? 'w-full min-[1181px]:w-[344px]' : 'w-full'}
        />
      </aside>
    </ScreenMain>
  )
}
