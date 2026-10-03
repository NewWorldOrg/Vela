'use client'

import { EMPTY_VALUE } from '@/lib/empty-value'
import type { ReactNode } from 'react'

import { isLeftScrambled, scrambledPercent } from '@/lib/recordings'
import type { RecordingDetail } from '@/repository/recordings'
import { whatItSaid } from '@/repository/said'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import {
  PLAYBACK_REFUSAL_HEADER,
  WHEN_CARRYING_A_SOUND,
  whyItRefused,
} from '@/repository/video-paths'
import { whatTheAnswerSays, type PlainFault } from '@/lib/playback-fault'
import {
  ClockIcon,
  DangerIcon,
  OutcomeFailedIcon,
  PlayIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { PLAYER_BUTTON } from '@/components/recordings/player-palette'
import { PlaybackNotice } from '@/components/recordings/playback-notice'
import { ExternalPlayerOpener } from '@/components/recordings/external-player'

export type PlaybackFault =
  { kind: PlainFault } | { kind: 'refused'; said: string }

async function refusalIn(answer: Response): Promise<string> {
  try {
    return whyItRefused(
      WHEN_CARRYING_A_SOUND,
      answer.status,
      whatItSaid(undefined, await answer.json()),
    )
  } catch {
    return whyItRefused(WHEN_CARRYING_A_SOUND, answer.status, undefined)
  }
}

export async function askWhyItWouldNotPlay(
  href: string,
  transcodes: boolean,
): Promise<PlaybackFault> {
  try {
    const answer = await fetch(href, { cache: 'no-store' })
    const says = whatTheAnswerSays(
      {
        status: answer.status,
        refusal: answer.headers.get(PLAYBACK_REFUSAL_HEADER),
      },
      transcodes,
    )

    if (says === 'refused') {
      return { kind: 'refused', said: await refusalIn(answer) }
    }

    void answer.body?.cancel()

    return { kind: says }
  } catch {
    return { kind: 'transcode' }
  }
}

export function faultOnTheFace(detail: RecordingDetail): PlaybackFault | null {
  return isLeftScrambled(detail) ? { kind: 'leftScrambled' } : null
}

interface Said {
  tone: 'gone' | 'waiting' | 'quiet'
  mark: ReactNode
  title: string
  body?: (detail: RecordingDetail) => string
  worthRetrying: boolean
  worthLeaving: boolean
}

const SAID: Record<PlainFault, Said> = {
  leftScrambled: {
    tone: 'gone',
    mark: <DangerIcon className="size-[calc(22rem/16)]" />,
    title: 'スクランブルが解けていません',
    body: (d) =>
      `スクランブル残存 ${d.scramble?.main ?? EMPTY_VALUE}(全体の ${scrambledPercent(d)}%)。スクランブルされたままの映像は復号できないため、時間をおいても再生できるようにはなりません。`,
    worthRetrying: false,
    worthLeaving: false,
  },
  tooManyAtOnce: {
    tone: 'waiting',
    mark: <ClockIcon className="size-[calc(22rem/16)]" />,
    title: '同時に再生できる本数の上限に達しています',
    worthRetrying: true,
    worthLeaving: true,
  },
  nothingToPlay: {
    tone: 'gone',
    mark: <OutcomeFailedIcon className="size-[calc(22rem/16)]" />,
    title: '再生できるものがありません',
    body: () => 'この録画には、ブラウザへ渡せる中身がありません。',
    worthRetrying: false,
    worthLeaving: false,
  },
  undecodable: {
    tone: 'gone',
    mark: <WarningIcon className="size-[calc(22rem/16)]" />,
    title: 'このブラウザでは再生できません',
    body: () => '成果物のコーデックをこのブラウザが復号できません。',
    worthRetrying: false,
    worthLeaving: true,
  },
  theBrowserWouldNotPlay: {
    tone: 'gone',
    mark: <WarningIcon className="size-[calc(22rem/16)]" />,
    title: 'このブラウザでは再生できません',
    body: () => 'トランスコードした映像をこのブラウザが再生できませんでした。',
    worthRetrying: false,
    worthLeaving: true,
  },
  transcode: {
    tone: 'gone',
    mark: <PlayIcon className="size-[calc(22rem/16)]" />,
    title: '再生を開始できませんでした',
    body: () => '元 TS からのトランスコードに失敗しました。',
    worthRetrying: true,
    worthLeaving: true,
  },
}

const REFUSED: Said = {
  tone: 'gone',
  mark: <WarningIcon className="size-[calc(22rem/16)]" />,
  title: '再生を開始できませんでした',
  worthRetrying: false,
  worthLeaving: true,
}

export function PlaybackFaultNotice({
  detail: d,
  plan,
  fault,
  onRetry,
  onTakeTicket,
}: {
  detail: RecordingDetail
  plan: PlaybackPlan
  fault: PlaybackFault
  onRetry: () => void
  onTakeTicket: (id: string) => Promise<TicketWrite>
}) {
  const said = fault.kind === 'refused' ? REFUSED : SAID[fault.kind]
  const body = fault.kind === 'refused' ? fault.said : said.body?.(d)

  return (
    <PlaybackNotice
      tone={said.tone}
      mark={said.mark}
      title={said.title}
      body={body}
    >
      {said.worthRetrying && (
        <button type="button" onClick={onRetry} className={PLAYER_BUTTON}>
          再試行
        </button>
      )}
      {said.worthLeaving && (
        <ExternalPlayerOpener
          recording={d}
          plan={plan}
          onTakeTicket={onTakeTicket}
          tone="player"
        />
      )}
    </PlaybackNotice>
  )
}
