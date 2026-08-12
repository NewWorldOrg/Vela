import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import type { RecordingDetail } from '@/repository/recordings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { FileMissingChip, QualityChip } from '@/feature/recordings/chips'
import {
  PLAYER_BUTTON,
  PLAYER_PALETTE,
} from '@/feature/recordings/player-palette'
import { Player } from '@/page-component/recordings/player'
import { RecordingActions } from '@/page-component/recordings/recording-actions'

const OUTCOME_MARK = {
  complete: SuccessIcon,
  truncated: OutcomeTruncatedIcon,
  failed: OutcomeFailedIcon,
} as const

const OUTCOME_STYLE = {
  complete: 'bg-tint-sage',
  truncated: 'bg-tint-butter',
  failed: 'bg-tint-salmon',
} as const

const OUTCOME_LABEL = {
  complete: '完全',
  truncated: '尻切れ',
  failed: '失敗',
} as const

export function RecordingDetailView({
  detail: d,
}: {
  detail: RecordingDetail
}) {
  return (
    <main className="flex-1 pb-16">
      <div className="flex items-center px-[30px] pt-[18px] pb-3 max-[1060px]:px-5 max-[700px]:px-3.5">
        <Link
          href="/library"
          className="inline-flex items-center gap-[7px] rounded-full border border-line py-[5px] pr-[13px] pl-2.5 text-ui font-medium text-ink-2 no-underline transition-[translate,background-color,color] duration-150 ease-toy hover:bg-surface hover:text-ink hover:-translate-x-px hover:-translate-y-px"
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
              <Stat k="経過" v={d.live.elapsed} />
              <Stat k="書き込み済み" v={d.live.written} />
              <Stat k="進行中のドロップ" v={d.live.drops} />
              <Stat k="残り" v={d.live.rest} />
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
              <KRow k="当初の終了予定" main={d.live.extension.plannedEnd} />
              <KRow
                k="現在の終了予定"
                main={d.live.extension.currentEnd}
                sub={d.live.extension.delta}
              />
              <KRow k="最終追従" main={d.live.extension.followedAt} />
              <p className="mt-2.5 text-note leading-relaxed text-ink-3">
                録画中は録画の記録が唯一の原簿です。ファイル名からは進行中と完成を判別しません。
              </p>
            </section>
          )}
        </div>
      )}

      {d.fileMissing ? (
        <section
          style={PLAYER_PALETTE}
          className="mx-[30px] rounded-lg border border-line-strong bg-(--pl-bg) px-5 py-[22px] text-center max-[1060px]:mx-5 max-[700px]:mx-3.5"
        >
          <ThumbMissingIcon className="mx-auto mb-2 size-[34px] text-(--pl-ink-2)" />
          <b className="heading block text-[14.5px] text-(--pl-ink)">
            ファイルが見つかりません
          </b>
          <p className="mt-[5px] text-sub leading-relaxed text-(--pl-ink-2)">
            録画の記録に行はありますが、実ファイルがありません。整合性チェックの一覧に理由付きで出ています。
          </p>
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              disabled
              title="整合性チェックの画面はこれから実装されます"
              className={PLAYER_BUTTON}
            >
              整合性チェックの結果へ
            </button>
          </div>
        </section>
      ) : d.outcome === 'failed' ? (
        <section
          style={PLAYER_PALETTE}
          className="mx-[30px] rounded-lg border border-line-strong bg-(--pl-bg) px-5 py-[22px] text-center max-[1060px]:mx-5 max-[700px]:mx-3.5"
        >
          <OutcomeFailedIcon className="mx-auto mb-2 size-[34px] text-(--pl-ink-2)" />
          <b className="heading block text-[14.5px] text-(--pl-ink)">
            再生できません
          </b>
          <p className="mt-[5px] text-sub leading-relaxed text-(--pl-ink-2)">
            実ファイルが 0 B
            のため、再生できるものがありません。理由は「失敗の理由」にあります。
          </p>
        </section>
      ) : d.outcome !== 'recording' ? (
        <Player key={d.id} detail={d} />
      ) : null}

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
            <MRow k="チャンネル">
              {d.channel}
              {d.channelNo && (
                <small className="ml-[9px] font-code text-[11.5px] text-ink-3">
                  {d.channelNo}
                </small>
              )}
            </MRow>
            <MRow k="録画日時">
              <span className="font-code">{d.recordedRange}</span>
            </MRow>
            {d.genres && (
              <MRow k="ジャンル">
                {d.genres.map((g) => (
                  <span
                    key={g}
                    className="mr-1.5 inline-block rounded-full border border-line bg-surface px-[11px] py-0.5 text-note font-medium text-ink-2"
                  >
                    {g}
                  </span>
                ))}
              </MRow>
            )}
            {d.avInfo && <MRow k="映像 / 音声">{d.avInfo}</MRow>}
          </div>
          {d.synopsis && (
            <p className="my-3.5 max-w-[560px] text-[13px] leading-[1.9] text-ink-2">
              {d.synopsis}
            </p>
          )}
          <div className="mt-[18px]">
            <RecordingActions recording={d} />
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
            <KRow
              k="突き合わせ"
              main={`${formatBytes(d.sizeBytes)} / 期待レンジ ${d.reconcile.range}`}
              sub={d.reconcile.sub}
            />
          )}
          {d.interruptions && (
            <KRow
              k="中断と再開"
              main={d.interruptions.main}
              sub={d.interruptions.sub}
            />
          )}
          {d.tunerUnit && (
            <KRow
              k="チューナー個体"
              main={d.tunerUnit.main}
              sub={d.tunerUnit.sub}
            />
          )}
          {d.eoverflow && <KRow k="dvr EOVERFLOW" main={d.eoverflow} />}
          {d.scramble && (
            <KRow
              k="スクランブル残存"
              main={d.scramble.main}
              sub={d.scramble.sub}
            />
          )}
          {d.stopReason && <KRow k="停止理由" main={d.stopReason} plain />}
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="サムネイル生成はこれから実装されます"
                >
                  {d.thumbnailState.main === '未生成' ? '生成する' : '再生成'}
                </Button>
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
              <Stat
                k="ドロップ合計"
                v={d.quality.measured ? (d.qualityTotal ?? '—') : '未計測'}
                unit={d.quality.measured ? 'パケット' : undefined}
                wordy={!d.quality.measured}
              />
              <Stat
                k="総パケット比"
                v={d.quality.measured ? (d.qualityRatio ?? '—') : '未計測'}
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
                計測が無かった録画です。良好とは別の状態として扱い、集計にも混ぜません。
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
                    className="flex flex-wrap items-center gap-3 border-b border-dashed border-line px-0.5 py-2.5 text-ui last:border-b-0"
                  >
                    <span className="w-[6.6em] font-code font-medium">
                      {spot.at}
                    </span>
                    <span className="font-code text-ink-2">{spot.packets}</span>
                    <button
                      type="button"
                      disabled
                      title="この時間帯の再生はこれから実装されます"
                      className="ml-auto text-sub font-bold whitespace-nowrap text-brand disabled:cursor-not-allowed disabled:text-ink-3"
                    >
                      この時間帯を再生
                    </button>
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
              <EncodeHeadChip detail={d} />
            </div>
            <EncodeBody detail={d} />
            {playableSource(d) && (
              <p className="mt-3 text-note leading-relaxed text-ink-3">
                エンコード状態は「軽く見られるか(シークが安いか)」の軸です。未エンコードでも失敗でも、オンザフライで再生できます。結果(録れたか)・品質(壊れていないか)とは独立しています。
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function playableSource(d: RecordingDetail) {
  return (
    !d.fileMissing && (d.outcome === 'complete' || d.outcome === 'truncated')
  )
}

function OutcomeMark({
  outcome,
}: {
  outcome: 'complete' | 'truncated' | 'failed'
}) {
  const Mark = OUTCOME_MARK[outcome]
  return <Mark className="size-[26px] shrink-0 text-ink" />
}

function Stat({
  k,
  v,
  unit,
  wordy,
}: {
  k: string
  v: string
  unit?: string
  wordy?: boolean
}) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-2 px-3.5 py-[11px]">
      <span className="mb-0.5 block text-[11px] font-medium text-ink-3">
        {k}
      </span>
      <span
        className={cn(
          'leading-snug break-all',
          wordy
            ? 'text-[15px] font-bold'
            : 'font-code text-[19px] font-medium tabular-nums',
        )}
      >
        {v}
        {unit && (
          <small className="ml-1 font-sans text-[11px] font-normal text-ink-3">
            {unit}
          </small>
        )}
      </span>
    </div>
  )
}

function MRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3.5 border-b border-dashed border-line py-2.5 text-[13px] last:border-b-0">
      <span className="w-24 shrink-0 pt-px text-sub text-ink-3">{k}</span>
      <span className="min-w-0">{children}</span>
    </div>
  )
}

function KRow({
  k,
  main,
  sub,
  plain,
}: {
  k: string
  main: string
  sub?: string
  plain?: boolean
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-dashed border-line py-[9px] text-ui last:border-b-0">
      <span className="w-[132px] shrink-0 text-note text-ink-3 max-[900px]:w-[110px] max-[700px]:w-full">
        {k}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(!plain && 'font-code text-[13px]')}>{main}</span>
        {sub && (
          <small className="block text-[11px] leading-[1.7] text-ink-3">
            {sub}
          </small>
        )}
      </span>
    </div>
  )
}

function EncodeHeadChip({ detail: d }: { detail: RecordingDetail }) {
  const map = {
    none: (
      <Badge variant="mute" className="font-bold">
        <ChipDot />
        未エンコード
      </Badge>
    ),
    waiting: (
      <Badge variant="info" className="font-bold">
        <ChipDot />
        待機中
      </Badge>
    ),
    running: (
      <Badge variant="info" className="font-bold">
        <ChipDot />
        実行中
      </Badge>
    ),
    done: (
      <Badge variant="ok" className="font-bold">
        <ChipDot />
        完了
      </Badge>
    ),
    failed: (
      <Badge variant="err" className="font-bold">
        <ChipDot />
        失敗
      </Badge>
    ),
  } as const
  return map[d.encode.status]
}

