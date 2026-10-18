import Link from 'next/link'

import type { ComponentProps, ReactNode } from 'react'
import type { Route } from 'next'

import type { BrowserDecoding } from '@/lib/browser-decodes'
import { cn } from '@/lib/utils'
import { formatLength } from '@/lib/format'
import { LEFT_SCRAMBLED_IN_FULL } from '@/lib/state-terms'
import { reservationHref } from '@/lib/reservations'
import type {
  RecordingDetail,
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type {
  PlaybackRead,
  PlaybackRefusal,
  PositionWrite,
} from '@/repository/videos'
import { howThePlayerOpens } from '@/lib/playback-resume'
import { whatOpensThePlayerAnew } from '@/lib/playback-source'
import type { TicketWrite } from '@/repository/tickets'
import type { PlaybackSource } from '@/repository/playback-sources'
import type { SoundTrack } from '@/repository/sounds'
import type { PlaybackProfile } from '@/repository/video-paths'
import type { EncodeChoices, EncodeJob, EncodeWrite } from '@/repository/encode'
import type { RecordingSegments } from '@/repository/recording-segments'
import {
  ChevronLeftIcon,
  ListIcon,
  OutcomeFailedIcon,
  ThumbMissingIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { ChannelMark } from '@/components/vela/channel-mark'
import { RecordingInProgressChip } from '@/components/vela/recording-in-progress-chip'
import { FileMissingChip } from '@/components/recordings/file-missing-chip'
import { LeftScrambledChip } from '@/components/recordings/left-scrambled-chip'
import { PlaybackNotice } from '@/components/recordings/playback-notice'
import {
  PLAYER_BUTTON,
  PLAYER_COLUMN,
} from '@/components/recordings/player-palette'
import { PlayerSeat } from '@/components/recordings/player-seat'
import type { Player } from '@/components/recordings/player'
import { DetailStat } from '@/components/recordings/detail-stat'
import { OutcomeMark } from '@/components/recordings/outcome-mark'
import type { QueueEncode } from '@/components/recordings/encode-button'
import { RecordingActions } from '@/components/recordings/recording-actions'
import { RecordingRecord } from '@/components/recordings/recording-record'
import {
  SegmentsPanel,
  type AnswerSegments,
  type WithdrawSegmentAnswer,
} from '@/components/recordings/segments-panel'
import {
  WatchLinkSeat,
  type NoteSkip,
} from '@/components/recordings/watch-link-seat'
import { ScreenMain } from '@/components/vela/app-shell'

const GUTTER = 'px-[calc(30rem/16)] max-[1060px]:px-5 max-[700px]:px-3.5'

/** The page's one column, which the link back, the player and the programme's information share: as wide as the picture the window's height allows, centred. While the data broadcast's remote stands beside the player, it is as wide as the box, the gap and the remote's column, still centred, so everything above and below starts at the box's left edge. */
const WATCH_COLUMN = cn(
  PLAYER_COLUMN,
  'has-[[data-remote=beside]]:w-fit has-[[data-remote=beside]]:max-w-full',
)

/** What runs along the column above and below the player: as wide as the column and no wider however long its text, so the player alone sets the column's width. */
const ALONG = 'w-0 min-w-full'

const OUTCOME_STYLE = {
  truncated: 'bg-tint-butter',
  failed: 'bg-tint-salmon',
} as const

const REFUSED: Record<PlaybackRefusal, ReactNode> = {
  stillRecording: (
    <PlaybackNotice
      tone="waiting"
      mark={<ListIcon className="size-[calc(22rem/16)]" />}
      title="録画中は再生できません"
    />
  ),
  nothingToPlay: (
    <PlaybackNotice
      tone="gone"
      mark={<OutcomeFailedIcon className="size-[calc(22rem/16)]" />}
      title="再生できるものがありません"
      body="この録画には書かれた中身がありません。"
    />
  ),
  outOfReach: (
    <PlaybackNotice
      tone="waiting"
      mark={<ThumbMissingIcon className="size-[calc(22rem/16)]" />}
      title="録画ファイルに到達できません"
    >
      <Link href="/library/integrity" className={PLAYER_BUTTON}>
        整合性チェックの結果へ
      </Link>
    </PlaybackNotice>
  ),
  unreadable: (
    <PlaybackNotice
      mark={<WarningIcon className="size-[calc(22rem/16)]" />}
      title="再生の可否を読めませんでした"
    />
  ),
}

function whyNothingPlays(
  detail: RecordingDetail,
  playback: PlaybackRead,
): ReactNode {
  if (detail.fileMissing) {
    return (
      <PlaybackNotice
        tone="waiting"
        mark={<ThumbMissingIcon className="size-[calc(22rem/16)]" />}
        title="ファイルが見つかりません"
      >
        <Link href="/library/integrity" className={PLAYER_BUTTON}>
          整合性チェックの結果へ
        </Link>
      </PlaybackNotice>
    )
  }

  if (playback.state === 'refused') {
    return REFUSED[playback.refusal]
  }

  if (playback.plan.route === 'nothing') {
    return (
      <PlaybackNotice
        mark={<ThumbMissingIcon className="size-[calc(22rem/16)]" />}
        title="再生できるエンコード版がありません"
      />
    )
  }

  return null
}

const OUTCOME_LABEL = {
  truncated: '尻切れ',
  failed: '失敗',
} as const

/** What the stories hand the player in place of the API: the picture and how it is fed, its frames, and the data broadcast. */
type PlayerStandIns = Pick<
  ComponentProps<typeof Player>,
  | 'pictureHref'
  | 'frameHref'
  | 'feedRecording'
  | 'readDataBroadcast'
  | 'readDataBroadcastModule'
>

function Dot() {
  return <span className="text-ink-3">・</span>
}

export function RecordingDetailView({
  detail: d,
  playback,
  unaskedProfile,
  onRemakeThumbnail,
  onDelete,
  onTakeTicket,
  onAskForTheSound,
  onKeepPosition,
  artefact,
  onAskWhichArtefact,
  onQueueEncode,
  encodeChoices,
  encodeJob,
  onCallOffEncode,
  startAt,
  startsHeld = false,
  autoOpensDataBroadcast = false,
  segments,
  onAnswerSegments,
  onWithdrawSegmentAnswer,
  onNoteSkip,
  ...standIns
}: PlayerStandIns & {
  detail: RecordingDetail
  playback: PlaybackRead
  unaskedProfile?: PlaybackProfile
  onRemakeThumbnail: (id: string) => Promise<ThumbnailWrite>
  onDelete: (id: string) => Promise<RecordingDiscarded>
  onTakeTicket: (id: string) => Promise<TicketWrite>
  onAskForTheSound: (
    id: string,
    sound: SoundTrack,
    source?: PlaybackSource,
    decodes?: readonly BrowserDecoding[],
  ) => Promise<PlaybackRead>
  onKeepPosition: (id: string, positionSec: number) => Promise<PositionWrite>
  artefact?: string
  onAskWhichArtefact?: (id: string) => Promise<string | undefined>
  onQueueEncode: QueueEncode
  encodeChoices: EncodeChoices
  encodeJob?: EncodeJob
  onCallOffEncode: (id: string) => Promise<EncodeWrite>
  startAt?: number
  startsHeld?: boolean
  autoOpensDataBroadcast?: boolean
  segments?: RecordingSegments
  onAnswerSegments: AnswerSegments
  onWithdrawSegmentAnswer: WithdrawSegmentAnswer
  onNoteSkip: NoteSkip
}) {
  const plays =
    !d.fileMissing &&
    playback.state === 'planned' &&
    playback.plan.route !== 'nothing'

  const watching = plays && playback.state === 'planned'

  const opens = howThePlayerOpens(
    startAt,
    playback.state === 'planned' ? playback.plan.resumeAtSec : undefined,
    d.lengthSec,
    startsHeld,
  )

  const alarming: 'truncated' | 'failed' | null =
    d.outcome === 'truncated' || d.outcome === 'failed' ? d.outcome : null

  const banded = alarming ?? (d.leftScrambled ? 'failed' : null)

  const segmented =
    segments !== undefined &&
    segments.segments.length > 0 &&
    d.outcome !== 'recording'

  return (
    <ScreenMain
      width={watching ? 'full' : 'default'}
      className={cn(GUTTER, 'pb-16')}
    >
      <WatchLinkSeat
        key={d.id}
        recordingId={d.id}
        modelVersion={segments?.modelVersion}
        onNoteSkip={onNoteSkip}
      >
        <div className={WATCH_COLUMN}>
          <div className={ALONG}>
            <div className="flex items-center pt-[calc(18rem/16)] pb-3">
              <Link
                href="/library"
                className="tap-target inline-flex items-center gap-[calc(7rem/16)] rounded-full border border-edge py-[calc(5rem/16)] pr-[calc(13rem/16)] pl-2.5 text-ui font-medium text-ink-2 no-underline transition-[translate,background-color,color] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px"
              >
                <ChevronLeftIcon className="size-[calc(15rem/16)]" />
                ライブラリへ
              </Link>
            </div>

            {banded && (
              <div
                data-slot="recording-outcome"
                className={cn(
                  'mb-3.5 flex flex-wrap items-center gap-3.5 rounded-lg px-[calc(18rem/16)] py-[calc(13rem/16)]',
                  OUTCOME_STYLE[banded],
                )}
              >
                <OutcomeMark outcome={banded} />
                <h2 className="heading text-[calc(15rem/16)] whitespace-nowrap">
                  {alarming ? OUTCOME_LABEL[alarming] : LEFT_SCRAMBLED_IN_FULL}
                </h2>
                {d.fileMissing && <FileMissingChip />}
                {alarming && d.leftScrambled && <LeftScrambledChip />}
                {d.outcomeBody && (
                  <p className="min-w-[calc(200rem/16)] flex-1 font-code text-note text-ink-2">
                    {d.outcomeBody}
                  </p>
                )}
              </div>
            )}

            {d.outcome === 'recording' && d.live && (
              <div className="mb-3.5 grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
                <section className="rounded-xl bg-surface px-[calc(19rem/16)] py-[calc(17rem/16)]">
                  <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                    <RecordingInProgressChip mark="ledger" />
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(calc(128rem/16),1fr))] gap-2.5">
                    <DetailStat label="経過" value={d.live.elapsed} />
                    <DetailStat label="書き込み済み" value={d.live.written} />
                    <DetailStat label="進行中のドロップ" value={d.live.drops} />
                    <DetailStat label="残り" value={d.live.rest} />
                  </div>
                  <p className="mt-2.5 text-note text-ink-3">
                    最終更新{' '}
                    <span className="font-code">{d.live.updatedAt}</span>
                  </p>
                </section>
              </div>
            )}

            {whyNothingPlays(d, playback)}
          </div>

          {watching && (
            <PlayerSeat
              key={whatOpensThePlayerAnew(
                d.id,
                startAt,
                playback.plan.source,
                startsHeld,
              )}
              detail={d}
              plan={playback.plan}
              unaskedProfile={unaskedProfile}
              onTakeTicket={onTakeTicket}
              onAskForTheSound={onAskForTheSound}
              onKeepPosition={onKeepPosition}
              artefact={artefact}
              onAskWhichArtefact={onAskWhichArtefact}
              startAt={opens.at}
              playsAtOnce={opens.playing}
              holdsAtOnce={opens.held}
              autoOpensDataBroadcast={autoOpensDataBroadcast}
              {...standIns}
            />
          )}

          <div className={cn(ALONG, 'pt-5')}>
            <h1 className="heading text-[calc(24rem/16)] leading-[1.45]">
              {d.title}
            </h1>
            <div
              data-slot="watch-meta"
              className="mt-2.5 flex flex-wrap items-center gap-[calc(9rem/16)] text-ui text-ink-2"
            >
              <span className="inline-flex items-center gap-2">
                <ChannelMark logo={d.channelLogo} no={d.channelNo} />
                <span>{d.channel}</span>
              </span>
              <Dot />
              <span className="font-code">{d.recordedRange}</span>
              {d.lengthSec != null && d.lengthSec > 0 && (
                <>
                  <Dot />
                  <span className="font-code">{formatLength(d.lengthSec)}</span>
                </>
              )}
              {d.reservationId && (
                <>
                  <Dot />
                  <Link
                    href={reservationHref(d.reservationId) as Route}
                    className="tap-target font-bold text-brand underline-offset-[3px] hover:underline"
                  >
                    この録画の予約へ
                  </Link>
                </>
              )}
            </div>

            {d.genres && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {d.genres.map((g) => (
                  <span
                    key={g}
                    className="inline-block rounded-full border border-line bg-surface px-[calc(11rem/16)] py-0.5 text-note font-medium text-ink-2"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {d.synopsis && (
              <p className="mt-3.5 max-w-[calc(660rem/16)] text-[calc(13rem/16)] leading-[1.9] text-ink-2">
                {d.synopsis}
              </p>
            )}

            <div className="mt-[calc(18rem/16)]">
              <RecordingActions
                recording={d}
                onDelete={onDelete}
                onRemakeThumbnail={onRemakeThumbnail}
                onTakeTicket={onTakeTicket}
                onQueueEncode={onQueueEncode}
                encodeChoices={encodeChoices}
                plan={
                  plays && playback.state === 'planned'
                    ? playback.plan
                    : undefined
                }
              />
            </div>

            {d.failureReason && (
              <div className="mt-[calc(18rem/16)] flex max-w-[calc(900rem/16)] flex-wrap items-start gap-[calc(13rem/16)] rounded-lg bg-surface px-[calc(15rem/16)] py-3">
                <span className="flex size-8 flex-none items-center justify-center rounded-md bg-surface-2 text-ink-2">
                  <WarningIcon className="size-[calc(17rem/16)]" />
                </span>
                <div className="min-w-[calc(170rem/16)] flex-1">
                  <b className="heading block text-body">
                    {d.failureReason.title}
                  </b>
                  {d.failureReason.body && (
                    <p className="mt-0.5 text-sub leading-relaxed text-ink-2">
                      {d.failureReason.body}
                    </p>
                  )}
                  {d.failureReason.noticedAt && (
                    <p className="mt-1 font-code text-note tabular-nums text-ink-3">
                      {d.failureReason.noticedAt}
                    </p>
                  )}
                </div>
              </div>
            )}

            {segmented && (
              <SegmentsPanel
                recordingId={d.id}
                reading={segments}
                onAnswer={onAnswerSegments}
                onWithdraw={onWithdrawSegmentAnswer}
              />
            )}

            <RecordingRecord
              detail={d}
              plan={playback.state === 'planned' ? playback.plan : undefined}
              encodeJob={encodeJob}
              onCallOffEncode={onCallOffEncode}
            />
          </div>
        </div>
      </WatchLinkSeat>
    </ScreenMain>
  )
}
