'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type {
  DriverRestartResult,
  RestartWindow,
  TunerNotice,
} from '@/repository/tuners'
import type { BannerActions, BannerTone } from '@/components/vela/banner'
import { Banner } from '@/components/vela/banner'

const RESTART = 'driver を再起動'

const REREAD = '状態を読み直す'

const TICK_MS = 2000

type Refusal = Exclude<DriverRestartResult, { state: 'accepted' }>

type Phase =
  | { name: 'idle' }
  | { name: 'asking' }
  | { name: 'accepted'; deadline: number; budgetSeconds: number }
  | { name: 'unreachable' }
  | { name: 'refused'; refusal: Refusal }

type Press = 'restart' | 'dismiss' | 'reread'

interface Face {
  tone: BannerTone
  body: string
  /** Absent leaves the band with nothing to press. */
  action?: { label: string; press: Press; disabled?: boolean; href?: '/login' }
}

/**
 * Re-reads the page while an accepted restart is being watched, and closes
 * the watch at the deadline. It fetches nothing itself.
 */
function useReturnTicker(deadline: number | undefined, onDeadline: () => void) {
  const router = useRouter()

  useEffect(() => {
    if (deadline === undefined) {
      return
    }

    const timer = setInterval(() => {
      if (Date.now() >= deadline) {
        onDeadline()

        return
      }

      router.refresh()
    }, TICK_MS)

    return () => clearInterval(timer)
  }, [deadline, router, onDeadline])
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
  switch (refusal.state) {
    case 'recording':
      return {
        tone: 'warn',
        body: `driver は再起動を断りました。${holding(refusal.recordings, refusal.until)}`,
        action: { label: RESTART, press: 'restart', disabled: true },
      }
    case 'unauthenticated':
      return {
        tone: 'danger',
        body: 'サインインが切れているため、再起動を要求できませんでした。',
        action: { label: 'サインインへ', press: 'restart', href: '/login' },
      }
    case 'disconnected':
      return {
        tone: 'danger',
        body: 'driver が接続されていないため、再起動を要求できませんでした。',
      }
    case 'unsupported':
      return {
        tone: 'danger',
        body: 'この driver は再起動の要求に対応していません。driver を更新してください。',
      }
    case 'mismatched':
      return {
        tone: 'danger',
        body: 'driver は再起動に対応していると名乗りましたが、要求には応答しません。driver と API のビルドが揃っていません。',
      }
    case 'refused':
      return {
        tone: 'danger',
        body: `再起動を要求できませんでした。API は ${refusal.status} を返しました。`,
      }
  }
}

function idleFace(notice: TunerNotice): Face {
  const offer = notice.restart

  if (offer?.recordings === undefined) {
    return {
      tone: notice.tone,
      body: `${notice.body}driver の観測が取得できていないため、進行中の録画の有無を確かめられません。`,
      action: { label: RESTART, press: 'restart', disabled: true },
    }
  }

  if (offer.recordings === 0) {
    return {
      tone: notice.tone,
      body: `${notice.body}進行中の録画はありません。`,
      action: { label: RESTART, press: 'restart' },
    }
  }

  return {
    tone: notice.tone,
    body: `${notice.body}${holding(offer.recordings, offer.until)}`,
    action: { label: RESTART, press: 'restart', disabled: true },
  }
}

function windowFace(judged: RestartWindow): Face {
  switch (judged.state) {
    case 'restarting':
      return {
        tone: 'info',
        body: `再起動を受け付けました。driver が入れ替わるのを最大 ${judged.budgetSeconds} 秒待っています。`,
        action: { label: RESTART, press: 'restart', disabled: true },
      }
    case 'returned':
      return {
        tone: 'info',
        body: `driver が再起動しました(instance ${judged.instanceId})。`,
      }
    case 'unverifiable':
      return {
        tone: 'warn',
        body: '再起動を受け付けましたが、入れ替わりを確かめる手掛かりがありません。',
        action: { label: REREAD, press: 'dismiss' },
      }
    case 'overdue':
      return {
        tone: 'warn',
        body: `再起動を受け付けてから ${judged.budgetSeconds} 秒待ちましたが、driver はまだ戻っていません。`,
        action: { label: REREAD, press: 'dismiss' },
      }
  }
}

