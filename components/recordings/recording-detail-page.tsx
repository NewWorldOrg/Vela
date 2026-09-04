import Link from 'next/link'

import type { ReactNode } from 'react'
import type { Route } from 'next'

import { cn } from '@/lib/utils'
import { formatLength } from '@/lib/format'
import { reservationHref } from '@/lib/reservations'
import type {
  RecordingDetail,
  RecordingDiscarded,
  ThumbnailWrite,
} from '@/repository/recordings'
import type {
  PlaybackRead,
  PlaybackRefusal,
  TicketWrite,
} from '@/repository/videos'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'
import {
  ChevronLeftIcon,
  ListIcon,
  OutcomeFailedIcon,
  ThumbMissingIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { FileMissingChip } from '@/components/recordings/file-missing-chip'
import { PlaybackNotice } from '@/components/recordings/playback-notice'
import {
  PLAYER_BUTTON,
  PLAYER_COLUMN,
} from '@/components/recordings/player-palette'
import { Player } from '@/components/recordings/player'
import { DetailKeyRow } from '@/components/recordings/detail-key-row'
import { DetailStat } from '@/components/recordings/detail-stat'
import { OutcomeMark } from '@/components/recordings/outcome-mark'
import { RecordingActions } from '@/components/recordings/recording-actions'
import { RecordingRecord } from '@/components/recordings/recording-record'
import { ScreenMain } from '@/components/vela/app-shell'

/**
 * The gutter every band on this screen stands in, and the column inside it.
 *
 * `PLAYER_COLUMN` is the picture's own bound — the column, capped by what the
 * window's height allows — so the reading under the picture starts and ends
 * where the picture does. Held to the 1440px step instead, it ran 26px short of
 * the picture at 1800x1050 and 373px short at 2560x1440: a reading that does
 * not line up with the thing it is about (v3.35).
 */
const GUTTER = 'mx-[30px] max-[1060px]:mx-5 max-[700px]:mx-3.5'

const OUTCOME_STYLE = {
  truncated: 'bg-tint-butter',
  failed: 'bg-tint-salmon',
} as const

/**
 * What the API said instead of a plan. Four refusals, four notices: a
 * recording still being written, one that wrote nothing, a file out of reach
 * and an answer that could not be read are different things to do next, and
 * one notice for all of them would leave the reader to guess which they have.
 * Each says what happened and stops; where the title is the whole of it, there
 * is no second line restating it.
 */
const REFUSED: Record<PlaybackRefusal, ReactNode> = {
  stillRecording: (
    <PlaybackNotice
      tone="waiting"
      mark={<ListIcon className="size-[22px]" />}
      title="録画中は再生できません"
    />
  ),
  nothingToPlay: (
    <PlaybackNotice
      tone="gone"
      mark={<OutcomeFailedIcon className="size-[22px]" />}
      title="再生できるものがありません"
      body="この録画には書かれた中身がありません。"
    />
  ),
  outOfReach: (
    <PlaybackNotice
      tone="waiting"
      mark={<ThumbMissingIcon className="size-[22px]" />}
      title="録画ファイルに到達できません"
    >
      <Link href="/library/integrity" className={PLAYER_BUTTON}>
        整合性チェックの結果へ
      </Link>
    </PlaybackNotice>
  ),
  unreadable: (
    <PlaybackNotice
      mark={<WarningIcon className="size-[22px]" />}
      title="再生の可否を読めませんでした"
    />
  ),
}

const OUTCOME_LABEL = {
  truncated: '尻切れ',
  failed: '失敗',
} as const

/** A dot between two values on the line of values under the title. */
function Dot() {
  return <span className="text-ink-3">・</span>
}

export function RecordingDetailView({
  detail: d,
  playback,
  onRemakeThumbnail,
  onDelete,
  onTakeTicket,
  startAt,
}: {
  detail: RecordingDetail
  playback: PlaybackRead
  onRemakeThumbnail: (id: string) => Promise<ThumbnailWrite>
  onDelete: (id: string) => Promise<RecordingDiscarded>
  onTakeTicket: (id: string) => Promise<TicketWrite>
  /** The second the quality panel sent the reader to, where it did. */
  startAt?: number
}) {
  const plays =
    !d.fileMissing &&
    d.outcome !== 'failed' &&
    playback.state === 'planned' &&
    playback.plan.route !== 'nothing'

  const watching = plays && playback.state === 'planned'

  /*
    The band is drawn only where what can be watched is not what was asked for.
    完全 is not that: the picture plays to its end and says so, and a band
    repeating it above the player made the two outcomes that do change what can
    be watched easier to miss rather than harder (v3.35). 完全 is kept as a
    value, on the first row of the record.
  */
  const alarming: 'truncated' | 'failed' | null =
    d.outcome === 'truncated' || d.outcome === 'failed' ? d.outcome : null

  return (
    <ScreenMain width={watching ? 'full' : 'default'} className="pb-16">
      <div className={GUTTER}>
        <div className={PLAYER_COLUMN}>
          <div className="flex items-center pt-[18px] pb-3">
            <Link
              href="/library"
              className="tap-target inline-flex items-center gap-[7px] rounded-full border border-edge py-[5px] pr-[13px] pl-2.5 text-ui font-medium text-ink-2 no-underline transition-[translate,background-color,color] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px"
            >
              <ChevronLeftIcon className="size-[15px]" />
              ライブラリへ
            </Link>
          </div>

          {alarming && (
            <div
              className={cn(
                'mb-3.5 flex flex-wrap items-center gap-3.5 rounded-lg px-[18px] py-[13px]',
                OUTCOME_STYLE[alarming],
              )}
            >
              <OutcomeMark outcome={alarming} />
              <h2 className="heading text-[15px] whitespace-nowrap">
                {OUTCOME_LABEL[alarming]}
              </h2>
              {d.fileMissing && <FileMissingChip className="mt-0" />}
              {d.outcomeBody && (
                <p className="min-w-[200px] flex-1 font-code text-note text-ink-2">
                  {d.outcomeBody}
                </p>
              )}
            </div>
          )}

          {d.outcome === 'recording' && d.live && (
            <div className="mb-3.5 grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
              <section className="rounded-xl bg-surface px-[19px] py-[17px]">
                <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                  <Badge variant="recording" className="gap-[7px] pl-[9px]">
                    <ListIcon className="size-[13px]" />
                    録画中
                  </Badge>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-2.5">
                  <DetailStat label="経過" value={d.live.elapsed} />
                  <DetailStat label="書き込み済み" value={d.live.written} />
                  <DetailStat label="進行中のドロップ" value={d.live.drops} />
                  <DetailStat label="残り" value={d.live.rest} />
                </div>
                <p className="mt-2.5 text-note text-ink-3">
                  最終更新 <span className="font-code">{d.live.updatedAt}</span>
                </p>
              </section>
              {d.live.extension && (
                <section className="rounded-xl bg-surface px-[19px] py-[17px]">
                  <div className="mb-2.5">
                    <Badge variant="info" className="font-bold">
                      <ChipDot />
                      延長に追従しました
                    </Badge>
                  </div>
                  <DetailKeyRow
                    label="当初の終了予定"
                    main={d.live.extension.plannedEnd}
                  />
                  <DetailKeyRow
                    label="現在の終了予定"
                    main={d.live.extension.currentEnd}
                    sub={d.live.extension.delta}
                  />
                  <DetailKeyRow
                    label="最終追従"
                    main={d.live.extension.followedAt}
                  />
                </section>
              )}
            </div>
          )}

          {d.fileMissing ? (
            <PlaybackNotice
              tone="waiting"
              mark={<ThumbMissingIcon className="size-[22px]" />}
              title="ファイルが見つかりません"
            >
              <Link href="/library/integrity" className={PLAYER_BUTTON}>
                整合性チェックの結果へ
              </Link>
            </PlaybackNotice>
          ) : d.outcome === 'failed' ? (
            <PlaybackNotice
              tone="gone"
              mark={<OutcomeFailedIcon className="size-[22px]" />}
              title="再生できません"
            />
          ) : playback.state === 'refused' ? (
            REFUSED[playback.refusal]
          ) : playback.plan.route === 'nothing' ? (
            <PlaybackNotice
              mark={<ThumbMissingIcon className="size-[22px]" />}
              title="再生できる成果物がありません"
            />
          ) : null}
        </div>
      </div>

      {watching && (
        <Player
          key={`${d.id}:${startAt ?? ''}`}
          detail={d}
          plan={playback.plan}
          onTakeTicket={onTakeTicket}
          startAt={startAt}
        />
      )}

      {/*
        Under the picture, what is needed to watch, in the order every product
        that plays a recorded programme uses: the name, where and when it came
        from, what it is about. The record of how it was recorded is folded
        underneath (v3.35).
      */}
      <div className={GUTTER}>
        <div className={cn(PLAYER_COLUMN, 'pt-5')}>
          <h1 className="heading text-[24px] leading-[1.45]">{d.title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-[9px] text-ui text-ink-2">
            <span>
              {d.channel}
              {d.channelNo && (
                <small className="ml-[7px] font-code text-[11.5px] text-ink-3">
                  {d.channelNo}
                </small>
              )}
            </span>
            <Dot />
            <span className="font-code">{d.recordedRange}</span>
            {d.lengthSec != null && d.lengthSec > 0 && (
              <>
                <Dot />
                <span className="font-code">{formatLength(d.lengthSec)}</span>
              </>
            )}
            {d.avInfo && (
              <>
                <Dot />
                <span>{d.avInfo}</span>
              </>
            )}
            {d.reservationId && (
              <>
                <Dot />
                <Link
                  href={reservationHref(d.reservationId) as Route}
                  className="tap-target font-bold text-brand underline-offset-[3px] hover:underline"
                >
                  この録画の予約
                </Link>
              </>
            )}
          </div>

          {d.genres && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {d.genres.map((g) => (
                <span
                  key={g}
                  className="inline-block rounded-full border border-line bg-surface px-[11px] py-0.5 text-note font-medium text-ink-2"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {d.synopsis && (
            <p className="mt-3.5 max-w-[660px] text-[13px] leading-[1.9] text-ink-2">
              {d.synopsis}
            </p>
          )}

          <div className="mt-[18px]">
            <RecordingActions
              recording={d}
              onDelete={onDelete}
              onTakeTicket={onTakeTicket}
              plays={plays}
            />
          </div>

          {d.failureReason && (
            <div className="mt-[18px] flex max-w-[900px] flex-wrap items-start gap-[13px] rounded-lg bg-surface px-[15px] py-3">
              <span className="flex size-8 flex-none items-center justify-center rounded-md bg-surface-2 text-ink-2">
                <WarningIcon className="size-[17px]" />
              </span>
              <div className="min-w-[170px] flex-1">
                <b className="heading block text-[13.5px]">
                  {d.failureReason.title}
                </b>
                {d.failureReason.body && (
                  <p className="mt-0.5 text-sub leading-relaxed text-ink-2">
                    {d.failureReason.body}
                  </p>
                )}
              </div>
            </div>
          )}

          <RecordingRecord
            detail={d}
            plan={playback.state === 'planned' ? playback.plan : undefined}
            onRemakeThumbnail={onRemakeThumbnail}
          />
        </div>
      </div>
    </ScreenMain>
  )
}