function EncodeBody({ detail: d }: { detail: RecordingDetail }) {
  const p = d.encodePanel
  switch (d.encode.status) {
    case 'done':
      return (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[120px] flex-1 rounded-lg bg-surface-2 px-3.5 py-[11px]">
              <span className="mb-0.5 block text-[11px] text-ink-3">元 TS</span>
              <span className="font-code text-[16px] font-medium tabular-nums">
                {p?.sourceSize}
              </span>
            </div>
            <span className="shrink-0 text-[14px] text-ink-3">→</span>
            <div className="min-w-[120px] flex-1 rounded-lg bg-surface-2 px-3.5 py-[11px]">
              <span className="mb-0.5 block text-[11px] text-ink-3">H.264</span>
              <span className="font-code text-[16px] font-medium tabular-nums">
                {p?.outSize}
              </span>
              <small className="ml-[7px] font-code text-[11px] font-medium text-mint">
                {p?.savings}
              </small>
            </div>
          </div>
          <p className="mt-3 font-code text-[11.5px] leading-relaxed text-ink-3">
            {p?.doneSub}
          </p>
        </>
      )
    case 'running':
      return (
        <>
          {p?.profile && <KRow k="プロファイル" main={p.profile} plain />}
          <ProgressBar
            value={p?.progressPct ?? 0}
            aria-label="エンコードの進捗"
            className="mt-3 h-[9px]"
          />
          <p className="mt-3 font-code text-[11.5px] leading-relaxed text-ink-3">
            {p?.progressSub}
          </p>
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="エンコード操作はこれから実装されます"
            >
              キャンセル
            </Button>
          </div>
        </>
      )
    case 'waiting':
      return (
        <>
          <p className="mb-2.5 text-sub leading-relaxed text-ink-2">
            {p?.queueSub}
          </p>
          {p?.profile && <KRow k="プロファイル" main={p.profile} plain />}
          {p?.registeredAt && <KRow k="登録" main={p.registeredAt} />}
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="エンコード操作はこれから実装されます"
            >
              キャンセル
            </Button>
          </div>
        </>
      )
    case 'failed':
      return (
        <>
          {d.encode.reason && <KRow k="分類" main={d.encode.reason} />}
          {p?.attempts && <KRow k="試行" main={p.attempts} />}
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="エンコード操作はこれから実装されます"
            >
              再実行
            </Button>
          </div>
          <p className="mt-3 text-note leading-relaxed text-ink-3">
            エンコードの失敗は録画の結果を書き換えません。録画は成功のまま、成果物だけが無い状態です。
          </p>
        </>
      )
    case 'none':
      return (
        <p className="text-sub leading-relaxed text-ink-2">
          {playableSource(d)
            ? '成果物はまだありません。オンザフライで再生できますが、シークのたびにトランスコーダを立て直します。'
            : '成果物はありません。'}
        </p>
      )
  }
}
