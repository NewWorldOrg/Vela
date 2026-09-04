'use client'

import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type {
  LiveRefusal,
  LiveRefusalDetail,
  LiveSupplyEnd,
  LiveTunerHolder,
  TranscodeCeiling,
} from '@/lib/live-wire'
import { loginHref } from '@/repository/auth'
import {
  ClockIcon,
  DangerIcon,
  DisplayIcon,
  LockIcon,
  PersonIcon,
  PlayIcon,
  QualityIcon,
  RecordIcon,
  SignalIcon,
  TunerIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { PLAYER_BUTTON } from '@/components/recordings/player-palette'
import { PlaybackNotice } from '@/components/recordings/playback-notice'

/**
 * Why there is no picture where one was asked for.
 *
 * A refusal is the API declining to seat the viewer at all; an ending is a
 * seat that was given and then taken away. Both name their reason on the wire,
 * and each reason is a different thing to do next — a tuner taken for a
 * recording comes back when the recording ends, a channel nobody holds never
 * does — so each is drawn as itself and none are folded into one.
 *
 * One of them the wire never names: a session that says nothing at all. The
 * seat was neither refused nor withdrawn, and no picture came, so the screen is
 * left on the startup plate with nothing to move it off. That is the only fault
 * the screen decides for itself, and it decides it on the clock.
 */
export type LiveFault =
  | {
      kind: 'refused'
      refusal: LiveRefusal
      ceiling?: TranscodeCeiling
      detail?: LiveRefusalDetail
    }
  | { kind: 'ended'; why: LiveSupplyEnd }
  | { kind: 'dropped' }
  | { kind: 'signedOut' }
  | { kind: 'unsupported' }
  | { kind: 'tookTooLong' }

interface Said {
  tone: 'gone' | 'waiting' | 'quiet'
  mark: ReactNode
  title: string
  /** Whether asking again can end differently. */
  worthRetrying: boolean
  /** Whether the tuner screen shows what is holding things up. */
  worthLooking?: boolean
}

const REFUSED: Record<LiveRefusal, Said> = {
  noSuchChannel: {
    tone: 'gone',
    mark: <DangerIcon className="size-[22px]" />,
    title: 'チャンネルが見つかりません',
    worthRetrying: false,
  },
  noTunerFree: {
    tone: 'gone',
    mark: <TunerIcon className="size-[22px]" />,
    title: '空いているチューナーがありません',
    worthRetrying: true,
    worthLooking: true,
  },
  wouldNotTune: {
    tone: 'gone',
    mark: <SignalIcon className="size-[22px]" />,
    title: '選局できませんでした',
    worthRetrying: true,
  },
  driverUnavailable: {
    tone: 'waiting',
    mark: <WarningIcon className="size-[22px]" />,
    title: 'チューナーに接続できません',
    worthRetrying: true,
  },
  tooManyAlready: {
    tone: 'waiting',
    mark: <ClockIcon className="size-[22px]" />,
    title: '同時に配信できる本数の上限です',
    worthRetrying: true,
    worthLooking: true,
  },
  transcoderWouldNotStart: {
    tone: 'gone',
    mark: <PlayIcon className="size-[22px]" />,
    title: '再生を開始できませんでした',
    worthRetrying: true,
  },
}

/**
 * What holds the tuner the viewer was turned away for.
 *
 * Both come back — that is the whole of what separates them from the reasons
 * that do not — but they come back on different clocks, and a reader deciding
 * whether to wait or to go elsewhere is deciding on that: a recording ends at
 * an hour the guide already shows, and a viewer leaves when they leave. So
 * each is said as itself, and both keep the press that asks again and the way
 * to the screen that shows what is on every tuner.
 */
const HELD_BY: Record<LiveTunerHolder, Said> = {
  aRecording: {
    tone: 'gone',
    mark: <RecordIcon className="size-[22px]" />,
    title: 'チューナーは録画に使われています',
    worthRetrying: true,
    worthLooking: true,
  },
  anotherViewer: {
    tone: 'gone',
    mark: <PersonIcon className="size-[22px]" />,
    title: 'チューナーは別の視聴に使われています',
    worthRetrying: true,
    worthLooking: true,
  },
}

/**
 * A tuning that reached the aerial and never locked on to it.
 *
 * It is the one refusal with no press on it. Every other reason a viewer is
 * turned away is something that clears — a recording ends, a viewer leaves, a
 * driver comes back, a budget frees — so asking again is a press that can end
 * differently. This one is the aerial, the cable and the channel, and none of
 * them are changed by the asking: the same press does the same thing and is
 * refused the same way, which is the control the canon says not to draw.
 *
 * It is named in the words this product already uses for it — the four classes
 * a scan is read by, which the channel screen has carried since before there
 * was a live picture to refuse.
 */
const NO_LOCK: Said = {
  tone: 'gone',
  mark: <QualityIcon className="size-[22px]" />,
  title: '信号を掴めませんでした',
  worthRetrying: false,
}

const ENDED: Record<LiveSupplyEnd, Said> = {
  letGo: {
    tone: 'quiet',
    mark: <LiveEndMark />,
    title: '配信が終了しました',
    worthRetrying: true,
  },
  takenForARecording: {
    tone: 'gone',
    mark: <RecordIcon className="size-[22px]" />,
    title: '録画のために切れました',
    worthRetrying: true,
  },
  driverDraining: {
    tone: 'waiting',
    mark: <WarningIcon className="size-[22px]" />,
    title: 'サーバが停止処理に入りました',
    worthRetrying: true,
  },
  windowClosed: {
    tone: 'quiet',
    mark: <ClockIcon className="size-[22px]" />,
    title: '視聴時間の上限に達しました',
    worthRetrying: true,
  },
  tunerFailed: {
    tone: 'gone',
    mark: <TunerIcon className="size-[22px]" />,
    title: 'チューナーが停止しました',
    worthRetrying: true,
  },
  stoppedByAnother: {
    tone: 'waiting',
    mark: <DangerIcon className="size-[22px]" />,
    title: '別の操作で停止されました',
    worthRetrying: true,
  },
  driverLost: {
    tone: 'gone',
    mark: <SignalIcon className="size-[22px]" />,
    title: 'チューナーとの接続が切れました',
    worthRetrying: true,
  },
}

const DROPPED: Said = {
  tone: 'quiet',
  mark: <WarningIcon className="size-[22px]" />,
  title: '接続が切れました',
  worthRetrying: true,
}

const SIGNED_OUT: Said = {
  tone: 'gone',
  mark: <LockIcon className="size-[22px]" />,
  title: 'セッションが切れました',
  worthRetrying: false,
}

const TOOK_TOO_LONG: Said = {
  tone: 'waiting',
  mark: <ClockIcon className="size-[22px]" />,
  title: '映像が始まりませんでした',
  worthRetrying: true,
  worthLooking: true,
}

const UNSUPPORTED: Said = {
  tone: 'gone',
  mark: <DisplayIcon className="size-[22px]" />,
  title: 'このブラウザでは再生できません',
  worthRetrying: false,
}

function LiveEndMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[22px] fill-none stroke-current stroke-[1.6] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <rect x="4.2" y="5.4" width="15.6" height="11" rx="2.6" />
      <path d="M8.6 20.2h6.8" />
      <path d="M9.4 8.6v4.6l3.9-2.3Z" />
    </svg>
  )
}

