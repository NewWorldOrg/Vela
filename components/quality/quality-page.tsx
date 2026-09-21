import Link from 'next/link'

import type { QualityLevel } from '@/lib/quality'
import { QUALITY_LEVEL_LABEL } from '@/lib/quality'
import { cn } from '@/lib/utils'
import type {
  QualityChannel,
  QualityResult,
  QualityStat,
  QualityThresholdKey,
  QualityWrite,
} from '@/repository/quality'
import { Badge } from '@/components/ui/badge'
import { STATE_COLUMN, StatusCell } from '@/components/recordings/status-cell'
import { Banner } from '@/components/vela/banner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ADMIN_LIST_HEIGHT_CAP,
  Crumb,
  CrumbCurrent,
} from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import {
  ChevronRightIcon,
  MarkDots,
  MarkPill,
  MarkSlashes,
  MarkSplit,
} from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { ChangeThresholdButton } from '@/components/quality/change-threshold-button'
import { AnomalyList } from '@/components/quality/anomaly-list'
import { LinkSegments } from '@/components/quality/link-segments'
import { QualityTrendPanel } from '@/components/quality/quality-trend'
import {
  QUALITY_LEVEL_PILL_WIDTH,
  QualityChip,
} from '@/components/quality/signal-quality-chip'
import { QualityHealthCell } from '@/components/quality/quality-health-cell'

const SUPPLY_GONE_QUIET = '計測の供給が途絶しています'

const WATCH_HAS_NOT_PASSED = '供給の見張りはまだ通っていません'

const TO_THE_TUNERS = 'チューナーへ'

const PERIOD = '期間'

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

const BAR_TRACK: Record<QualityLevel, string> = {
  good: 'bg-surface-3',
  warn: 'bg-surface-3',
  bad: 'bg-surface-3',
  unmeasured: 'border border-dashed border-line-strong',
  nodata: 'border border-line',
  unsupported: 'border border-line',
  unreachable: 'border border-line',
}

function notesOf(stat: QualityStat): string[] {
  return [stat.aside, stat.foot].filter((note) => note !== undefined)
}

function ChannelMeters({
  channels,
  warnMarkPct,
}: {
  channels: QualityChannel[]
  warnMarkPct?: number
}) {
  return (
    <Surface className="space-y-3">
      {channels.map((channel) => (
        <div key={channel.id} data-slot="meter" data-level={channel.level}>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-ui font-bold">{channel.name}</span>
            {channel.no && (
              <span className="font-code text-note text-ink-3">
                {channel.no}
              </span>
            )}
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
          <div
            className={cn(
              'relative mt-1.5 h-1.5 overflow-hidden rounded-full',
              BAR_TRACK[channel.level],
            )}
          >
            {channel.barPct !== undefined && (
              <div
                data-slot="meter-fill"
                className={cn('h-full rounded-full', BAR_TONE[channel.level])}
                style={{ width: `${channel.barPct}%` }}
              />
            )}
            {channel.barPct !== undefined && warnMarkPct !== undefined && (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 w-px bg-ink-3/45"
                style={{ left: `${warnMarkPct}%` }}
              />
            )}
          </div>
          <p className="mt-1 font-code text-note tabular-nums text-ink-3">
            {channel.note}
          </p>
        </div>
      ))}
    </Surface>
  )
}

export type QualityReviseThreshold = (
  key: QualityThresholdKey,
  amount: number,
) => Promise<QualityWrite>

