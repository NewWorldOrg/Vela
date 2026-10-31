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
import { liveWireHref } from '@/repository/live-paths'
import { MAIN_SOUND } from '@/repository/sounds'
import { unaskedIn } from '@/lib/live-profiles'
import {
  formatToPlay,
  type FormatChoice,
  type FormatProbe,
} from '@/lib/playback-format'
import { useFormatAnswers } from '@/hooks/useFormatAnswers'
import { browserProbe } from '@/components/vela/format-answers'
import { Button } from '@/components/ui/button'
import { ScreenMain } from '@/components/vela/app-shell'
import { ChevronDownIcon, LiveIcon } from '@/components/vela/icons'
import { EmptyState } from '@/components/vela/empty-state'
import {
  PLAYER_COLUMN,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'
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
import { LiveFeed } from '@/components/live/live-feed'
import type { OpenPlaylist } from '@/components/live/live-playlist'
import {
  openTheWireAhead,
  type AskBacklog,
  type OpenSocket,
} from '@/components/live/live-session'
import {
  wireFormatInUse,
  wireProfileInUse,
} from '@/components/live/live-wire-ahead'
import type { TakeCapture } from '@/components/recordings/take-capture'
import { NowNext } from '@/components/live/now-next'
import {
  PhoneChannelRows,
  PhoneKinds,
  PhoneLiveInfo,
  PhoneWatchedRows,
  RecordThisButton,
} from '@/components/live/phone-live'
import type { Phase } from '@/components/live/live-player'
import type { ReservationWrite } from '@/repository/reservations'
import { PHONE_UPRIGHT } from '@/lib/phone'
import {
  OnAnUprightPhone,
  OnAPhone,
} from '@/components/vela/on-an-upright-phone'
import { PhoneBarTools } from '@/components/vela/phone-bar-tools'
import { KeptAcrossTurns } from '@/components/vela/kept-across-turns'
import {
  PROGRAMME_FACE,
  SidewaysChannels,
} from '@/components/live/sideways-channels'
import type { CaptionStyle } from '@/lib/caption-style'

const HEADING =
  'heading mb-4 flex items-center gap-2 text-[calc(20rem/16)] phone:sr-only'

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
  openPlaylist,
  askSignedOut,
  askBacklog,
  startupDeadlineMs,
  takeCapture,
  channelsFolded = false,
  subChannelsFolded = false,
  autoOpensDataBroadcast = false,
  lineRelayOf,
  captionStyle,
  formatChoice = 'auto',
  askBrowser,
  onRecord,
  onTakeTheRecordingBack,
}: {
  screen: LiveScreen
  onTakeTicket: TakeLiveTicket
  /** Reserves the programme on now, from the phone's `この番組を録画`. */
  onRecord?: (programmeId: string) => Promise<ReservationWrite>
  /** Takes back the reservation the toast after `この番組を録画` offers. */
  onTakeTheRecordingBack?: (reservationId: string) => Promise<ReservationWrite>
  clockHeldAt?: Date
  openSocket?: OpenSocket
  openPlaylist?: OpenPlaylist
  askSignedOut?: () => Promise<boolean>
  askBacklog?: AskBacklog
  startupDeadlineMs?: number
  takeCapture?: TakeCapture
  channelsFolded?: boolean
  autoOpensDataBroadcast?: boolean
  subChannelsFolded?: boolean
  lineRelayOf?: (channel: string) => LineRelay
  captionStyle?: CaptionStyle
  formatChoice?: FormatChoice
  askBrowser?: FormatProbe
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
  const answersOf = useFormatAnswers(
    askBrowser ?? browserProbe('plainFirst'),
    given.profiles,
  )

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
    const chosen = screen.channels.find((channel) => channel.id === id)
    const profile = wireProfileInUse() ?? unaskedIn(screen.profiles)
    const picture = screen.profiles.find((one) => one.name === profile)
    const format =
      wireFormatInUse() ??
      formatToPlay(
        formatChoice,
        picture?.formats,
        picture && answersOf(picture),
      )

    if (
      chosen &&
      profile &&
      format.settled &&
      id !== watching?.channel.id &&
      LiveFeed.supported()
    ) {
      openTheWireAhead(
        liveWireHref(
          chosen.networkId,
          chosen.serviceId,
          profile,
          MAIN_SOUND,
          format.format,
        ),
        openSocket,
      )
    }

    setChoice({ asked, chosen: id })
    patch({ ch: id })

    if (window.matchMedia(PHONE_UPRIGHT).matches) {
      window.scrollTo({ top: 0 })
    }
  }
  const putThePictureAway = () => {
    setChoice(undefined)
    patch({ ch: null })
  }
  const [phase, setPhase] = useState<Phase>()
  const preparing = phase === undefined || phase === 'starting'
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
            <Button variant="tone" size="sm" asChild>
              <Link href="/settings/tuners">チューナーへ</Link>
            </Button>
          }
        />
      </ScreenMain>
    )
  }

  if (!watching) {
    return (
      <ScreenMain className="px-3.5 pt-4 pb-10 sideways:pt-0 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)]">
        <h1 className={HEADING}>
          <LiveIcon className="size-[calc(22rem/16)] text-brand" />
          ライブ
        </h1>
        <PhoneBarTools>
          <ChannelKinds
            kind={screen.kind}
            kinds={screen.kinds}
            onKind={kind}
            className="w-[calc(280rem/16)] upright:hidden [&>*]:flex-1"
          />
        </PhoneBarTools>
        <div className="mb-3.5 flex flex-wrap items-center gap-3.5 empty:hidden upright:mb-2.5 sideways:mb-0">
          <ChannelKinds
            kind={screen.kind}
            kinds={screen.kinds}
            onKind={kind}
            className="upright:w-full sideways:hidden upright:[&>*]:flex-1"
          />
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
          <>
            <ChannelGrid
              channels={channels}
              onSelect={(channel) => choose(channel.id)}
              className="phone:hidden"
            />
            <OnAPhone>
              <div className="-mx-3.5 hidden phone:block sideways:-mx-5">
                <PhoneChannelRows
                  channels={channels}
                  onSelect={(channel) => choose(channel.id)}
                />
              </div>
            </OnAPhone>
          </>
        )}
        {nothingIsOn && (
          <EmptyState
            usher={null}
            titleLevel={2}
            title="まだ番組情報がありません"
            className="mt-3.5"
            action={
              <Button variant="tone" size="sm" asChild>
                <Link href="/guide">番組表へ</Link>
              </Button>
            }
          />
        )}
      </ScreenMain>
    )
  }

  const handover = liveHandover(
    watching.channel.networkId,
    watching.channel.serviceId,
    onTakeTicket,
    watching.channel.name,
    watching.channel.now?.title,
  )
  const programmeInfo = (
    <PhoneLiveInfo
      watching={watching}
      external={<OpenExternally handover={handover} />}
      record={
        onRecord &&
        onTakeTheRecordingBack &&
        watching.channel.now && (
          <RecordThisButton
            programmeId={watching.channel.now.id}
            onReserve={onRecord}
            onCancel={onTakeTheRecordingBack}
          />
        )
      }
    />
  )

  return (
    <ScreenMain
      width="full"
      data-watching=""
      className="flex items-start gap-[calc(26rem/16)] px-3.5 pt-4 pb-10 min-[701px]:px-5 min-[1061px]:px-[calc(30rem/16)] max-[1180px]:flex-col upright:p-0 sideways:fixed sideways:inset-0 sideways:z-40 sideways:overflow-hidden sideways:bg-(--pl-video) sideways:p-0"
    >
      <KeptAcrossTurns />
      <div
        className={cn('min-w-0 flex-1', PLAYER_COLUMN, 'sideways:max-w-none')}
      >
        <LivePlayer
          channel={watching.channel}
          profiles={screen.profiles}
          returnPath={addressWith(pathname, query, {
            ch: watching.channel.id,
          })}
          openSocket={openSocket}
          openPlaylist={openPlaylist}
          askSignedOut={askSignedOut}
          askBacklog={askBacklog}
          startupDeadlineMs={startupDeadlineMs}
          takeCapture={takeCapture}
          autoOpensDataBroadcast={autoOpensDataBroadcast}
          captionStyle={captionStyle}
          formatChoice={formatChoice}
          askBrowser={askBrowser}
          lineRelayOf={lineRelayOf}
          remoteInTheColumn={wide}
          remoteSlot={remoteSlot}
          onDataBroadcastOpen={setBroadcastOpen}
          onPhase={setPhase}
          side={{
            strip: (
              <SidewaysChannels
                kind={screen.kind}
                kinds={screen.kinds}
                onKind={kind}
                channels={channels}
                watchingId={watchingId}
                preparing={preparing}
                onSelect={(channel) => choose(channel.id)}
              />
            ),
            faces: { [PROGRAMME_FACE]: programmeInfo },
          }}
          lead={
            <button
              type="button"
              aria-label="閉じる"
              onClick={putThePictureAway}
              className={PLAYER_GLYPH_BUTTON}
            >
              <ChevronDownIcon />
            </button>
          }
        />
        <NowNext
          watching={watching}
          className="upright:hidden sideways:hidden"
        />
        <div className="mt-[calc(18rem/16)] flex flex-wrap items-start gap-[calc(9rem/16)] upright:hidden sideways:hidden">
          <OpenExternally handover={handover} />
        </div>
        <OnAnUprightPhone>
          <div className="hidden upright:block">
            {programmeInfo}
            <PhoneKinds
              kind={screen.kind}
              kinds={screen.kinds}
              onKind={kind}
              className="sticky top-[calc(100vw*9/16+env(safe-area-inset-top))] z-10"
            />
            <PhoneWatchedRows
              channels={channels}
              watchingId={watchingId}
              preparing={preparing}
              at={clock}
              onSelect={(channel) => choose(channel.id)}
            />
          </div>
        </OnAnUprightPhone>
      </div>
      <aside
        ref={aside}
        aria-label="チャンネル"
        className={cn(
          PLAYER_SIDE_COLUMN,
          'upright:hidden sideways:hidden',
          'max-[1180px]:static max-[1180px]:max-h-[60svh] max-[1180px]:w-full',
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
