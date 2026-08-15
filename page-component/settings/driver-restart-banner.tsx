'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type {
  DriverRestartResult,
  DriverReturnResult,
  TunerNotice,
} from '@/repository/tuners'
import type { BannerActions, BannerTone } from '@/components/vela/banner'
import { Banner } from '@/components/vela/banner'

const RESTART = 'driver を再起動'

const REREAD = '状態を読み直す'

type Refusal = Exclude<DriverRestartResult, { state: 'accepted' }>

type Phase =
  | { name: 'idle' }
  | { name: 'asking' }
  | { name: 'restarting'; budgetSeconds: number }
  | { name: 'returned'; instanceId?: string }
  | { name: 'waiting'; budgetSeconds: number }
  | { name: 'unreachable' }
  | { name: 'refused'; refusal: Refusal }

interface Face {
  tone: BannerTone
  body: string
  /** Absent leaves the band with nothing to press. */
  action?: { label: string; disabled: boolean }
}

function until(at: string | undefined) {
  return at === undefined ? '' : `最後の録画は ${at} に終わります。`
}

function holding(recordings: number | undefined, at: string | undefined) {
  return recordings === undefined
    ? `録画が進行中です。${until(at)}`
    : `録画が ${recordings} 件進行中です。${until(at)}`
}

function refusalFace(refusal: Refusal): Face {
  const stopped = {
    tone: 'danger' as const,
    action: { label: RESTART, disabled: true },
  }

  switch (refusal.state) {
    case 'recording':
      return {
        tone: 'warn',
        body: `driver は再起動を断りました。${holding(refusal.recordings, refusal.until)}録画が終わってからもう一度要求してください。`,
        action: { label: RESTART, disabled: false },
      }
    case 'unauthenticated':
      return {
        ...stopped,
        body: 'サインインが切れているため、再起動を要求できませんでした。サインインしてから開き直してください。',
      }
    case 'disconnected':
      return {
        ...stopped,
        body: 'driver が接続されていないため、再起動を要求できませんでした。',
      }
    case 'unsupported':
      return {
        ...stopped,
        body: 'この driver は再起動の要求に対応していません。driver を更新してください。',
      }
    case 'mismatched':
      return {
        ...stopped,
        body: 'driver は再起動に対応していると名乗りましたが、要求には応答しません。driver と API のビルドが揃っていません。',
      }
    case 'refused':
      return {
        ...stopped,
        body: `再起動を要求できませんでした。API は ${refusal.status} を返しました。`,
      }
  }
}

function idleFace(notice: TunerNotice): Face {
  const offer = notice.restart

  if (offer === undefined || offer.recordings === 0) {
    return {
      tone: notice.tone,
      body: `${notice.body}進行中の録画はありません。`,
      action: { label: RESTART, disabled: false },
    }
  }

  return {
    tone: notice.tone,
    body: `${notice.body}${holding(offer.recordings, offer.until)}それまでは再起動できません。`,
    action: { label: RESTART, disabled: true },
  }
}

function toFace(phase: Phase, notice: TunerNotice | undefined): Face | null {
  switch (phase.name) {
    case 'idle':
      return notice === undefined ? null : idleFace(notice)
    case 'asking':
      return {
        tone: 'info',
        body: 'driver に再起動を要求しています。',
        action: { label: RESTART, disabled: true },
      }
    case 'restarting':
      return {
        tone: 'info',
        body: `再起動を受け付けました。driver が入れ替わるのを最大 ${phase.budgetSeconds} 秒待っています。下の一覧は再起動前の状態です。`,
        action: { label: RESTART, disabled: true },
      }
    case 'returned':
      return {
        tone: 'info',
        body: `driver が再起動しました${phase.instanceId ? `(instance ${phase.instanceId})` : ''}。保存済みの設定はこの driver に読み込まれています。`,
      }
    case 'waiting':
      return {
        tone: 'warn',
        body: `再起動を受け付けてから ${phase.budgetSeconds} 秒待ちましたが、driver はまだ戻っていません。下の一覧は再起動前の状態です。`,
        action: { label: REREAD, disabled: false },
      }
    case 'unreachable':
      return {
        tone: 'danger',
        body: 'この画面から API に届きませんでした。driver が再起動したかどうかは、状態を読み直して確かめてください。',
        action: { label: REREAD, disabled: false },
      }
    case 'refused':
      return refusalFace(phase.refusal)
  }
}

/**
 * The band that carries the restart. The ledger decides whether the button is
 * offered, the driver decides whether the press is honoured, and the band says
 * which of the two turned it down.
 *
 * A restart takes the driver away and brings a different instance back, so the
 * press is followed by a read-back: until it lands the band says the list below
 * is the state from before, and never that the restart is done.
 */
export function DriverRestartBanner({
  notice,
  instanceId,
  onRestart,
  onReturn,
}: {
  /** Absent while nothing is waiting on a restart. */
  notice?: TunerNotice
  /** The instance the restart takes away. */
  instanceId?: string
  onRestart: () => Promise<DriverRestartResult>
  onReturn: (
    previousInstanceId: string | undefined,
    budgetSeconds: number,
  ) => Promise<DriverReturnResult>
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const [, startTransition] = useTransition()

  const face = toFace(phase, notice)

  if (face === null) {
    return null
  }

  const reread = () => {
    setPhase({ name: 'idle' })
    router.refresh()
  }

  const ask = () => {
    setPhase({ name: 'asking' })

    startTransition(async () => {
      let budgetSeconds = 0

      try {
        const asked = await onRestart()

        if (asked.state !== 'accepted') {
          setPhase({ name: 'refused', refusal: asked })

          return
        }

        budgetSeconds = asked.budgetSeconds

        setPhase({ name: 'restarting', budgetSeconds })

        const back = await onReturn(
          asked.instanceId ?? instanceId,
          budgetSeconds,
        )

        setPhase(
          back.state === 'returned'
            ? { name: 'returned', instanceId: back.instanceId }
            : { name: 'waiting', budgetSeconds },
        )
      } catch {
        // A restart that was accepted and then lost its read-back is not a
        // failed restart: the driver may well be on its way back, so the band
        // says only that the answer did not arrive.
        setPhase(
          budgetSeconds === 0
            ? { name: 'unreachable' }
            : { name: 'waiting', budgetSeconds },
        )
      }
    })
  }

  const actions: BannerActions | undefined = face.action && [
    {
      ...face.action,
      control: 'button',
      onClick: face.action.label === REREAD ? reread : ask,
    },
  ]

  return (
    <Banner tone={face.tone} actions={actions}>
      {face.body}
    </Banner>
  )
}
