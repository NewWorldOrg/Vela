'use client'

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { addressWith } from '@/lib/path'
import { cn } from '@/lib/utils'
import { foldedLineupOf, foldsAChannel } from '@/lib/live-lineup'
import { foldColumn, foldShown, type FoldMotion } from '@/lib/live-fold'
import { nextProgrammeChangeAt, screenAsOf } from '@/lib/live-clock'
import {
  channelBeingWatched,
  choiceStillStands,
  watchingChosen,
  type ChannelChoice,
} from '@/lib/live-choice'
import { useChannelsFolded } from '@/hooks/useChannelsFolded'
import { useWideWindow } from '@/hooks/useWideWindow'
import { useLiveSubChannelsFolded } from '@/hooks/useLiveSubChannelsFolded'
import { useLiveViewers } from '@/hooks/useLiveViewers'
import { useNow } from '@/hooks/useNow'
import { useReadAgain } from '@/hooks/useReadAgain'
import { liveHandover } from '@/lib/external-player'
import type { LiveScreen, TakeLiveTicket } from '@/repository/live'
import { Button } from '@/components/ui/button'
import { ScreenMain } from '@/components/vela/app-shell'
import { LiveIcon } from '@/components/vela/icons'
import { EmptyState } from '@/components/vela/empty-state'
import { PLAYER_COLUMN } from '@/components/recordings/player-palette'
import { OpenExternally } from '@/components/recordings/external-player'
import { ChannelGrid } from '@/components/live/channel-grid'
import { ChannelsMissing } from '@/components/live/channels-missing'
import { ChannelKinds } from '@/components/live/channel-kinds'
import { SubChannelToggle } from '@/components/vela/sub-channel-toggle'
import { ChannelList } from '@/components/live/channel-list'
import {
  atOnce,
  useFoldingChannels,
  useSettled,
} from '@/components/live/channel-fold'
import {
  COLUMN_BODY,
  ColumnSwitch,
  PLAYER_SIDE_COLUMN,
  RemoteSlot,
  type ColumnShows,
} from '@/components/live/remote-column'
import type { LineRelay } from '@/repository/live-data-broadcast'
import { LivePlayer } from '@/components/live/live-player'
import type { AskBacklog, OpenSocket } from '@/components/live/live-session'
import type { TakeCapture } from '@/components/recordings/take-capture'
import { NowNext } from '@/components/live/now-next'

const HEADING = 'heading mb-4 flex items-center gap-2 text-[calc(20rem/16)]'

const TICK_MS = 30_000

const COUNT_EVERY_MS = 60_000

/** A swap of what the column shows while it stays open: the list closed for the data broadcast leaving before the remote comes, the channels leaving before the remote comes, the remote leaving before the channels come, the channels coming, and the list coming back when the data broadcast closes. */
type Swap =
  | 'still'
  | 'closed-list-out'
  | 'channels-out'
  | 'remote-out'
  | 'channels-in'
  | 'closed-list-in'

function playing(
  phase: 'opening' | 'closing',
  onSettle: () => void,
): FoldMotion {
  return { shown: true, phase, staggered: true, onSettle }
}

function nothingToSettle() {}

/** The remote and the head over it come in from the right when they first stand. */
const COMING = playing('opening', nothingToSettle)

