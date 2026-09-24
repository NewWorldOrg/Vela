import type { Route } from 'next'
import Link from 'next/link'

import type {
  DetectionScreenResult,
  DriverLink,
  DriverRestartResult,
  RestartWindow,
  TunerRow,
  TunerScreenResult,
  TunerToggleResult,
  TunerWriteResult,
} from '@/repository/tuners'
import { SESSION_PILL_LABEL } from '@/repository/driver-capabilities'
import { EMPTY_VALUE } from '@/lib/empty-value'
import { signedOut } from '@/lib/signed-out'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import {
  Table,
  TableBody,
  TableColumns,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Banner } from '@/components/vela/banner'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import {
  ClockIcon,
  MarkAxis,
  SearchIcon,
  TunerSatelliteIcon,
  TunerTerrestrialIcon,
} from '@/components/vela/icons'
import {
  StateSay,
  StatusCell,
  stateColumnFor,
} from '@/components/recordings/status-cell'
import { InFull } from '@/components/vela/in-full'
import { TunerStateChip } from '@/components/tuners/tuner-state-chip'
import { TunerEnableSwitch } from '@/components/tuners/tuner-enable-switch'
import { DriverRestartBanner } from '@/components/tuners/driver-restart-banner'
import { DetectionSave } from '@/components/tuners/detection-save'
import { ThresholdControl } from '@/components/tuners/threshold-control'
import { WHEN_LABELS } from '@/lib/when-terms'

function whatTheSessionIs(session: {
  label: string
  saying?: string
  code?: string
  endsAt?: string
}): string {
  return [
    session.saying ?? session.label,
    session.code,
    session.endsAt && `終了予定 ${session.endsAt}`,
  ]
    .filter((one): one is string => Boolean(one))
    .join('\n')
}

const DETECT_HREF = '/settings/tuners?detect=1' as Route
const SCAN_HISTORY_HREF = '/settings/channels#scan-history' as Route
const TUNERS_HREF = '/settings/tuners' as Route

const DIFF_VARIANT = {
  add: 'ok',
  del: 'err',
  kind: 'warn',
} as const

const STATE_COLUMNS: string[] = ['現在のセッション', '状態']

const COLUMNS: { label: string; width: string }[] = [
  { label: 'デバイス', width: 'calc(180rem/16)' },
  { label: '種別', width: 'calc(96rem/16)' },
  { label: '有効', width: 'calc(124rem/16)' },
  { label: '現在のセッション', width: 'calc(240rem/16)' },
  { label: '状態', width: 'calc(104rem/16)' },
  { label: WHEN_LABELS.taken, width: 'calc(122rem/16)' },
  { label: 'LNB 給電', width: 'calc(124rem/16)' },
]

const DRIVER_LABEL: Record<DriverLink, string> = {
  connected: 'driver 接続中',
  draining: 'driver 終了処理中',
  disconnected: 'driver 未接続',
  unknown: 'driver の接続状態は取得できていません',
}

function DeviceIcon({ row }: { row: TunerRow }) {
  const Icon = row.kind === '衛星' ? TunerSatelliteIcon : TunerTerrestrialIcon

  return (
    <span className="flex size-[calc(30rem/16)] shrink-0 items-center justify-center rounded-md border border-line bg-surface-2">
      <Icon className="size-4 text-ink-2" />
    </span>
  )
}

function DetectionCard({
  lede,
  children,
  footer,
}: {
  lede?: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop-xl">
      <div className="px-[calc(19rem/16)] pt-[calc(17rem/16)]">
        <h3 className="heading text-[calc(14.5rem/16)]">検出結果の差分</h3>
        {lede && <p className="mt-px text-sub text-ink-2">{lede}</p>}
      </div>
      {children}
      <div className="flex flex-wrap items-start justify-end gap-[calc(9rem/16)] px-[calc(19rem/16)] pt-[calc(15rem/16)] pb-[calc(17rem/16)]">
        {footer}
      </div>
    </div>
  )
}

function CancelDetection() {
  return (
    <Button variant="ghost" asChild>
      <Link href={TUNERS_HREF}>キャンセル</Link>
    </Button>
  )
}

