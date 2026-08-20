import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { QualityLevel, QualityResult } from '@/repository/quality'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Banner } from '@/components/vela/banner'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import {
  ChevronRightIcon,
  MarkDoubleCircle,
  MarkDots,
  MarkPill,
  MarkSlashes,
  MarkSplit,
} from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import {
  QUALITY_LEVEL_LABEL,
  QualityChip,
} from '@/components/quality/signal-quality-chip'
import { QualityHealthCell } from '@/components/quality/quality-health-cell'

const HEALTH_COLUMNS = [
  'チューナー',
  '状態',
  'ドロップ率',
  'lock 率',
  'CNR',
  'post-Viterbi ビット誤り率',
]

const BAR_TONE: Record<QualityLevel, string> = {
  good: 'bg-mint',
  warn: 'bg-lemon',
  bad: 'bg-coral',
  unmeasured: 'bg-transparent',
  nodata: 'bg-transparent',
  unsupported: 'bg-transparent',
  unreachable: 'bg-transparent',
}

export function QualityView({ result }: { result: QualityResult }) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>品質</CrumbCurrent>
      </Crumb>
      <PageHeading
        description="録画品質の常時計測。ドロップの発生状況とチューナーの健全性"
        action={
          <div className="inline-flex gap-0.5 rounded-full bg-surface-2 p-[3px]">
            {result.windowOptions.map((option) => (
              <span
                key={option}
                className={cn(
                  'rounded-full px-3.5 py-[5px] text-sub font-medium whitespace-nowrap text-ink-2',
                  option === result.windowLabel &&
                    'bg-brand-soft font-bold text-brand',
                )}
              >
                {option}
              </span>
            ))}
          </div>
        }
      >
        品質
      </PageHeading>

      {result.supplyOutage && (
        <Banner
          tone="danger"
          className="mt-3.5"
          actions={[{ label: 'チューナーへ', href: '/settings/tuners' }]}
        >
          <b className="block">{result.supplyOutage.title}</b>
          {result.supplyOutage.body}
        </Banner>
      )}

      <div className="mt-3.5 grid gap-2.5 min-[720px]:grid-cols-2 min-[1120px]:grid-cols-4">
        {result.stats.map((stat) => (
          <Surface key={stat.key}>
            <span className="heading block text-sub text-ink-2">
              {stat.label}
            </span>
            <span className="mt-1 block font-code text-[26px] leading-none font-medium tabular-nums">
              {stat.value ? (
                <>
                  {stat.value}
                  {stat.unit && (
                    <small className="ml-1 font-sans text-note font-medium text-ink-3">
                      {stat.unit}
                    </small>
                  )}
                </>
              ) : (
                stat.level && (
                  <QualityChip level={stat.level}>
                    {stat.levelLabel}
                  </QualityChip>
                )
              )}
            </span>
            <span className="mt-2.5 flex flex-wrap items-center gap-2">
              {stat.value && stat.level && (
                <QualityChip level={stat.level}>{stat.levelLabel}</QualityChip>
              )}
              {stat.aside && (
                <span className="text-note text-ink-3">{stat.aside}</span>
              )}
              {stat.link && (
                <Link
                  href={stat.link.href}
                  className="text-note font-bold text-brand underline-offset-[3px] hover:underline"
                >
                  {stat.link.label}
                </Link>
              )}
            </span>
            {stat.foot && (
              <span className="mt-2 block border-t border-dashed border-line pt-2 text-note text-ink-3">
                {stat.foot}
              </span>
            )}
          </Surface>
        ))}
      </div>

      <div className="mt-3.5 grid gap-2.5 min-[900px]:grid-cols-2">
        <Surface>
          <SectionHeading mark={MarkPill} level={3}>
            適用中の閾値
          </SectionHeading>
          <p className="-mt-2 mb-3 text-note text-ink-2">
            いずれも初期値のまま。実測が溜まるまでは暫定として扱う
          </p>
          <div className="space-y-2">
            {result.thresholds.map((threshold) => (
              <div
                key={threshold.label}
                className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-dashed border-line pb-2 last:border-b-0 last:pb-0"
              >
                <span className="text-ui font-bold">{threshold.label}</span>
                <span className="font-code text-ui tabular-nums text-brand">
                  {threshold.value}
                </span>
                <Badge variant="mute">暫定</Badge>
                <span className="w-full font-code text-note text-ink-3">
                  {threshold.basis}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-dashed border-line pt-3">
            <p className="min-w-0 flex-1 text-note text-ink-3">
              {result.thresholdNote}
            </p>
            <Button variant="ghost" size="sm" disabled>
              閾値を変更
            </Button>
          </div>
        </Surface>

        <Surface>
          <SectionHeading mark={MarkDoubleCircle} level={3}>
            状態の見分け
          </SectionHeading>
          <p className="-mt-2 mb-3 text-note text-ink-2">
            状態は独立して数える。潰すとどれかが良好に化ける
          </p>
          <dl className="space-y-2">
            {result.legend.map((entry) => (
              <div
                key={entry.label}
                className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1"
              >
                <dt className="w-[140px] shrink-0">
                  <QualityChip level={entry.level}>{entry.label}</QualityChip>
                </dt>
                <dd className="min-w-0 flex-1 text-note text-ink-2">
                  {entry.body}
                </dd>
              </div>
            ))}
          </dl>
        </Surface>
      </div>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>チャンネル別ドロップ率</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          直近 24 時間の録画の実測。バーは 0.1%(視聴不可の恐れ)を上限に表示し、
          破線は 0.02%(警告水準)。いずれも暫定
        </p>
        <Surface className="space-y-3">
          {result.channels.map((channel) => (
            <div key={channel.no}>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="text-ui font-bold">{channel.name}</span>
                <span className="font-code text-note text-ink-3">
                  {channel.no}
                </span>
                <span className="ml-auto flex items-center gap-2.5">
                  {channel.dropRate && (
                    <b className="font-code text-ui tabular-nums">
                      {channel.dropRate}
                    </b>
                  )}
                  <QualityChip level={channel.level}>
                    {QUALITY_LEVEL_LABEL[channel.level]}
                  </QualityChip>
                </span>
              </div>
              <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                {channel.barPct !== undefined && (
                  <div
                    className={cn(
                      'h-full rounded-full',
                      BAR_TONE[channel.level],
                    )}
                    style={{ width: `${channel.barPct}%` }}
                  />
                )}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-[20%] w-px bg-ink-3/45"
                />
              </div>
              <p className="mt-1 font-code text-note tabular-nums text-ink-3">
                {channel.note}
              </p>
            </div>
          ))}
        </Surface>
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkSlashes}>BS / CS のドロップ率</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          同じ期間・同じ閾値で判定する
        </p>
        {result.satelliteMeasured ? null : (
          <EmptyState spot="antenna" title="対象なし">
            期間内に BS / CS
            の録画がありません。ドロップ率を計算する母数がまだできていません。
          </EmptyState>
        )}
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkSplit}>チューナー別ヘルス</SectionHeading>
        <p className="-mt-1.5 mb-3 text-note text-ink-2">
          取得できるのは lock 状態 / CNR / post-Viterbi ビット誤り率の
          3つ。値の隣は取得時刻で、同一値が続くことは安定を意味しない
        </p>
        <Table className="min-w-[900px]" containerClassName="pb-1">
          <TableHeader>
            <TableRow>
              {HEALTH_COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.tuners.map((tuner) => (
              <TableRow key={tuner.id}>
                <TableCell className="align-top">
                  <b className="block text-[13px] font-bold">{tuner.device}</b>
                  <span className="text-note text-ink-3">{tuner.hardware}</span>
                </TableCell>
                <TableCell className="align-top whitespace-normal">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <QualityChip level={tuner.state.level}>
                      {tuner.state.label}
                    </QualityChip>
                    {tuner.state.recap && (
                      <Badge variant="mute">{tuner.state.recap}</Badge>
                    )}
                  </span>
                  <span className="mt-1 block text-note text-ink-3">
                    {tuner.state.sub}
                  </span>
                </TableCell>
                <QualityHealthCell cell={tuner.drop} />
                <QualityHealthCell cell={tuner.lock} />
                <QualityHealthCell cell={tuner.cnr} />
                <QualityHealthCell cell={tuner.ber} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <p className="min-w-0 flex-1 text-note text-ink-3">
            lock 状態と CNR
            は別の取得時刻を持つ。1つのスナップショットとして扱わない
          </p>
          <Link
            href="/settings/tuners"
            className="text-note font-bold text-brand underline-offset-[3px] hover:underline"
          >
            チューナー画面で対処
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-2.5 min-[900px]:grid-cols-2">
        <Surface>
          <SectionHeading mark={MarkDots} level={3}>
            問題のある録画
          </SectionHeading>
          <p className="-mt-2 mb-3 text-note text-ink-2">
            直近 24 時間 · 警告水準以上のドロップが出た録画
          </p>
          <div className="space-y-2">
            {result.problemRecordings.map((recording) => (
              <div
                key={recording.id}
                className="border-b border-dashed border-line pb-2 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5">
                  <b className="min-w-0 flex-1 text-ui font-bold">
                    {recording.title}
                  </b>
                  <ChevronRightIcon className="size-4 shrink-0 text-ink-3" />
                </div>
                <span className="block text-note text-ink-3">
                  {recording.where}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="font-code text-note tabular-nums text-ink-2">
                    {recording.drops}
                  </span>
                  <b className="font-code text-ui tabular-nums">
                    {recording.pct}
                  </b>
                  <QualityChip level={recording.level}>
                    {QUALITY_LEVEL_LABEL[recording.level]}
                  </QualityChip>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-dashed border-line pt-3">
            <p className="min-w-0 flex-1 text-note text-ink-3">
              未計測 3 本はここに含めない。別に数える
            </p>
            <Link
              href="/library"
              className="text-note font-bold text-brand underline-offset-[3px] hover:underline"
            >
              ライブラリで絞り込む
            </Link>
          </div>
        </Surface>

        <Surface>
          <SectionHeading mark={MarkDoubleCircle} level={3}>
            異常一覧
          </SectionHeading>
          <div className="-mt-2 mb-3 flex flex-wrap items-center gap-2.5">
            <p className="min-w-0 flex-1 text-note text-ink-2">
              再掲は自ドメイン所有の件数と合算しない
            </p>
            <QualityChip level="bad">所有 {result.ownedCount} 件</QualityChip>
            <Badge variant="mute">再掲 {result.recapCount} 件</Badge>
          </div>
          <div className="space-y-2">
            {result.anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={cn(
                  'flex flex-wrap items-start gap-x-2.5 gap-y-1.5 border-b border-dashed border-line pb-2 last:border-b-0 last:pb-0',
                  anomaly.acknowledged && 'opacity-60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <b className="text-ui font-bold">{anomaly.title}</b>
                    {anomaly.recap ? (
                      <Badge variant="mute">{anomaly.recap}</Badge>
                    ) : (
                      <QualityChip level={anomaly.level}>
                        {anomaly.levelLabel}
                      </QualityChip>
                    )}
                    {anomaly.acknowledged && (
                      <Badge variant="secondary">確認済み</Badge>
                    )}
                  </span>
                  <p className="mt-0.5 text-note text-ink-2">{anomaly.body}</p>
                  <span className="text-note text-ink-3">{anomaly.meta}</span>
                </div>
                <Button variant="ghost" size="sm" disabled>
                  {anomaly.acknowledged
                    ? '確認済みを取り消す'
                    : '確認済みにする'}
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-dashed border-line pt-3 text-note text-ink-3">
            確認済みは削除されない。再発すれば新しい発生として再度出る
          </p>
        </Surface>
      </div>
    </>
  )
}
