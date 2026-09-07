'use client'

import { useCallback } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import { foldedLineupOf, foldsAChannel } from '@/lib/live-lineup'
import { foldColumn } from '@/lib/live-fold'
import { useChannelsFolded } from '@/hooks/useChannelsFolded'
import { useLiveSubChannelsFolded } from '@/hooks/useLiveSubChannelsFolded'
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

const OVER_THE_PICTURE = cn(
  PLAYER_COLUMN,
  'max-[1180px]:max-w-none',
  'min-[1181px]:pointer-events-none min-[1181px]:relative min-[1181px]:col-start-1 min-[1181px]:row-start-1 min-[1181px]:aspect-video',
)

export function LiveView({
  screen,
  openSocket,
  askSignedOut,
  askBacklog,
  startupDeadlineMs,
  takeCapture,
}: {
  screen: LiveScreen
  openSocket?: OpenSocket
  askSignedOut?: () => Promise<boolean>
  askBacklog?: AskBacklog
  startupDeadlineMs?: number
  takeCapture?: TakeCapture
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
  const choose = (id: string) => patch({ ch: id })
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
      className="grid grid-cols-1 items-start gap-[26px] px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[30px]"
    >
      <div
        className={cn(
          'min-w-0 min-[1181px]:col-start-1 min-[1181px]:row-start-1',
          PLAYER_COLUMN,
        )}
      >
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
      <div className={OVER_THE_PICTURE}>
        <aside
          aria-label="チャンネル"
          className={cn(
            'absolute top-0 right-0 z-20 flex max-h-[calc(100%-104px)] flex-col items-end overflow-clip [overflow-clip-margin:14px] pointer-events-auto',
            'min-[1181px]:rounded-xl min-[1181px]:bg-surface min-[1181px]:shadow-pop-xl min-[1181px]:outline-1 min-[1181px]:-outline-offset-1 min-[1181px]:outline-line-strong',
            'max-[1180px]:static max-[1180px]:max-h-[60dvh] max-[1180px]:w-full',
            foldColumn(away, motion),
          )}
        >
          <ChannelList
            kind={screen.kind}
            kinds={screen.kinds}
            channels={channels}
            watchingId={watching.channel.id}
            folded={away}
            onFold={fold}
            motion={motion}
            onKind={kind}
            onSelect={(channel) => choose(channel.id)}
            className={
              motion.shown ? 'w-full min-[1181px]:w-[344px]' : 'w-full'
            }
          />
        </aside>
      </div>
    </ScreenMain>
  )
}