function DetectionPanel({
  detection,
  onSave,
}: {
  detection: DetectionScreenResult
  onSave: (devices: string[]) => Promise<TunerWriteResult>
}) {
  if (detection.state !== 'ok') {
    return (
      <DetectionCard footer={<CancelDetection />}>
        <div className="px-[calc(19rem/16)] py-[calc(13rem/16)]">
          <InlineAlert tone="warn">
            {detection.state === 'unauthenticated'
              ? signedOut('デバイスを検出')
              : `デバイスを検出できませんでした。${detection.message}`}
          </InlineAlert>
        </div>
      </DetectionCard>
    )
  }

  const { rows, detected } = detection.detection

  if (rows.length === 0) {
    return (
      <DetectionCard footer={<CancelDetection />}>
        <p className="px-[calc(19rem/16)] py-[calc(13rem/16)] text-ui text-ink-2">
          検出したデバイスは一覧と一致しています。変更はありません。
        </p>
      </DetectionCard>
    )
  }

  const { changes } = detection.detection
  const removes = rows.some((row) => row.kind === 'del')
  const mismatches = rows.some((row) => row.kind === 'kind')

  const notes = changes
    ? []
    : [!mismatches && '保存できる変更がないため、保存はありません。']

  return (
    <DetectionCard
      footer={
        <>
          <CancelDetection />
          {changes && <DetectionSave devices={detected} onSave={onSave} />}
        </>
      }
    >
      <div className="px-[calc(19rem/16)] py-[calc(13rem/16)]">
        {rows.map((diff) => (
          <div
            key={`${diff.kind}-${diff.device}`}
            className="flex items-center gap-[calc(11rem/16)] border-b border-dashed border-line py-2.5 last:border-b-0"
          >
            <Badge variant={DIFF_VARIANT[diff.kind]} className="font-bold">
              {diff.tag}
            </Badge>
            <span className="font-code text-sub">{diff.device}</span>
            <small className="ml-auto pl-2.5 text-note whitespace-nowrap text-ink-3">
              {diff.note}
            </small>
          </div>
        ))}
      </div>
      <p className="px-[calc(19rem/16)] text-note leading-[1.7] text-ink-3">
        {notes.filter(Boolean).join('')}
      </p>
    </DetectionCard>
  )
}

