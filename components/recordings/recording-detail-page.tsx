import Link from 'next/link'

import type { ComponentProps, ReactNode } from 'react'
import type { Route } from 'next'

import type { BrowserDecoding } from '@/lib/browser-decodes'
import type { FormatChoice } from '@/lib/playback-format'
import type { LiveProfile } from '@/repository/live'
import { cn } from '@/lib/utils'
import { formatLength, formatPlayerTime } from '@/lib/format'
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
import {
  ChevronLeftIcon,
  DevicePlayerIcon,
  InfoIcon,
  ListIcon,
  OutcomeFailedIcon,
  RebuildIcon,
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
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { QualityChip } from '@/components/recordings/quality-chip'
import { EncodeChip } from '@/components/recordings/encode-chip'
import { PlayerSeat } from '@/components/recordings/player-seat'
import type { Player } from '@/components/recordings/player'
import { DetailStat } from '@/components/recordings/detail-stat'
import { OutcomeMark } from '@/components/recordings/outcome-mark'
import type { QueueEncode } from '@/components/recordings/encode-button'
import { RecordingActions } from '@/components/recordings/recording-actions'
import { RecordingRecord } from '@/components/recordings/recording-record'
import { StripFaceButton } from '@/components/recordings/player-dock'
import { RecordingHandoverList } from '@/components/recordings/external-player'
import { OnAnUprightPhone } from '@/components/vela/on-an-upright-phone'
import { KeptAcrossTurns } from '@/components/vela/kept-across-turns'
import {
  SkipEventsSeat,
  type NoteSeek,
  type NoteSkip,
} from '@/components/recordings/skip-events-seat'
import type { SendSeekWhileLeaving } from '@/components/recordings/send-seek-while-leaving'
import { ScreenMain } from '@/components/vela/app-shell'
import type { CaptionStyle } from '@/lib/caption-style'

const GUTTER = 'px-[calc(30rem/16)] max-[1060px]:px-5 max-[700px]:px-3.5'

/** The page's one column, which the link back, the player and the programme's information share: as wide as the picture the window's height allows, centred. While the data broadcast's remote stands beside the player, it is as wide as the box, the gap and the remote's column, still centred, so everything above and below starts at the box's left edge. On a phone held on its side the column takes the page's width, so the dock can open beside the picture. */
const WATCH_COLUMN = cn(
  PLAYER_COLUMN,
  'has-[[data-remote=beside]]:w-fit has-[[data-remote=beside]]:max-w-full',
  'sideways:max-w-none',
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
  | 'askBrowser'
>

const PROGRAMME_FACE = '番組'

const OUTSIDE_FACE = '外部'

/** Where the recording was left, on the bar's bottom line of a phone held on its side, and the way to start it from its head. On an upright phone the same stands under the picture. */
function PicksUpOnTheBar({ at, id }: { at: number; id: string }) {
  return (
    <span
      data-slot="picks-up-on-the-bar"
      className="ml-1.5 hidden min-w-0 items-center gap-2 sideways:flex"
    >
      <span className="truncate text-cap text-(--pl-ink-2)">
        <span className="font-code">{formatPlayerTime(at)}</span> まで観ました
      </span>
      <Link
        href={`/recordings/${id}?at=0` as Route}
        replace
        className={cn(
          PLAYER_BUTTON,
          'inline-flex shrink-0 items-center gap-1 no-underline [&_svg]:size-4',
        )}
      >
        <RebuildIcon />
        最初から
      </Link>
    </span>
  )
}

function Dot({ className }: { className?: string }) {
  return <span className={cn('text-ink-3', className)}>・</span>
}

export function RecordingDetailView({
  detail: d,
  playback,
  unaskedProfile,
  profiles,
  formatChoice,
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
  captionStyle,
  modelVersion,
  onNoteSkip,
  onNoteSeek,
  onSeekWhileLeaving,
  ...standIns
}: PlayerStandIns & {
  detail: RecordingDetail
  playback: PlaybackRead
  unaskedProfile?: PlaybackProfile
  profiles?: readonly LiveProfile[]
  formatChoice?: FormatChoice
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
  captionStyle?: CaptionStyle
  modelVersion?: number
  onNoteSkip: NoteSkip
  onNoteSeek: NoteSeek
  onSeekWhileLeaving?: SendSeekWhileLeaving
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

  return (
    <ScreenMain
      width={watching ? 'full' : 'default'}
      data-watching={watching ? '' : undefined}
      className={cn(
        GUTTER,
        'pb-16',
        watching && 'upright:px-0',
        watching &&
          'sideways:fixed sideways:inset-0 sideways:z-40 sideways:overflow-hidden sideways:bg-(--pl-video) sideways:p-0',
      )}
    >
      {watching && <KeptAcrossTurns />}
      <div className={WATCH_COLUMN}>
        <div
          className={cn(
            ALONG,
            watching && 'upright:px-4',
            watching && 'sideways:hidden',
          )}
        >
          <div
            className={cn(
              'flex items-center pt-[calc(18rem/16)] pb-3',
              watching && 'upright:hidden',
            )}
          >
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
                  最終更新 <span className="font-code">{d.live.updatedAt}</span>
                </p>
              </section>
            </div>
          )}

          {whyNothingPlays(d, playback)}
        </div>

        {watching && (
          <SkipEventsSeat
            key={d.id}
            recordingId={d.id}
            modelVersion={modelVersion}
            onNoteSkip={onNoteSkip}
            onNoteSeek={onNoteSeek}
            onSeekWhileLeaving={onSeekWhileLeaving}
          >
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
              profiles={profiles}
              formatChoice={formatChoice}
              onTakeTicket={onTakeTicket}
              onAskForTheSound={onAskForTheSound}
              onKeepPosition={onKeepPosition}
              artefact={artefact}
              onAskWhichArtefact={onAskWhichArtefact}
              startAt={opens.at}
              playsAtOnce={opens.playing}
              holdsAtOnce={opens.held}
              autoOpensDataBroadcast={autoOpensDataBroadcast}
              captionStyle={captionStyle}
              lead={
                <>
                  <Link
                    href="/library"
                    aria-label="ライブラリへ"
                    className={PLAYER_GLYPH_BUTTON}
                  >
                    <ChevronLeftIcon />
                  </Link>
                  <span className="hidden min-w-0 truncate pl-1 text-sub font-bold text-white sideways:block">
                    {d.title}
                  </span>
                </>
              }
              besideTheTime={
                opens.at !== undefined &&
                startAt === undefined && (
                  <PicksUpOnTheBar at={opens.at} id={d.id} />
                )
              }
              side={{
                strip: (
                  <>
                    <StripFaceButton
                      face={PROGRAMME_FACE}
                      glyph={<InfoIcon />}
                    />
                    <StripFaceButton
                      face={OUTSIDE_FACE}
                      glyph={<DevicePlayerIcon />}
                    />
                  </>
                ),
                faces: {
                  [PROGRAMME_FACE]: (
                    <div className="flex flex-col px-4 pt-3.5 pb-4">
                      <RecordingInfo
                        detail={d}
                        playback={playback}
                        laid="face"
                        onDelete={onDelete}
                        onRemakeThumbnail={onRemakeThumbnail}
                        onTakeTicket={onTakeTicket}
                        onQueueEncode={onQueueEncode}
                        encodeChoices={encodeChoices}
                        encodeJob={encodeJob}
                        onCallOffEncode={onCallOffEncode}
                      />
                    </div>
                  ),
                  [OUTSIDE_FACE]: (
                    <div className="px-4">
                      <RecordingHandoverList
                        recording={d}
                        plan={playback.plan}
                        onTakeTicket={onTakeTicket}
                      />
                    </div>
                  ),
                },
              }}
              {...standIns}
            />
          </SkipEventsSeat>
        )}

        {watching && opens.at !== undefined && startAt === undefined && (
          <OnAnUprightPhone>
            <div
              data-slot="picks-up"
              className="hidden h-[calc(46rem/16)] items-center gap-2.5 border-b border-line bg-surface-2 pr-1.5 pl-4 text-sub text-ink-2 upright:flex"
            >
              <span className="min-w-0 flex-1">
                <span className="font-code">{formatPlayerTime(opens.at)}</span>{' '}
                まで観ました
              </span>
              <Link
                href={`/recordings/${d.id}?at=0` as Route}
                replace
                className="flex h-11 items-center gap-1 rounded-full px-2.5 font-bold text-brand no-underline outline-none focus-visible:shadow-ring [&_svg]:size-4"
              >
                <RebuildIcon />
                最初から
              </Link>
            </div>
          </OnAnUprightPhone>
        )}

        <div
          className={cn(
            ALONG,
            'pt-5',
            'upright:flex upright:flex-col upright:border-b upright:border-line upright:bg-surface upright:px-4 upright:pt-3.5 upright:pb-4',
            watching && 'sideways:hidden',
          )}
        >
          <RecordingInfo
            detail={d}
            playback={playback}
            laid="page"
            onDelete={onDelete}
            onRemakeThumbnail={onRemakeThumbnail}
            onTakeTicket={onTakeTicket}
            onQueueEncode={onQueueEncode}
            encodeChoices={encodeChoices}
            encodeJob={encodeJob}
            onCallOffEncode={onCallOffEncode}
          />
        </div>
      </div>
    </ScreenMain>
  )
}

/** How the recording's information is laid: in the page under the player, or in the face a phone held on its side opens at the picture's right, which is as narrow as an upright phone and lays it the same way. */
type InfoLaid = 'page' | 'face'

const INFO_CLASSES: Record<
  InfoLaid,
  {
    title: string
    meta: string
    synopsis: string
    actions: string
    failure: string
    record: string
    dot: string
  }
> = {
  page: {
    title: 'heading text-[calc(24rem/16)] leading-[1.45] upright:text-h2',
    meta: 'mt-2.5 flex flex-wrap items-center gap-[calc(9rem/16)] text-ui text-ink-2 upright:mt-1.5 upright:gap-1.5 upright:text-sub upright:text-ink-3',
    synopsis:
      'mt-3.5 max-w-[calc(660rem/16)] text-[calc(13rem/16)] leading-[1.9] text-ink-2 upright:order-3 upright:text-body upright:leading-[1.8]',
    actions: 'mt-[calc(18rem/16)] upright:order-2 upright:mt-3.5',
    failure:
      'mt-[calc(18rem/16)] flex upright:order-4 max-w-[calc(900rem/16)] flex-wrap items-start gap-[calc(13rem/16)] rounded-lg bg-surface px-[calc(15rem/16)] py-3',
    record: 'upright:order-5',
    dot: '',
  },
  face: {
    title: 'heading text-h2 leading-[1.45]',
    meta: 'mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sub text-ink-3 [&>a]:basis-full [&>span:first-child]:basis-full',
    synopsis: 'order-3 mt-3.5 text-body leading-[1.8] text-ink-2',
    actions: 'order-2 mt-3.5',
    failure:
      'order-4 mt-3.5 flex flex-wrap items-start gap-[calc(13rem/16)] rounded-lg bg-surface-2 px-[calc(15rem/16)] py-3',
    record: 'order-5 mt-3.5 rounded-lg bg-surface-2 px-4',
    dot: 'hidden',
  },
}

function RecordingInfo({
  detail: d,
  playback,
  laid,
  onDelete,
  onRemakeThumbnail,
  onTakeTicket,
  onQueueEncode,
  encodeChoices,
  encodeJob,
  onCallOffEncode,
}: {
  detail: RecordingDetail
  playback: PlaybackRead
  laid: InfoLaid
  onDelete: (id: string) => Promise<RecordingDiscarded>
  onRemakeThumbnail: (id: string) => Promise<ThumbnailWrite>
  onTakeTicket: (id: string) => Promise<TicketWrite>
  onQueueEncode: QueueEncode
  encodeChoices: EncodeChoices
  encodeJob?: EncodeJob
  onCallOffEncode: (id: string) => Promise<EncodeWrite>
}) {
  const classes = INFO_CLASSES[laid]
  const plan =
    !d.fileMissing &&
    playback.state === 'planned' &&
    playback.plan.route !== 'nothing'
      ? playback.plan
      : undefined
  const values = (
    <dl
      data-slot="phone-values"
      className={cn(
        'mt-3 grid-cols-3 overflow-hidden rounded-lg bg-surface-2',
        laid === 'face'
          ? 'order-1 grid'
          : 'hidden upright:order-1 upright:grid',
      )}
    >
      {[
        ['結果', <OutcomeChip key="outcome" recording={d} say />],
        ['品質', <QualityChip key="quality" recording={d} say />],
        ['エンコード', <EncodeChip key="encode" recording={d} say />],
      ].map(([name, value], nth) => (
        <div
          key={nth}
          className="min-w-0 border-l border-line px-3 py-[calc(9rem/16)] first:border-l-0"
        >
          <dt className="text-micro font-bold text-ink-3">{name}</dt>
          <dd className="truncate text-ui">{value}</dd>
        </div>
      ))}
    </dl>
  )

  return (
    <>
      {laid === 'face' ? (
        <h2 className={classes.title}>{d.title}</h2>
      ) : (
        <h1 className={classes.title}>{d.title}</h1>
      )}
      <div data-slot="watch-meta" className={classes.meta}>
        <span className="inline-flex items-center gap-2">
          <ChannelMark logo={d.channelLogo} no={d.channelNo} />
          <span>{d.channel}</span>
        </span>
        <Dot className={classes.dot} />
        <span className="font-code">{d.recordedRange}</span>
        {d.lengthSec != null && d.lengthSec > 0 && (
          <>
            <Dot />
            <span className="font-code">{formatLength(d.lengthSec)}</span>
          </>
        )}
        {d.reservationId && (
          <>
            <Dot className={classes.dot} />
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

      {laid === 'face' ? values : <OnAnUprightPhone>{values}</OnAnUprightPhone>}

      {d.synopsis && <p className={classes.synopsis}>{d.synopsis}</p>}

      <div className={classes.actions}>
        <RecordingActions
          recording={d}
          onDelete={onDelete}
          onRemakeThumbnail={onRemakeThumbnail}
          onTakeTicket={onTakeTicket}
          onQueueEncode={onQueueEncode}
          encodeChoices={encodeChoices}
          plan={laid === 'face' ? undefined : plan}
          laid={laid}
        />
      </div>

      {d.failureReason && (
        <div className={classes.failure}>
          <span className="flex size-8 flex-none items-center justify-center rounded-md bg-surface-2 text-ink-2">
            <WarningIcon className="size-[calc(17rem/16)]" />
          </span>
          <div className="min-w-[calc(170rem/16)] flex-1">
            <b className="heading block text-body">{d.failureReason.title}</b>
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

      <RecordingRecord
        className={classes.record}
        detail={d}
        plan={playback.state === 'planned' ? playback.plan : undefined}
        encodeJob={encodeJob}
        onCallOffEncode={onCallOffEncode}
      />
    </>
  )
}
