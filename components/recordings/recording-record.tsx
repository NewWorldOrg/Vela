import Link from 'next/link'

import { EMPTY_VALUE } from '@/lib/empty-value'
import type { CSSProperties, ReactNode } from 'react'
import type { Route } from 'next'

import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { encodeRowOf } from '@/lib/encode'
import type { RecordingDetail } from '@/repository/recordings'
import type { EncodeJob, EncodeWrite } from '@/repository/encode'
import type { PlaybackPlan } from '@/repository/videos'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'
import { ChevronRightIcon, QualityIcon } from '@/components/vela/icons'
import { CancelJobButton } from '@/components/encode/cancel-job-button'
import { DetailKeyRow } from '@/components/recordings/detail-key-row'
import { DetailStat } from '@/components/recordings/detail-stat'
import { EncodeChip } from '@/components/recordings/encode-chip'
import { OutcomeChip } from '@/components/recordings/outcome-chip'
import { QualityChip } from '@/components/recordings/quality-chip'
import { ThumbnailChip } from '@/components/recordings/thumbnail-chip'

function Caption({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mt-[calc(18rem/16)] mb-1.5 flex items-center gap-[calc(7rem/16)] text-cap font-bold tracking-[0.05em] text-ink-3 first:mt-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function RecordingRecord({
  detail: d,
  plan,
  encodeJob,
  onCallOffEncode,
}: {
  detail: RecordingDetail
  plan?: PlaybackPlan
  encodeJob?: EncodeJob
  onCallOffEncode: (id: string) => Promise<EncodeWrite>
}) {
  const spots = d.qualitySpots ?? []
  const encode = encodeRowOf(encodeJob, d.encode, d.encodeWhenRecorded)

  return (
    <details
      data-slot="unfold-details"
      className="unfolds-itself group mt-[calc(22rem/16)] rounded-xl bg-surface px-[calc(22rem/16)]"
    >
      <summary className="tap-target flex cursor-pointer list-none items-center gap-[calc(9rem/16)] py-[calc(15rem/16)] text-ui font-bold text-ink-2 transition-colors duration-150 ease-out hover:text-ink focus-visible:shadow-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-[calc(15rem/16)] text-brand transition-transform duration-150 ease-toy group-open:rotate-90" />
        <QualityIcon className="size-[calc(15rem/16)] text-brand" />
        技術情報
      </summary>
      <div
        style={{ '--row-label': '176px' } as CSSProperties}
        className="max-w-[calc(900rem/16)] border-t border-dashed border-line pt-4 pb-5"
      >
        {d.outcome === 'complete' && (
          <DetailKeyRow
            label="結果"
            main={<OutcomeChip recording={d} />}
            plain
          />
        )}

        <DetailKeyRow
          label="受信品質"
          plain
          main={
            d.quality.measured || d.leftScrambled ? (
              <QualityChip recording={d} />
            ) : (
              <Badge variant="mute" className="font-bold tracking-normal">
                <ChipDot />
                未計測
              </Badge>
            )
          }
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(calc(140rem/16),1fr))] gap-[calc(11rem/16)]">
          <DetailStat
            label="ドロップ合計"
            value={
              d.quality.measured ? (d.qualityTotal ?? EMPTY_VALUE) : '未計測'
            }
            unit={d.quality.measured ? 'パケット' : undefined}
            wordy={!d.quality.measured}
          />
          <DetailStat
            label="総パケット比"
            value={
              d.quality.measured ? (d.qualityRatio ?? EMPTY_VALUE) : '未計測'
            }
            unit={d.quality.measured ? '%' : undefined}
            wordy={!d.quality.measured}
          />
        </div>
        {spots.length > 0 && (
          <>
            <div className="mt-3.5 mb-1 flex items-center gap-[calc(7rem/16)] text-cap font-bold tracking-[0.05em] text-ink-3">
              発生時間帯の内訳
              <i className="h-px flex-1 border-t border-dashed border-line not-italic" />
            </div>
            {spots.map((spot) => (
              <div
                key={spot.at}
                className="flex flex-wrap items-center gap-3 border-b border-dashed border-line px-0.5 py-3 text-ui last:border-b-0"
              >
                <span className="w-[7.6em] font-code font-medium whitespace-nowrap">
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
          </>
        )}

        <Caption>
          録画
          <i className="h-px flex-1 border-t border-dashed border-line not-italic" />
        </Caption>
        {d.stopReason && (
          <DetailKeyRow label="停止理由" main={d.stopReason} plain />
        )}
        {d.interruptions && (
          <DetailKeyRow label="中断と再開" main={d.interruptions.main} />
        )}
        {d.scramble && (
          <DetailKeyRow
            label="解除できなかったスクランブル"
            main={d.scramble.main}
          />
        )}
        {d.eoverflow && <DetailKeyRow label="取りこぼし" main={d.eoverflow} />}
        {d.tunerUnit && (
          <DetailKeyRow label="使ったチューナー" main={d.tunerUnit.main} />
        )}

        <Caption>
          ファイル
          <i className="h-px flex-1 border-t border-dashed border-line not-italic" />
        </Caption>
        {d.reconcile && (
          <>
            <DetailKeyRow label="ファイル" main={d.reconcile.size} />
            <DetailKeyRow
              label="書かれた長さ"
              main={d.reconcile.written}
              sub={`予定 ${d.reconcile.planned}`}
            />
          </>
        )}
        {plan && <SourceRow detail={d} plan={plan} />}
        <DetailKeyRow
          label="エンコード"
          main={<EncodeChip recording={d} says={encode.main} />}
          sub={encode.sub}
          plain
          action={
            encodeJob &&
            encode.cancels && (
              <CancelJobButton
                job={{
                  id: encodeJob.id,
                  title: d.title,
                  status: encodeJob.status,
                }}
                onCallOff={onCallOffEncode}
              />
            )
          }
        />
        {d.thumbnailState && (
          <DetailKeyRow
            label="サムネイル"
            main={<ThumbnailChip recording={d} says={d.thumbnailState.main} />}
            sub={d.thumbnailState.sub}
            plain
          />
        )}
      </div>
    </details>
  )
}

function SourceRow({
  detail: d,
  plan,
}: {
  detail: RecordingDetail
  plan: PlaybackPlan
}) {
  const tsLabel =
    d.sizeBytes == null ? '元 TS' : `元 TS ${formatBytes(d.sizeBytes)}`

  if (d.encode !== 'completed') {
    return (
      <DetailKeyRow
        label="再生ソース"
        main={`${tsLabel}${plan.transcodes ? '(オンザフライ)' : ''}`}
      />
    )
  }

  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-dashed border-line py-[calc(9rem/16)] text-ui last:border-b-0">
      <span className="w-[var(--row-label,132px)] shrink-0 text-note text-ink-3 max-[900px]:w-[calc(130rem/16)] max-[700px]:w-full">
        再生ソース
      </span>
      <span
        role="group"
        aria-label="再生ソース"
        className="inline-flex gap-1 rounded-full border border-line p-0.5"
      >
        {['H.264', tsLabel].map((label, index) => {
          const inUse = index === (plan.transcodes ? 1 : 0)

          return (
            <span
              key={label}
              aria-current={inUse ? 'true' : undefined}
              className={cn(
                'rounded-full px-[calc(11rem/16)] py-[calc(3rem/16)] font-code text-note font-medium whitespace-nowrap text-ink-3',
                inUse && 'bg-brand-soft font-bold text-brand',
              )}
            >
              {label}
            </span>
          )
        })}
      </span>
    </div>
  )
}
