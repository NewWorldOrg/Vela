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
  | { kind: 'appendFailed' }
  | { kind: 'tookTooLong' }

interface Said {
  tone: 'gone' | 'waiting' | 'quiet'
  mark: ReactNode
  title: string
  worthRetrying: boolean
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

const APPEND_FAILED: Said = {
  tone: 'gone',
  mark: <PlayIcon className="size-[22px]" />,
  title: '映像を再生できなくなりました',
  worthRetrying: true,
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
    case 'appendFailed':
      return APPEND_FAILED
    case 'tookTooLong':
      return TOOK_TOO_LONG
  }
}

function bodyOf(fault: LiveFault): string | undefined {
  if (fault.kind === 'refused' && fault.ceiling) {
    return `実行中 ${fault.ceiling.running} 本 / 上限 ${fault.ceiling.atOnce} 本`
  }

  return undefined
}

export function LiveFaultNotice({
  fault,
  onRetry,
  returnPath,
  className,
}: {
  fault: LiveFault
  onRetry: () => void
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