/**
 * A refusal, read with the one thing it says beyond its name.
 *
 * The detail is drawn where the screen has something of its own to draw for
 * it, and falls back to the reason alone where it has not. Three of the four
 * tuning failures the wire can name fall back: they are the scan's readings,
 * the driver does not report them on the path that seats a viewer, and a look
 * built for something that never arrives is a look nobody can check.
 */
function refusedSaid(refusal: LiveRefusal, detail?: LiveRefusalDetail): Said {
  if (detail?.of === 'heldBy') {
    return HELD_BY[detail.holder]
  }

  if (detail?.of === 'tuneFailure' && detail.failure === 'noLock') {
    return NO_LOCK
  }

  return REFUSED[refusal]
}

function saidOf(fault: LiveFault): Said {
  switch (fault.kind) {
    case 'refused':
      return refusedSaid(fault.refusal, fault.detail)
    case 'ended':
      return ENDED[fault.why]
    case 'dropped':
      return DROPPED
    case 'signedOut':
      return SIGNED_OUT
    case 'unsupported':
      return UNSUPPORTED
    case 'tookTooLong':
      return TOOK_TOO_LONG
  }
}

/** The one reading a refusal carries beyond its name: how full the budget is. */
function bodyOf(fault: LiveFault): string | undefined {
  if (fault.kind === 'refused' && fault.ceiling) {
    return `実行中 ${fault.ceiling.running} 本 / 上限 ${fault.ceiling.atOnce} 本`
  }

  return undefined
}

/**
 * What stands on the face where the picture would be.
 *
 * A retry is drawn only where asking again can end differently, and the way
 * to the tuner screen only where what is in the way can be seen there. A
 * session that has gone is answered with the one press that brings it back.
 */
export function LiveFaultNotice({
  fault,
  onRetry,
  returnPath,
  className,
}: {
  fault: LiveFault
  onRetry: () => void
  /** Where the sign-in comes back to. */
  returnPath: string
  className?: string
}) {
  const said = saidOf(fault)

  return (
    <PlaybackNotice
      tone={said.tone}
      mark={said.mark}
      title={said.title}
      body={bodyOf(fault)}
      className={cn('border-0 bg-transparent', className)}
    >
      {said.worthRetrying && (
        <button type="button" onClick={onRetry} className={PLAYER_BUTTON}>
          再試行
        </button>
      )}
      {said.worthLooking && (
        <Link href="/settings/tuners" className={PLAYER_BUTTON}>
          使用状況を見る
        </Link>
      )}
      {fault.kind === 'signedOut' && (
        <Link href={loginHref(returnPath) as Route} className={PLAYER_BUTTON}>
          ログイン
        </Link>
      )}
    </PlaybackNotice>
  )
}
