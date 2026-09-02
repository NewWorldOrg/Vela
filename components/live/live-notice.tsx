'use client'

import type { ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type {
  LiveRefusal,
  LiveSupplyEnd,
  TranscodeCeiling,
} from '@/lib/live-wire'
import { loginHref } from '@/repository/auth'
import {
  ClockIcon,
  DangerIcon,
  DisplayIcon,
  LockIcon,
  PlayIcon,
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
 */
export type LiveFault =
  | { kind: 'refused'; refusal: LiveRefusal; ceiling?: TranscodeCeiling }
  | { kind: 'ended'; why: LiveSupplyEnd }
  | { kind: 'dropped' }
  | { kind: 'signedOut' }
  | { kind: 'unsupported' }

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
    title: 'driver 未接続',
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
    title: 'driver 消失',
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

function saidOf(fault: LiveFault): Said {
  switch (fault.kind) {
    case 'refused':
      return REFUSED[fault.refusal]
    case 'ended':
      return ENDED[fault.why]
    case 'dropped':
      return DROPPED
    case 'signedOut':
      return SIGNED_OUT
    case 'unsupported':
      return UNSUPPORTED
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
