import Link from 'next/link'

import type { CSSProperties, ReactNode } from 'react'
import type { Route } from 'next'

import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import type { RecordingDetail } from '@/repository/recordings'
import type { PlaybackPlan } from '@/repository/videos'
import { Badge } from '@/components/ui/badge'
import { ChipDot } from '@/components/vela/status'
import { ChevronRightIcon, QualityIcon } from '@/components/vela/icons'
import { DetailKeyRow } from '@/components/recordings/detail-key-row'
import { DetailStat } from '@/components/recordings/detail-stat'
import { QualityChip } from '@/components/recordings/quality-chip'

/** A rule with a caption sitting in it, between the groups of rows. */
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
        'mt-[18px] mb-1.5 flex items-center gap-[7px] text-[11px] font-bold tracking-[0.05em] text-ink-3 first:mt-0',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * How this recording came to be, folded away under the programme.
 *
 * It is kept — a recording that came out wrong is read here and nowhere else —
 * and it is not the screen. What was on the page before was every fact the API
 * answers with, laid out at the same weight as the programme's own name: four
 * of the twelve values above the fold were about the programme and eight were
 * about the machinery that recorded it (measured 2026-09-04, v3.35).
 *
 * One fold and not several. Reception, the reason it stopped, the file, the
 * tuner and the thumbnail are all "how this recording came out"; split across
 * panels, the reader has to guess which one to open. Opened, everything is
 * there.
 *
 * Not a second page either: a page would need a URL and a way to it written on
 * this one, and the way to it would be a sentence explaining what is over
 * there. A fold opens and shuts inside the screen and leaves the URL alone.
 *
 * Shut by default, and the state is not remembered. What v3.30 and v3.33
 * remember are states a reader keeps watching in; a record is read once and
 * closed.
 */
export function RecordingRecord({
  detail: d,
  plan,
}: {
  detail: RecordingDetail
  /** How the picture is being served, where one is. */
  plan?: PlaybackPlan
}) {
  const spots = d.qualitySpots ?? []

  return (
    <details className="group mt-[22px] rounded-xl bg-surface px-[22px]">
      <summary className="tap-target flex cursor-pointer list-none items-center gap-[9px] py-[15px] text-ui font-bold text-ink-2 transition-colors duration-150 ease-out hover:text-ink focus-visible:shadow-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="size-[15px] text-brand transition-transform duration-150 ease-toy group-open:rotate-90" />
        <QualityIcon className="size-[15px] text-brand" />
        録画の記録
      </summary>
      {/*
        Held to a measure of its own inside a column that follows the picture.
        A name and its value lose each other across a 2187px desk — which is
        the reason v3.28 put the reading on a step in the first place — while
        the programme's own name and description above want the picture's
        width.
      */}
      <div
        style={{ '--row-label': '176px' } as CSSProperties}
        className="max-w-[900px] border-t border-dashed border-line pt-4 pb-5"
      >
        {/*
          Only where the screen has not said it already. 尻切れ and 失敗 are on
          the band above the picture and 録画中 is on the badge beside the
          counters; repeating the word down here would be the same statement
          twice on one screen, and the reader would have to work out whether
          the two were about the same thing. 完全 has no band — that is the
          whole reason this row exists (v3.35).
        */}
        {d.outcome === 'complete' && (
          <DetailKeyRow label="結果" main="完全" plain />
        )}

        <Caption>
          受信品質
          <i className="h-px flex-1 border-t border-dashed border-line not-italic" />
          {d.quality.measured ? (
            <QualityChip recording={d} withDetail={false} />
          ) : (
            <Badge variant="mute" className="font-bold tracking-normal">
              <ChipDot />
              未計測
            </Badge>
          )}
        </Caption>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-[11px]">
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
        {spots.length > 0 && (
          <>
            <div className="mt-3.5 mb-1 flex items-center gap-[7px] text-[11px] font-bold tracking-[0.05em] text-ink-3">
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
        {/*
          The names on the left are the reader's; the values on the right stay
          in the words the device answered with (v3.35 narrows v3.26's carve-out
          to values). `dvr EOVERFLOW` was standing as a row's name.
        */}
        {d.scramble && (
          <DetailKeyRow
            label="解除できなかったスクランブル"
            main={d.scramble.main}
          />
        )}
        {d.eoverflow && <DetailKeyRow label="取りこぼし" main={d.eoverflow} />}
        {d.tunerUnit && (
          <DetailKeyRow
            label="使ったチューナー"
            main={d.tunerUnit.main}
            sub={d.tunerUnit.sub}
          />
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
        {/*
          A reading, not a control. Drawing the picture again is something done
          with the recording and stands with 削除 and 外部プレイヤーで開く, where
          everything else done with the recording is; a second button for it in
          here would be the same press in two places on one screen.
        */}
        {d.thumbnailState && (
          <DetailKeyRow
            label="サムネイル"
            main={d.thumbnailState.main}
            sub={d.thumbnailState.sub}
            plain
          />
        )}
      </div>
    </details>
  )
}

/**
 * What is being played, as a reading and not a switch (v3.17).
 *
 * The route is the API's to pick and it takes no argument for it, so a control
 * here would be one that moves and changes nothing. It stands in the record
 * rather than under the picture because knowing it is not part of watching.
 */
function SourceRow({
  detail: d,
  plan,
}: {
  detail: RecordingDetail
  plan: PlaybackPlan
}) {
  const tsLabel =
    d.sizeBytes == null ? '元 TS' : `元 TS ${formatBytes(d.sizeBytes)}`

  if (d.encode?.status !== 'done') {
    return (
      <DetailKeyRow
        label="再生ソース"
        main={`${tsLabel}${plan.transcodes ? '(オンザフライ)' : ''}`}
      />
    )
  }

  const encodedLabel = `H.264 ${d.encodePanel?.outSize ?? ''}`.trim()

  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-dashed border-line py-[9px] text-ui last:border-b-0">
      <span className="w-[var(--row-label,132px)] shrink-0 text-note text-ink-3 max-[900px]:w-[130px] max-[700px]:w-full">
        再生ソース
      </span>
      <span
        role="group"
        aria-label="再生ソース"
        className="inline-flex gap-1 rounded-full border border-line p-0.5"
      >
        {[encodedLabel, tsLabel].map((label, index) => {
          const inUse = index === (plan.transcodes ? 1 : 0)

          return (
            <span
              key={label}
              aria-current={inUse ? 'true' : undefined}
              className={cn(
                'rounded-full px-[11px] py-[3px] font-code text-[11.5px] font-medium whitespace-nowrap text-ink-3',
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