function toFace(
  phase: Phase,
  overdue: boolean,
  restartWindow: RestartWindow | undefined,
  notice: TunerNotice | undefined,
): Face | null {
  switch (phase.name) {
    case 'asking':
      return {
        tone: 'info',
        body: 'driver に再起動を要求しています。',
        action: { label: RESTART, press: 'restart', disabled: true },
      }
    case 'unreachable':
      return {
        tone: 'danger',
        body: 'この画面から API に届きませんでした。',
        action: { label: REREAD, press: 'reread' },
      }
    case 'refused':
      return refusalFace(phase.refusal)
    case 'accepted':
    case 'idle':
      break
  }

  if (restartWindow !== undefined) {
    return restartWindow.state === 'restarting' && overdue
      ? windowFace({
          state: 'overdue',
          budgetSeconds: restartWindow.budgetSeconds,
        })
      : windowFace(restartWindow)
  }

  if (phase.name === 'accepted') {
    return overdue
      ? windowFace({ state: 'overdue', budgetSeconds: phase.budgetSeconds })
      : windowFace({
          state: 'restarting',
          deadline: phase.deadline,
          budgetSeconds: phase.budgetSeconds,
        })
  }

  return notice === undefined ? null : idleFace(notice)
}

/**
 * The band that carries the restart. The ledger decides whether the button is
 * offered, the driver decides whether the press is honoured, and the band says
 * which of the two turned it down.
 *
 * An accepted restart is a window, not a spinner: the acceptance is recorded
 * server-side, each re-read judges the window against the driver answering
 * now, and this component only keeps the page re-reading until the deadline
 * the driver named. Until a *different* instance answers, the band says the
 * list below is the state from before — and never claims failure while the
 * driver may simply be on its way back.
 */
export function DriverRestartBanner({
  notice,
  restartWindow,
  onRestart,
  onDismiss,
}: {
  /** Absent while nothing is waiting on a restart. */
  notice?: TunerNotice
  /** The accepted restart being watched, judged server-side. */
  restartWindow?: RestartWindow
  onRestart: () => Promise<DriverRestartResult>
  onDismiss: () => Promise<void>
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const [overdue, setOverdue] = useState(false)
  const [, startTransition] = useTransition()

  const deadline =
    restartWindow?.state === 'restarting'
      ? restartWindow.deadline
      : restartWindow === undefined && phase.name === 'accepted'
        ? phase.deadline
        : undefined

  const markOverdue = useCallback(() => setOverdue(true), [])

  useReturnTicker(overdue ? undefined : deadline, markOverdue)

  const face = toFace(phase, overdue, restartWindow, notice)

  if (face === null) {
    return null
  }

  const presses: Record<Press, () => void> = {
    restart: () => {
      setPhase({ name: 'asking' })
      setOverdue(false)

      startTransition(async () => {
        try {
          const asked = await onRestart()

          if (asked.state !== 'accepted') {
            setPhase({ name: 'refused', refusal: asked })

            return
          }

          setPhase({
            name: 'accepted',
            deadline: Date.now() + asked.budgetSeconds * 1000,
            budgetSeconds: asked.budgetSeconds,
          })
        } catch {
          // An ask that got no answer is not a failed restart: the driver may
          // have accepted and gone away, so the band says only that the
          // answer did not arrive.
          setPhase({ name: 'unreachable' })
        }
      })
    },
    dismiss: () => {
      setPhase({ name: 'idle' })
      setOverdue(false)

      startTransition(async () => {
        await onDismiss()
      })
    },
    reread: () => {
      setPhase({ name: 'idle' })
      setOverdue(false)
      router.refresh()
    },
  }

  const actions: BannerActions | undefined = face.action && [
    face.action.href !== undefined
      ? { label: face.action.label, href: face.action.href }
      : {
          label: face.action.label,
          control: 'button',
          disabled: face.action.disabled,
          onClick: presses[face.action.press],
        },
  ]

  return (
    <Banner tone={face.tone} actions={actions}>
      {face.body}
    </Banner>
  )
}
