'use client'

import type { ReactNode } from 'react'

import { isLeftScrambled, scrambledPercent } from '@/lib/recordings'
import type { RecordingDetail } from '@/repository/recordings'
import type { TicketWrite } from '@/repository/videos'
import {
  PLAYBACK_REFUSAL_HEADER,
  PLAYBACK_REFUSAL_TOO_MANY,
} from '@/repository/video-paths'
import {
  ClockIcon,
  DangerIcon,
  OutcomeFailedIcon,
  PlayIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { PLAYER_BUTTON } from '@/components/recordings/player-palette'
import { PlaybackNotice } from '@/components/recordings/playback-notice'
import { ExternalPlayer } from '@/components/recordings/external-player'

/**
 * Why the picture asked for never arrived.
 *
 * A recording written without ever being descrambled and a machine already
 * transcoding all it will are both "it would not play", and they are opposite
 * things to do next: one of them never comes back, and the other comes back on
 * its own. One notice for both told the reader to wait for something that does
 * not change, and offered a retry that could not work.
 */
export type PlaybackFault =
  | 'leftScrambled'
  | 'tooManyAtOnce'
  | 'nothingToPlay'
  | 'undecodable'
  | 'transcode'

/**
 * Asks the same picture for its HTTP answer, and reads the reason off it.
 *
 * The element only says that it could not play, which is the same word for
 * every reason there is; the answer carries the status and, where the API
 * would not start a transcoder, the name of the refusal. The body is dropped
 * as soon as the headers are read, so a picture that did start is torn down
 * again rather than left running behind a page that is not drawing it.
 */
export async function askWhyItWouldNotPlay(
  href: string,
  transcodes: boolean,
): Promise<PlaybackFault> {
  try {
    const answer = await fetch(href, { cache: 'no-store' })

    void answer.body?.cancel()

    if (
      answer.headers.get(PLAYBACK_REFUSAL_HEADER) === PLAYBACK_REFUSAL_TOO_MANY
    ) {
      return 'tooManyAtOnce'
    }

    if (answer.status === 404) {
      return 'nothingToPlay'
    }

    if (answer.ok && !transcodes) {
      return 'undecodable'
    }

    return 'transcode'
  } catch {
    return 'transcode'
  }
}

/**
 * The reason a recording would not play, read before the picture is asked for
 * again. A recording whose packets were never descrambled has nothing to
 * decode, and the reading that says so is already on this screen — asking the
 * API a second time would only build another transcoder over the same cipher.
 */
export function faultOnTheFace(detail: RecordingDetail): PlaybackFault | null {
  return isLeftScrambled(detail) ? 'leftScrambled' : null
}

interface Said {
  tone: 'gone' | 'waiting' | 'quiet'
  mark: ReactNode
  title: string
  /** The cause, where the title alone does not carry it. */
  body?: (detail: RecordingDetail) => string
  /** Whether asking again can end differently. */
  worthRetrying: boolean
  /** Whether a player outside the browser reaches what this one could not. */
  worthLeaving: boolean
}

const SAID: Record<PlaybackFault, Said> = {
  leftScrambled: {
    tone: 'gone',
    mark: <DangerIcon className="size-[22px]" />,
    title: 'スクランブルが解けていません',
    body: (d) =>
      `スクランブル残存 ${d.scramble?.main ?? '—'}(全体の ${scrambledPercent(d)}%)。スクランブルされたままの映像は復号できないため、時間をおいても再生できるようにはなりません。`,
    worthRetrying: false,
    worthLeaving: false,
  },
  tooManyAtOnce: {
    tone: 'waiting',
    mark: <ClockIcon className="size-[22px]" />,
    title: '同時に再生できる本数の上限に達しています',
    worthRetrying: true,
    worthLeaving: true,
  },
  nothingToPlay: {
    tone: 'gone',
    mark: <OutcomeFailedIcon className="size-[22px]" />,
    title: '再生できるものがありません',
    body: () => 'この録画には、ブラウザへ渡せる中身がありません。',
    worthRetrying: false,
    worthLeaving: false,
  },
  undecodable: {
    tone: 'gone',
    mark: <WarningIcon className="size-[22px]" />,
    title: 'このブラウザでは再生できません',
    body: () => '成果物のコーデックをこのブラウザが復号できません。',
    worthRetrying: false,
    worthLeaving: true,
  },
  transcode: {
    tone: 'gone',
    mark: <PlayIcon className="size-[22px]" />,
    title: '再生を開始できませんでした',
    body: () => '元 TS からのトランスコードに失敗しました。',
    worthRetrying: true,
    worthLeaving: true,
  },
}

/**
 * What stands where the picture would be, once the reason is known.
 *
 * A retry is drawn only where asking again can end differently. A button that
 * will fail every time it is pressed is worse than no button: it reads as "this is nearly
 * working" over a recording that will never play.
 */
export function PlaybackFaultNotice({
  detail: d,
  fault,
  onRetry,
  onTakeTicket,
}: {
  detail: RecordingDetail
  fault: PlaybackFault
  onRetry: () => void
  onTakeTicket: (id: string) => Promise<TicketWrite>
}) {
  const said = SAID[fault]

  return (
    <PlaybackNotice
      tone={said.tone}
      mark={said.mark}
      title={said.title}
      body={said.body?.(d)}
    >
      {said.worthRetrying && (
        <button type="button" onClick={onRetry} className={PLAYER_BUTTON}>
          再試行
        </button>
      )}
      {said.worthLeaving && (
        <ExternalPlayer id={d.id} onTakeTicket={onTakeTicket} />
      )}
    </PlaybackNotice>
  )
}