export function LiveView({
  screen: given,
  onTakeTicket,
  clockHeldAt,
  openSocket,
  askSignedOut,
  askBacklog,
  startupDeadlineMs,
  takeCapture,
  channelsFolded = false,
  subChannelsFolded = false,
  autoOpensDataBroadcast = false,
  lineRelayOf,
}: {
  screen: LiveScreen
  onTakeTicket: TakeLiveTicket
  clockHeldAt?: Date
  openSocket?: OpenSocket
  askSignedOut?: () => Promise<boolean>
  askBacklog?: AskBacklog
  startupDeadlineMs?: number
  takeCapture?: TakeCapture
  channelsFolded?: boolean
  autoOpensDataBroadcast?: boolean
  subChannelsFolded?: boolean
  lineRelayOf?: (channel: string) => LineRelay
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const clock = useNow(TICK_MS, clockHeldAt)
  const changesAt = useMemo(
    () => (clockHeldAt ? undefined : nextProgrammeChangeAt(given, new Date())),
    [given, clockHeldAt],
  )
  const readTheWholeScreenAgain = useCallback(
    () => startTransition(() => router.refresh()),
    [router],
  )

  useReadAgain(changesAt, undefined, readTheWholeScreenAgain)

  const viewers = useLiveViewers(clockHeldAt ? undefined : COUNT_EVERY_MS)
  const screen = clock ? screenAsOf(given, clock, viewers) : given

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  const patch = useCallback(
    (next: Record<string, string | null>) => {
      router.push(
        addressWith(pathname, searchParams.toString(), next) as Route,
        { scroll: false },
      )
    },
    [router, pathname, searchParams],
  )

  const asked = searchParams.get('ch') ?? undefined
  const answered = screen.watching?.channel.id
  const [choice, setChoice] = useState<ChannelChoice>()
  const standing = choiceStillStands(choice, asked)

  if (standing !== choice) {
    setChoice(standing)
  }

  const watchingId = channelBeingWatched(standing, asked, answered)
  const watching = clock
    ? watchingChosen(screen, standing?.chosen, clock)
    : screen.watching
  const wide = useWideWindow()
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const remoteOpen = broadcastOpen && wide
  const [touched, setTouched] = useState(false)
  const [shows, setShows] = useState<ColumnShows>('remote')
  const [swap, setSwap] = useState<Swap>('still')
  const [away, remember] = useChannelsFolded(channelsFolded)
  const folded = foldShown(away, { open: remoteOpen, touched })
  const pressFold = useCallback(
    (next: boolean) => {
      remember(next)

      if (remoteOpen) {
        setTouched(true)
      }
    },
    [remember, remoteOpen],
  )
  const { motion, fold, play } = useFoldingChannels(folded, pressFold)
  const [seenOpen, setSeenOpen] = useState(remoteOpen)

  if (seenOpen !== remoteOpen) {
    setSeenOpen(remoteOpen)
    setSwap('still')

    if (remoteOpen) {
      setShows('remote')

      if (away) {
        play(false)
      } else if (!atOnce()) {
        setSwap('closed-list-out')
      }
    } else {
      setTouched(false)

      if (away && !touched) {
        play(true)
      } else if (!away && shows === 'remote' && !atOnce()) {
        setSwap('closed-list-in')
      }
    }
  }

  const switchTo = (next: ColumnShows) => {
    if (next === shows || swap !== 'still') {
      return
    }

    setShows(next)

    if (!atOnce()) {
      setSwap(next === 'channels' ? 'remote-out' : 'channels-out')
    }
  }

  const aside = useRef<HTMLElement>(null)
  const [remoteSlot, setRemoteSlot] = useState<HTMLDivElement | null>(null)
  const slotId = useId()
  const openMode = remoteOpen && swap !== 'closed-list-out'

  useSettled(aside, openMode ? motion.phase : 'still', motion.onSettle)
  const [subsFolded, foldSubs] = useLiveSubChannelsFolded(subChannelsFolded)
  const foldable = foldsAChannel(screen.channels, watching?.channel.id)
  const channels =
    subsFolded && foldable
      ? foldedLineupOf(screen.channels, watching?.channel.id)
      : screen.channels

  const nothingIsOn =
    channels.length > 0 && channels.every((one) => one.now === undefined)
  const choose = (id: string) => {
    setChoice({ asked, chosen: id })
    patch({ ch: id })
  }
  const kind = (value: string) =>
    patch({ kind: value === 'terrestrial' ? null : value })

  if (!watching && screen.tuners === 0) {
    return (
      <ScreenMain className="px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)]">
        <h1 className={HEADING}>
          <LiveIcon className="size-[calc(22rem/16)] text-brand" />
          ライブ
        </h1>
        <EmptyState
          titleLevel={2}
          title="チューナーがありません"
          action={
            <Button variant="watch" size="sm" asChild>
              <Link href="/settings/tuners">チューナーへ</Link>
            </Button>
          }
        />
      </ScreenMain>
    )
  }

  if (!watching) {
    return (
      <ScreenMain className="px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)]">
        <h1 className={HEADING}>
          <LiveIcon className="size-[calc(22rem/16)] text-brand" />
          ライブ
        </h1>
        <div className="mb-3.5 flex flex-wrap items-center gap-3.5 empty:hidden">
          <ChannelKinds kind={screen.kind} kinds={screen.kinds} onKind={kind} />
          {foldable && (
            <SubChannelToggle
              shown={!subsFolded}
              onShownChange={(on) => foldSubs(!on)}
            />
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
            usher={null}
            titleLevel={2}
            title="まだ番組情報がありません"
            className="mt-3.5"
            action={
              <Button variant="watch" size="sm" asChild>
                <Link href="/guide">番組表へ</Link>
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
      className="flex items-start gap-[calc(26rem/16)] px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)] max-[1180px]:flex-col"
    >
      <div className={cn('min-w-0 flex-1', PLAYER_COLUMN)}>
        <LivePlayer
          channel={watching.channel}
          profiles={screen.profiles}
          returnPath={addressWith(pathname, query, {
            ch: watching.channel.id,
          })}
          openSocket={openSocket}
          askSignedOut={askSignedOut}
          askBacklog={askBacklog}
          startupDeadlineMs={startupDeadlineMs}
          takeCapture={takeCapture}
          autoOpensDataBroadcast={autoOpensDataBroadcast}
          lineRelayOf={lineRelayOf}
          remoteInTheColumn={wide}
          remoteSlot={remoteSlot}
          onDataBroadcastOpen={setBroadcastOpen}
        />
        <NowNext watching={watching} />
        <div className="mt-[calc(18rem/16)] flex flex-wrap items-start gap-[calc(9rem/16)]">
          <OpenExternally
            handover={liveHandover(
              watching.channel.networkId,
              watching.channel.serviceId,
              onTakeTicket,
              watching.channel.name,
              watching.channel.now?.title,
            )}
          />
        </div>
      </div>
      <aside
        ref={aside}
        aria-label="チャンネル"
        className={cn(
          PLAYER_SIDE_COLUMN,
          'max-[1180px]:static max-[1180px]:max-h-[60dvh] max-[1180px]:w-full',
          foldColumn(folded, motion),
        )}
      >
        {openMode && motion.shown ? (
          <div className={COLUMN_BODY}>
            <ColumnSwitch
              shows={shows}
              onShows={switchTo}
              folded={folded}
              onFold={fold}
              motion={motion.phase === 'still' ? COMING : motion}
              controls={slotId}
            />
            {(swap === 'remote-out' ||
              (shows === 'remote' && swap !== 'channels-out')) && (
              <RemoteSlot
                id={slotId}
                motion={remoteMotion(swap, motion)}
                onLeft={
                  swap === 'remote-out'
                    ? () => setSwap('channels-in')
                    : undefined
                }
                slotRef={setRemoteSlot}
              />
            )}
            {(swap === 'channels-out' ||
              (shows === 'channels' && swap !== 'remote-out')) && (
              <ChannelList
                kind={screen.kind}
                kinds={screen.kinds}
                channels={channels}
                watchingId={watchingId}
                motion={channelsMotion(swap, motion, () => setSwap('still'))}
                onKind={kind}
                onSelect={(channel) => choose(channel.id)}
                className="min-h-0 w-full flex-1"
              />
            )}
          </div>
        ) : (
          <ChannelList
            kind={screen.kind}
            kinds={screen.kinds}
            channels={channels}
            watchingId={watchingId}
            folded={folded}
            onFold={fold}
            motion={closedMotion(swap, motion, () => setSwap('still'))}
            onKind={kind}
            onSelect={(channel) => choose(channel.id)}
            className={
              motion.shown || swap !== 'still'
                ? 'w-full min-[1181px]:w-[calc(344rem/16)]'
                : 'w-full'
            }
          />
        )}
      </aside>
    </ScreenMain>
  )
}

/** The remote's motion: leaving for the channels, playing the column's fold, or coming in when it first stands. */
function remoteMotion(swap: Swap, fold: FoldMotion): FoldMotion {
  if (swap === 'remote-out') {
    return playing('closing', nothingToSettle)
  }

  return fold.phase === 'still' ? COMING : fold
}

/** The channels' motion while the data broadcast is open: leaving for the remote, coming after it, or playing the column's fold. */
function channelsMotion(
  swap: Swap,
  fold: FoldMotion,
  onSettle: () => void,
): FoldMotion {
  if (swap === 'channels-out') {
    return playing('closing', onSettle)
  }

  if (swap === 'channels-in') {
    return playing('opening', onSettle)
  }

  return fold
}

/** The list's motion while the data broadcast is closed or its remote not in the column: leaving for the remote when it opens, coming back when it closes, or playing the column's fold. */
function closedMotion(
  swap: Swap,
  fold: FoldMotion,
  onSettle: () => void,
): FoldMotion {
  if (swap === 'closed-list-out') {
    return playing('closing', onSettle)
  }

  if (swap === 'closed-list-in') {
    return playing('opening', onSettle)
  }

  return fold
}