export function TunersView({
  result,
  detection,
  restartWindow,
  onToggle,
  onRestart,
  onDismiss,
  onSaveDetection,
  onSaveThreshold,
}: {
  result: TunerScreenResult
  detection?: DetectionScreenResult
  restartWindow?: RestartWindow
  onToggle: (deviceId: string, enabled: boolean) => Promise<TunerToggleResult>
  onRestart: () => Promise<DriverRestartResult>
  onDismiss: () => Promise<void>
  onSaveDetection: (devices: string[]) => Promise<TunerWriteResult>
  onSaveThreshold: (hours: number) => Promise<TunerWriteResult>
}) {
  if (result.state !== 'ok') {
    const restarting = result.state === 'unavailable' && restartWindow

    return (
      <>
        <Crumb>
          設定 / <CrumbCurrent>チューナー</CrumbCurrent>
        </Crumb>
        <PageHeading>チューナー</PageHeading>
        {restarting && (
          <div className="mt-3.5">
            <DriverRestartBanner
              restartWindow={restartWindow}
              onRestart={onRestart}
              onDismiss={onDismiss}
            />
          </div>
        )}
        {result.state === 'unauthenticated' ? (
          <EmptyState
            spot="tuner"
            titleLevel={2}
            title="サインインしないと見られません"
          />
        ) : restarting ? (
          <EmptyState
            spot="tuner"
            titleLevel={2}
            title="driver の入れ替わりを待っています"
          />
        ) : (
          <EmptyState
            spot="tuner"
            titleLevel={2}
            title="状態を取得できませんでした"
          >
            {result.message}
          </EmptyState>
        )}
      </>
    )
  }

  const { result: tuners } = result
  const empty = tuners.rows.length === 0

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>チューナー</CrumbCurrent>
      </Crumb>
      <PageHeading
        description={DRIVER_LABEL[tuners.connection]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={SCAN_HISTORY_HREF}>スキャン履歴</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={DETECT_HREF}>
                <SearchIcon />
                デバイスを検出
              </Link>
            </Button>
          </div>
        }
      >
        チューナー
      </PageHeading>

      <div className="mt-3.5 space-y-2">
        {tuners.notices
          .filter((notice) => notice.restart === undefined)
          .map((notice) => (
            <Banner
              key={notice.body}
              tone={notice.tone}
              actions={notice.actions}
            >
              {notice.body}
            </Banner>
          ))}
        <DriverRestartBanner
          notice={tuners.notices.find((notice) => notice.restart !== undefined)}
          restartWindow={restartWindow}
          onRestart={onRestart}
          onDismiss={onDismiss}
        />
      </div>

      <p className="mx-0.5 mt-[calc(22rem/16)] mb-2.5 flex flex-wrap items-center gap-[calc(9rem/16)] text-ui text-ink-2">
        <ClockIcon className="size-[calc(15rem/16)] text-brand" />
        健全性のしきい値{' '}
        <b className="font-code font-medium text-ink">
          {tuners.thresholdHours} 時間
        </b>
        <ThresholdControl
          hours={tuners.thresholdHours}
          onSave={onSaveThreshold}
        />
      </p>

      <Table
        className="table-fixed min-w-[calc(1000rem/16)]"
        containerClassName="pb-1"
      >
        <TableColumns widths={COLUMNS.map((column) => column.width)} />
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.label}>{column.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tuners.rows.map((row) => (
            <TableRow key={row.id} id={row.id}>
              <TableCell>
                <span className="flex items-center gap-2.5">
                  <DeviceIcon row={row} />
                  <b className="font-code text-[calc(13rem/16)] leading-[1.4] font-medium">
                    {row.device}
                  </b>
                </span>
              </TableCell>
              <TableCell>
                <span className="text-ui text-ink-2">
                  {row.kind ?? EMPTY_VALUE}
                </span>
              </TableCell>
              <TableCell>
                <TunerEnableSwitch
                  deviceId={row.device}
                  checked={row.enabled && !row.draining}
                  onToggle={onToggle}
                />
                {row.draining && (
                  <span className="mt-1 block text-cap leading-[1.5] text-lemon">
                    無効化を受付済み
                  </span>
                )}
              </TableCell>
              <TableCell>
                {row.session ? (
                  <StatusCell>
                    <InFull says={whatTheSessionIs(row.session)}>
                      <StateSay
                        tone={row.session.tone === 'recording' ? 'err' : 'info'}
                        bold
                      >
                        {row.session.label}
                      </StateSay>
                    </InFull>
                  </StatusCell>
                ) : (
                  <span className="text-ui text-ink-3">
                    {row.idleLabel ?? EMPTY_VALUE}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <StatusCell>
                  <TunerStateChip row={row} say also={row.stateSub} />
                </StatusCell>
              </TableCell>
              <TableCell>
                {row.lastService ? (
                  <span className="font-code text-sub whitespace-nowrap text-ink-2">
                    {row.lastService.at}
                  </span>
                ) : (
                  <span className="font-sans text-ink-3">{EMPTY_VALUE}</span>
                )}
              </TableCell>
              <TableCell className="font-code text-sub whitespace-nowrap text-ink-2">
                {row.lnb ?? <span className="font-sans">{EMPTY_VALUE}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {(detection !== undefined || empty) && (
        <section className="mt-9">
          <SectionHeading mark={MarkAxis}>
            デバイス検出 : 差分の確認
          </SectionHeading>
          <div
            className={cn(
              'grid items-start gap-[calc(18rem/16)]',
              detection !== undefined &&
                empty &&
                'min-[1020px]:grid-cols-[1.15fr_1fr]',
            )}
          >
            {detection !== undefined && (
              <DetectionPanel detection={detection} onSave={onSaveDetection} />
            )}

            {empty && (
              <EmptyState
                spot="tuner"
                title="チューナーが未設定です"
                className="border-none bg-tint-lavender"
                action={
                  <Button asChild>
                    <Link href={DETECT_HREF}>
                      <SearchIcon />
                      デバイスを検出
                    </Link>
                  </Button>
                }
              />
            )}
          </div>
        </section>
      )}
    </>
  )
}
