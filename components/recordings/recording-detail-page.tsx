import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import type { Route } from 'next'

import type { BrowserDecoding } from '@/lib/browser-decodes'
import type { FormatChoice } from '@/lib/playback-format'
import type { LiveProfile } from '@/repository/live'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatPlayerTime } from '@/lib/format'
import { LEFT_SCRAMBLED_IN_FULL } from '@/lib/state-terms'
import type {
  Recording,
  RecordingDetail,
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import { seriesNameOf } from '@/lib/library-series'
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
import { RecordingInProgressChip } from '@/components/vela/recording-in-progress-chip'
import { FileMissingChip } from '@/components/recordings/file-missing-chip'
import { LeftScrambledChip } from '@/components/recordings/left-scrambled-chip'
import { PlaybackNotice } from '@/components/recordings/playback-notice'
import {
  PLAYER_BUTTON,
  PLAYER_COLUMN,
  PLAYER_GLYPH_BUTTON,
} from '@/components/recordings/player-palette'
import { PlayerSeat } from '@/components/recordings/player-seat'
import type { Player } from '@/components/recordings/player'
import { DetailStat } from '@/components/recordings/detail-stat'
import { OutcomeMark } from '@/components/recordings/outcome-mark'
import type { QueueEncode } from '@/components/recordings/encode-button'
import { StripFaceButton } from '@/components/recordings/strip-face-button'
import { RecordingHandoverList } from '@/components/recordings/recording-handover-list'
import { OnAnUprightPhone } from '@/components/vela/on-an-upright-phone'
import { KeptAcrossTurns } from '@/components/vela/kept-across-turns'
import {
  SkipEventsSeat,
  type NoteSeek,
  type NoteSkip,
} from '@/components/recordings/skip-events-seat'
import type { SendSeekWhileLeaving } from '@/components/recordings/send-seek-while-leaving'
import { ScreenMain } from '@/components/vela/screen-main'
import { SeriesEpisodes } from '@/components/recordings/series-episodes'
import type { CaptionStyle } from '@/lib/caption-style'
import { RecordingInfo } from '@/components/recordings/recording-info'

const GUTTER = 'px-10 max-[1365px]:px-6 max-[700px]:px-3.5'

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
      <Link href="/settings/integrity" className={PLAYER_BUTTON}>
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
        <Link href="/settings/integrity" className={PLAYER_BUTTON}>
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
  startsPlaying = false,
  autoOpensDataBroadcast = false,
  captionStyle,
  modelVersion,
  onNoteSkip,
  onNoteSeek,
  onSeekWhileLeaving,
  episodes = [],
  seriesFolded = false,
  ...standIns
}: PlayerStandIns & {
  detail: RecordingDetail
  /** The other recordings of the series this one belongs to, newest first. */
  episodes?: readonly Recording[]
  seriesFolded?: boolean
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
  startsPlaying?: boolean
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
    startsPlaying,
  )

  const alarming: 'truncated' | 'failed' | null =
    d.outcome === 'truncated' || d.outcome === 'failed' ? d.outcome : null

  const banded = alarming ?? (d.leftScrambled ? 'failed' : null)
  const sided = episodes.length > 0

  return (
    <ScreenMain
      width={watching || sided ? 'full' : 'default'}
      data-watching={watching ? '' : undefined}
      className={cn(
        GUTTER,
        'pt-2.5 pb-16',
        watching && 'upright:px-0',
        watching &&
          'sideways:fixed sideways:inset-0 sideways:z-40 sideways:overflow-hidden sideways:bg-(--pl-video) sideways:p-0',
      )}
    >
      {watching && <KeptAcrossTurns />}
      <div
        className={cn(
          sided &&
            'flex items-start gap-8 max-[1180px]:flex-col max-[1180px]:items-stretch has-[[data-remote=beside]]:[&>[data-slot=series-episodes]]:hidden',
        )}
      >
        <div className={cn(WATCH_COLUMN, sided && 'min-w-0 flex-1')}>
          <div
            className={cn(
              ALONG,
              watching && 'upright:px-4',
              watching && 'sideways:hidden',
            )}
          >
            <div
              className={cn(
                'flex items-center pt-2 pb-3 min-[701px]:hidden',
                watching && 'upright:hidden',
              )}
            >
              <Link
                href="/library"
                className="tap-target inline-flex items-center gap-[calc(7rem/16)] rounded-full border border-edge py-[calc(5rem/16)] pr-[calc(13rem/16)] pl-2.5 text-ui font-medium text-ink-2 no-underline transition-[translate,background-color,color] duration-150 ease-toy hover:bg-surface hover:text-ink"
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
                <h2 className="heading text-title whitespace-nowrap">
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
                  <p className="mt-2.5 text-note text-ink-2">
                    最終更新{' '}
                    <span className="font-code">{d.live.updatedAt}</span>
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

          {watching &&
            opens.at !== undefined &&
            opens.at > 0 &&
            startAt === undefined && (
              <OnAnUprightPhone>
                <div
                  data-slot="picks-up"
                  className="hidden h-[calc(46rem/16)] items-center gap-2.5 border-b border-line bg-surface-2 pr-1.5 pl-4 text-sub text-ink-2 upright:flex"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-code">
                      {formatPlayerTime(opens.at)}
                    </span>{' '}
                    まで観ました
                  </span>
                  <Button
                    variant="tone"
                    size="sm"
                    asChild
                    className="bg-raised"
                  >
                    <Link href={`/recordings/${d.id}?at=0` as Route} replace>
                      <RebuildIcon />
                      最初から
                    </Link>
                  </Button>
                </div>
              </OnAnUprightPhone>
            )}

          <div
            className={cn(
              ALONG,
              'pt-[calc(22rem/16)]',
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
        {sided && (
          <SeriesEpisodes
            name={seriesNameOf(d.title)}
            current={d}
            episodes={episodes}
            folded={seriesFolded}
            className="phone:hidden"
          />
        )}
      </div>
    </ScreenMain>
  )
}