export function QualityView({
  result,
  onReviseThreshold,
}: {
  result: QualityResult
  onReviseThreshold: QualityReviseThreshold
}) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>品質</CrumbCurrent>
      </Crumb>
      <PageHeading
        action={<LinkSegments label={PERIOD} items={result.windows} />}
      >
        品質
      </PageHeading>

      {!result.supplies.read && (
        <Banner className="mt-3.5">{WATCH_HAS_NOT_PASSED}</Banner>
      )}

      {result.supplies.quiet.length > 0 && (
        <Banner
          tone="danger"
          className="mt-3.5"
          actions={[{ label: TO_THE_TUNERS, href: '/settings/tuners' }]}
        >
          <b className="heading block text-ui">{SUPPLY_GONE_QUIET}</b>
          {result.supplies.quiet.map((supply) => (
            <span key={supply.key} className="block">
              {supply.supply} · {supply.note}
            </span>
          ))}
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
            <span className="mt-2.5 flex min-h-[19px] flex-wrap items-center gap-x-2 gap-y-1">
              {stat.value && stat.level && (
                <QualityChip level={stat.level}>{stat.levelLabel}</QualityChip>
              )}
              {notesOf(stat).map((note) => (
                <span key={note} className="text-note text-ink-3">
                  {note}
                </span>
              ))}
            </span>
          </Surface>
        ))}
      </div>

      <div className="mt-3.5 grid gap-2.5 min-[900px]:grid-cols-2">
        <Surface>
          <SectionHeading mark={MarkPill}>適用中の閾値</SectionHeading>
          <div className="space-y-2">
            {result.thresholds.map((threshold) => (
              <div
                key={threshold.key}
                className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-dashed border-line pb-2 last:border-b-0 last:pb-0"
              >
                <span className="text-ui font-bold">{threshold.label}</span>
                <span className="font-code text-ui tabular-nums text-brand">
                  {threshold.value}
                </span>
                {threshold.provisional && <Badge variant="mute">暫定</Badge>}
                <span className="w-full font-code text-note text-ink-3">
                  {threshold.basis}
                </span>
              </div>
            ))}
          </div>
          {result.thresholds.length > 0 && (
            <div className="mt-3 flex justify-end border-t border-dashed border-line pt-3">
              <ChangeThresholdButton
                thresholds={result.thresholds}
                onRevise={onReviseThreshold}
              />
            </div>
          )}
        </Surface>

        <QualityTrendPanel trend={result.trend} />
      </div>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>チャンネル別ドロップ率</SectionHeading>
        {result.channels.length > 0 ? (
          <ChannelMeters
            channels={result.channels}
            warnMarkPct={result.warnMarkPct}
          />
        ) : (
          <EmptyState spot="antenna" title="対象なし">
            期間内に地上波の録画がありません。
          </EmptyState>
        )}
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkSlashes}>BS / CS のドロップ率</SectionHeading>
        {result.satellites.length > 0 ? (
          <ChannelMeters
            channels={result.satellites}
            warnMarkPct={result.warnMarkPct}
          />
        ) : (
          <EmptyState spot="dish" title="対象なし">
            期間内に BS / CS の録画がありません。
          </EmptyState>
        )}
      </section>

      <section className="mt-5">
        <SectionHeading mark={MarkSplit}>チューナー別ヘルス</SectionHeading>
        {result.tuners.length > 0 ? (
          <Table
            className="min-w-[900px]"
            containerClassName={cn(
              ADMIN_LIST_HEIGHT_CAP,
              'overflow-y-auto pb-1',
            )}
          >
            <TableHeader className="[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10">
              <TableRow>
                {HEALTH_COLUMNS.map((column) => (
                  <TableHead
                    key={column}
                    className={column === '状態' ? STATE_COLUMN : undefined}
                  >
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.tuners.map((tuner) => (
                <TableRow key={tuner.id}>
                  <TableCell className="align-top">
                    <b className="block text-[13px] font-bold">
                      {tuner.device}
                    </b>
                    <span className="text-note text-ink-3">
                      {tuner.hardware}
                    </span>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <StatusCell>
                      <QualityChip
                        level={tuner.state.level}
                        width={QUALITY_LEVEL_PILL_WIDTH}
                      >
                        {tuner.state.label}
                      </QualityChip>
                    </StatusCell>
                  </TableCell>
                  <QualityHealthCell cell={tuner.drop} />
                  <QualityHealthCell cell={tuner.lock} />
                  <QualityHealthCell cell={tuner.cnr} />
                  <QualityHealthCell cell={tuner.ber} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState spot="tuner" title="対象なし">
            期間内に録画したチューナーがありません。
          </EmptyState>
        )}
        <div className="mt-2.5 flex justify-end">
          <Link
            href="/settings/tuners"
            className="tap-target text-note font-bold text-brand underline-offset-[3px] hover:underline"
          >
            チューナー画面で対処
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-2.5 min-[900px]:grid-cols-2">
        <Surface>
          <SectionHeading mark={MarkDots}>問題のある録画</SectionHeading>
          {result.problemRecordings.length > 0 ? (
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
                    {recording.pct && (
                      <b className="font-code text-ui tabular-nums">
                        {recording.pct}
                      </b>
                    )}
                    <QualityChip level={recording.level}>
                      {QUALITY_LEVEL_LABEL[recording.level]}
                    </QualityChip>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState spot={null} title="対象なし">
              期間内に警告水準を超えた録画がありません。
            </EmptyState>
          )}
          <div className="mt-3 flex justify-end border-t border-dashed border-line pt-3">
            <Link
              href="/library"
              className="tap-target text-note font-bold text-brand underline-offset-[3px] hover:underline"
            >
              ライブラリで絞り込む
            </Link>
          </div>
        </Surface>

        <AnomalyList anomalies={result.anomalies} />
      </div>
    </>
  )
}
