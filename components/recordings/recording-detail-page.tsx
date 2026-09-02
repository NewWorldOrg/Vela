import Link from 'next/link'

import type { ReactNode } from 'react'
import type { Route } from 'next'

import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { isPlayableSource } from '@/lib/recordings'
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
import { ProgressBar } from '@/components/vela/progress'
import { ChipDot } from '@/components/vela/status'
import {
  ChevronLeftIcon,
  EncodeIcon,
  ListIcon,
  OutcomeFailedIcon,
  OutcomeTruncatedIcon,
  QualityIcon,
  SuccessIcon,
  ThumbMissingIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { FileMissingChip } from '@/components/recordings/file-missing-chip'
import { PlaybackNotice } from '@/components/recordings/playback-notice'
import { QualityChip } from '@/components/recordings/quality-chip'
import { PLAYER_BUTTON } from '@/components/recordings/player-palette'
import { Player } from '@/components/recordings/player'
import { DetailKeyRow } from '@/components/recordings/detail-key-row'
import { DetailRow } from '@/components/recordings/detail-row'
import { DetailStat } from '@/components/recordings/detail-stat'
import { EncodePanelBody } from '@/components/recordings/encode-panel-body'
import { EncodeStatusChip } from '@/components/recordings/encode-status-chip'
import { OutcomeMark } from '@/components/recordings/outcome-mark'
import { RecordingActions } from '@/components/recordings/recording-actions'
import { ThumbnailButton } from '@/components/recordings/thumbnail-button'
import { ScreenMain } from '@/components/vela/app-shell'

const OUTCOME_STYLE = {
  complete: 'bg-tint-sage',
  truncated: 'bg-tint-butter',
  failed: 'bg-tint-salmon',
} as const

/**
 * What the API said instead of a plan. Four refusals, four notices: a
 * recording still being written, one that wrote nothing, a file out of reach
 * and an answer that could not be read are different things to do next, and
 * one notice for all of them would leave the reader to guess which they have.
 */
const REFUSED: Record<PlaybackRefusal, ReactNode> = {
  stillRecording: (
    <PlaybackNotice
      tone="waiting"
      mark={<ListIcon className="size-[22px]" />}
      title="録画中は再生できません"
      body="書き込み中の録画は再生の対象外です。再生できるのは録画の完了後です。"
    />
  ),
  nothingToPlay: (
    <PlaybackNotice
      tone="gone"
      mark={<OutcomeFailedIcon className="size-[22px]" />}
      title="再生できるものがありません"
      body="この録画には書かれた中身がありません。理由は「録画の記録」にあります。"
    />
  ),
  outOfReach: (
    <PlaybackNotice
      tone="waiting"
      mark={<ThumbMissingIcon className="size-[22px]" />}
      title="録画ファイルに到達できません"
      body="録画の記録に行はありますが、保存先に到達できません。整合性チェックの一覧に理由付きで出ています。"
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
      body="再生できるかどうかの応答がありません。時間をおいて開き直すと読める場合があります。"
    />
  ),
}

/**
 * Why a failed recording has no picture to draw.
 *
 * The size is read off the recording rather than written into the sentence: it
 * said "実ファイルが 0 B のため" over a recording the band above the same
 * notice reported as gigabytes. The reader is sent to 「失敗の理由」 only where
 * that block is drawn — it is drawn only for a fault the store named, and a
 * pointer to a section that is not on the page is another wrong answer.
 */
function whyItCannotBePlayed(d: RecordingDetail) {
  const size = d.sizeBytes
    ? `実ファイルは ${formatBytes(d.sizeBytes)} ありますが、結果は失敗として記録されています。`
    : '実ファイルは 0 B で、再生できる中身がありません。'

  return d.failureReason
    ? `${size}理由は下の「失敗の理由」にあります。`
    : `${size}経緯は下の「録画の記録」にあります。`
}

const OUTCOME_LABEL = {
  complete: '完全',
  truncated: '尻切れ',
  failed: '失敗',
} as const

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

  return (
    <ScreenMain className="pb-16">
      <div className="flex items-center px-[30px] pt-[18px] pb-3 max-[1060px]:px-5 max-[700px]:px-3.5">
        <Link
          href="/library"
          className="tap-target inline-flex items-center gap-[7px] rounded-full border border-edge py-[5px] pr-[13px] pl-2.5 text-ui font-medium text-ink-2 no-underline transition-[translate,background-color,color] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px"
        >
          <ChevronLeftIcon className="size-[15px]" />
          ライブラリへ
        </Link>
      </div>

      {d.outcome !== 'recording' && (
        <div
          className={cn(
            'mx-[30px] mb-3.5 flex flex-wrap items-center gap-3.5 rounded-lg px-[18px] py-[13px] max-[1060px]:mx-5 max-[700px]:mx-3.5',
            OUTCOME_STYLE[d.outcome],
          )}
        >
          <OutcomeMark outcome={d.outcome} />
          <h2 className="heading text-[15px] whitespace-nowrap">
            {OUTCOME_LABEL[d.outcome]}
          </h2>
          {d.fileMissing && <FileMissingChip className="mt-0" />}
          <p className="min-w-[200px] flex-1 text-ui leading-relaxed text-ink-2">
            {d.outcomeBody}
          </p>
          {d.outcomeAxis && (
            <span className="text-note whitespace-nowrap text-ink-2">
              {d.outcomeAxis}
            </span>
          )}
        </div>
      )}

      {d.outcome === 'recording' && d.live && (
        <div className="mx-[30px] mb-3.5 grid grid-cols-2 gap-4 max-[1060px]:mx-5 max-[900px]:grid-cols-1 max-[700px]:mx-3.5">
          <section className="rounded-xl bg-surface px-[19px] py-[17px]">
            <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
              <Badge variant="recording" className="gap-[7px] pl-[9px]">
                <ListIcon className="size-[13px]" />
                録画中
              </Badge>
              <span className="text-[11px] text-ink-3">
                録画の記録が原簿(ファイル名では判別しない)
              </span>
            </div>
            <p className="mb-2.5 text-sub leading-relaxed text-ink-2">
              進行中の値は driver の通知を 30
              秒周期で録画の記録へ書いています。値が動いていること自体が、計測が生きている証拠です。
            </p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(128px,1fr))] gap-2.5">
              <DetailStat label="経過" value={d.live.elapsed} />
              <DetailStat label="書き込み済み" value={d.live.written} />
              <DetailStat label="進行中のドロップ" value={d.live.drops} />
              <DetailStat label="残り" value={d.live.rest} />
            </div>
            <p className="mt-2.5 text-note text-ink-3">
              最終更新 <span className="font-code">{d.live.updatedAt}</span> ·
              30 秒ごとに更新
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
              <p className="mb-2.5 text-sub leading-relaxed text-ink-2">
                終了予定が後ろへ動きました。追従は後方のみで、前方へ短縮された場合は追従しません。
              </p>
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
              <p className="mt-2.5 text-note leading-relaxed text-ink-3">
                録画中は録画の記録が唯一の原簿です。進行中と完成の判別にファイル名は使われません。
              </p>
            </section>
          )}
        </div>
      )}

      <div className="mx-[30px] max-[1060px]:mx-5 max-[700px]:mx-3.5">
        {d.fileMissing ? (
          <PlaybackNotice
            tone="waiting"
            mark={<ThumbMissingIcon className="size-[22px]" />}
            title="ファイルが見つかりません"
            body="録画の記録に行はありますが、実ファイルがありません。整合性チェックの一覧に理由付きで出ています。"
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
            body={whyItCannotBePlayed(d)}
          />
        ) : playback.state === 'refused' ? (
          REFUSED[playback.refusal]
        ) : playback.plan.route === 'nothing' ? (
          <PlaybackNotice
            mark={<ThumbMissingIcon className="size-[22px]" />}
            title="再生できる成果物がありません"
            body="この録画には、ブラウザへ渡せる成果物がありません。"
          />
        ) : null}
      </div>
      {plays && playback.state === 'planned' && (
        <Player
          key={`${d.id}:${startAt ?? ''}`}
          detail={d}
          plan={playback.plan}
          onTakeTicket={onTakeTicket}
          startAt={startAt}
        />
      )}

      <div className="grid grid-cols-[1.35fr_1fr] items-start gap-[18px] px-[30px] pt-[22px] pb-[34px] *:min-w-0 max-[1060px]:grid-cols-1 max-[1060px]:px-5 max-[700px]:px-3.5">
        <section className="rounded-xl bg-surface px-[22px] py-5">
          <div className="mb-[7px] flex items-center gap-[7px] text-[11px] font-bold tracking-[0.05em] text-ink-3">
            <ListIcon className="size-3.5 text-brand" />
            番組情報
            <span className="font-normal tracking-normal">
              録画時点のスナップショット
            </span>
          </div>
          <h1 className="heading mb-3.5 text-[20px] leading-normal">
            {d.title}
          </h1>
          <div className="border-t border-dashed border-line">
            <DetailRow label="チャンネル">
              {d.channel}
              {d.channelNo && (
                <small className="ml-[9px] font-code text-[11.5px] text-ink-3">
                  {d.channelNo}
                </small>
              )}
            </DetailRow>
            <DetailRow label="録画日時">
              <span className="font-code">{d.recordedRange}</span>
            </DetailRow>
            {d.reservationId && (
              <DetailRow label="予約">
                <Link
                  href={reservationHref(d.reservationId) as Route}
                  className="tap-target font-bold text-brand underline-offset-[3px] hover:underline"
                >
                  この録画の予約
                </Link>
              </DetailRow>
            )}
            {d.genres && (
              <DetailRow label="ジャンル">
                {d.genres.map((g) => (
                  <span
                    key={g}
                    className="mr-1.5 inline-block rounded-full border border-line bg-surface px-[11px] py-0.5 text-note font-medium text-ink-2"
                  >
                    {g}
                  </span>
                ))}
              </DetailRow>
            )}
            {d.avInfo && <DetailRow label="映像 / 音声">{d.avInfo}</DetailRow>}
          </div>
          {d.synopsis && (
            <p className="my-3.5 max-w-[560px] text-[13px] leading-[1.9] text-ink-2">
              {d.synopsis}
            </p>
          )}
          <div className="mt-[18px]">
            <RecordingActions recording={d} onDelete={onDelete} plays={plays} />
          </div>

          {d.failureReason && (
            <>
              <div className="mt-[22px] mb-[7px] flex items-center gap-[7px] text-[11px] font-bold tracking-[0.05em] text-ink-3">
                <WarningIcon className="size-3.5 text-brand" />
                失敗の理由
              </div>
              <div className="flex flex-wrap items-start gap-[13px] rounded-lg bg-surface-2 px-[15px] py-3">
                <span className="flex size-8 flex-none items-center justify-center rounded-md bg-surface text-ink-2">
                  <WarningIcon className="size-[17px]" />
                </span>
                <div className="min-w-[170px] flex-1">
                  <b className="heading block text-[13.5px]">
                    {d.failureReason.title}
                  </b>
                  <p className="mt-0.5 text-sub leading-relaxed text-ink-2">
                    {d.failureReason.body}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="mt-[22px] mb-[7px] flex items-center gap-[7px] text-[11px] font-bold tracking-[0.05em] text-ink-3">
            <QualityIcon className="size-3.5 text-brand" />
            録画の記録
            <span className="font-normal tracking-normal">
              録画の記録が唯一の原簿。ファイル名からは判別しない
            </span>
          </div>
          {d.reconcile && (
            <DetailKeyRow
              label="突き合わせ"
              main={d.reconcile.main}
              sub={d.reconcile.sub}
            />
          )}
          {d.interruptions && (
            <DetailKeyRow
              label="中断と再開"
              main={d.interruptions.main}
              sub={d.interruptions.sub}
            />
          )}
          {d.tunerUnit && (
            <DetailKeyRow
              label="チューナー個体"
              main={d.tunerUnit.main}
              sub={d.tunerUnit.sub}
            />
          )}
          {d.eoverflow && (
            <DetailKeyRow label="dvr EOVERFLOW" main={d.eoverflow} />
          )}
          {d.scramble && (
            <DetailKeyRow
              label="スクランブル残存"
              main={d.scramble.main}
              sub={d.scramble.sub}
            />
          )}
          {d.stopReason && (
            <DetailKeyRow label="停止理由" main={d.stopReason} plain />
          )}
          {d.thumbnailState && (
            <div className="flex flex-wrap items-baseline gap-3 border-b border-dashed border-line py-[9px] text-ui last:border-b-0">
              <span className="w-[132px] shrink-0 text-note text-ink-3 max-[900px]:w-[110px] max-[700px]:w-full">
                サムネイル
              </span>
              <span className="min-w-0 flex-1">
                {d.thumbnailState.main}
                {d.thumbnailState.sub && (
                  <small className="block text-[11px] leading-[1.7] text-ink-3">
                    {d.thumbnailState.sub}
                  </small>
                )}
              </span>
              {d.thumbnailState.canGenerate && (
                <ThumbnailButton
                  id={d.id}
                  label={
                    d.thumbnailState.main === '未生成' ? '生成する' : '再生成'
                  }
                  onRemake={onRemakeThumbnail}
                />
              )}
            </div>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <section className="rounded-xl bg-surface px-[22px] py-5">
            <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
              <h2 className="heading flex min-w-0 flex-1 items-center gap-[7px] text-[15px]">
                <QualityIcon className="size-4 shrink-0 text-brand" />
                受信品質
              </h2>
              {d.quality.measured ? (
                <QualityChip recording={d} withDetail={false} />
              ) : (
                <Badge variant="mute" className="font-bold">
                  <ChipDot />
                  未計測
                </Badge>
              )}
            </div>
            <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[11px]">
              <DetailStat
                label="ドロップ合計"
                value={d.quality.measured ? (d.qualityTotal ?? '—') : '未計測'}
                unit={d.quality.measured ? 'パケット' : undefined}
                wordy={!d.quality.measured}
              />
              <DetailStat
                label="総パケット比"
                value={d.quality.measured ? (d.qualityRatio ?? '—') : '未計測'}
                unit={d.quality.measured ? '%' : undefined}
                wordy={!d.quality.measured}
              />
            </div>
            {d.quality.measured ? (
              <p className="text-note leading-relaxed text-ink-3">
                判定は <b className="font-code font-medium text-ink-2">0.02%</b>{' '}
                超で警告水準 /{' '}
                <b className="font-code font-medium text-ink-2">0.1%</b>{' '}
                超で視聴不可の恐れ(いずれも暫定値)。計測していない録画は「未計測」で、良好とは別の状態です。
              </p>
            ) : d.outcome === 'recording' ? (
              <p className="text-note leading-relaxed text-ink-3">
                {d.quality.detail}
              </p>
            ) : (
              <p className="text-note leading-relaxed text-ink-3">
                計測が無かった録画です。良好とは別の状態として扱い、集計にも混ざりません。
              </p>
            )}
            {d.qualitySpots && d.qualitySpots.length > 0 && (
              <>
                <div className="mt-3.5 mb-1 flex items-center gap-[7px] text-[11px] font-bold tracking-[0.05em] text-ink-3">
                  発生時間帯の内訳
                  <i className="h-px flex-1 border-t border-dashed border-line not-italic" />
                </div>
                {d.qualitySpots.map((spot) => (
                  <div
                    key={spot.at}
                    className="flex flex-wrap items-center gap-3 border-b border-dashed border-line px-0.5 py-3 text-ui last:border-b-0"
                  >
                    <span className="w-[6.6em] font-code font-medium">
                      {spot.at}
                    </span>
                    <span className="font-code text-ink-2">{spot.packets}</span>
                    <Link
                      href={`/recordings/${d.id}?at=${spot.second}` as Route}
                      scroll={false}
                      replace
                      className="tap-target ml-auto text-sub font-bold whitespace-nowrap text-brand underline-offset-[3px] hover:underline"
                    >
                      この時間帯を再生
                    </Link>
                  </div>
                ))}
                <p className="mt-3 text-note leading-relaxed text-ink-3">
                  ドロップは映像・音声の乱れとして現れることがあります。該当の時間帯を再生して、視聴に支障がないか確認できます。
                </p>
              </>
            )}
          </section>

          <section className="rounded-xl bg-surface px-[22px] py-5">
            <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
              <h2 className="heading flex min-w-0 flex-1 items-center gap-[7px] text-[15px]">
                <EncodeIcon className="size-4 shrink-0 text-brand" />
                エンコード
              </h2>
              <EncodeStatusChip detail={d} />
            </div>
            <EncodePanelBody detail={d} />
            {isPlayableSource(d) && (
              <p className="mt-3 text-note leading-relaxed text-ink-3">
                エンコード状態は「軽く見られるか(シークが安いか)」の軸です。未エンコードでも失敗でも、オンザフライで再生できます。結果(録れたか)・品質(壊れていないか)とは独立しています。
              </p>
            )}
          </section>
        </div>
      </div>
    </ScreenMain>
  )
}
