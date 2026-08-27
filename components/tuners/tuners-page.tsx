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
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
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
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import {
  ClockIcon,
  MarkAxis,
  SearchIcon,
  TunerSatelliteIcon,
  TunerTerrestrialIcon,
} from '@/components/vela/icons'
import { TunerStateChip } from '@/components/tuners/tuner-state-chip'
import { TunerEnableSwitch } from '@/components/tuners/tuner-enable-switch'
import { DriverRestartBanner } from '@/components/tuners/driver-restart-banner'
import { DetectionSave } from '@/components/tuners/detection-save'
import { ThresholdControl } from '@/components/tuners/threshold-control'

const DETECT_HREF = '/settings/tuners?detect=1' as Route
const SCAN_HISTORY_HREF = '/settings/channels#scan-history' as Route
const TUNERS_HREF = '/settings/tuners' as Route

const DIFF_VARIANT = {
  add: 'ok',
  del: 'err',
  kind: 'warn',
} as const

const COLUMNS = [
  'デバイス',
  '種別',
  '有効',
  '現在のセッション',
  '状態',
  '最終サービス取得',
  'LNB 給電',
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
    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-md border border-line bg-surface-2">
      <Icon className="size-4 text-ink-2" />
    </span>
  )
}

function DetectionCard({
  lede,
  children,
  footer,
}: {
  /** Only stated where a save is actually offered. */
  lede?: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-pop-xl">
      <div className="px-[19px] pt-[17px]">
        <h3 className="heading text-[14.5px]">検出結果の差分</h3>
        {lede && <p className="mt-px text-sub text-ink-2">{lede}</p>}
      </div>
      {children}
      <div className="flex flex-wrap items-start justify-end gap-[9px] px-[19px] pt-[15px] pb-[17px]">
        {footer}
      </div>
    </div>
  )
}

function CancelDetection() {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={TUNERS_HREF}>キャンセル</Link>
    </Button>
  )
}

/**
 * What the driver receives, against what the ledger keeps. The comparison is
 * only made when it is asked for, so the card is absent until then.
 */
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
        <div className="px-[19px] py-[13px]">
          <InlineAlert tone="warn">
            {detection.state === 'unauthenticated'
              ? 'サインインが切れているため、デバイスを検出できませんでした。サインインしてから開き直してください。'
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
        <p className="px-[19px] py-[13px] text-ui text-ink-2">
          検出したデバイスは一覧と一致しています。変更はありません。
        </p>
      </DetectionCard>
    )
  }

  const { changes } = detection.detection
  const removes = rows.some((row) => row.kind === 'del')
  const mismatches = rows.some((row) => row.kind === 'kind')

  // The ledger holds no kind, so a difference the save cannot act on — kind
  // mismatches, or devices that cannot be saved — offers no save. A mismatch
  // is between the live observation and a fresh probe; the restart takes the
  // observation again, and that is the remedy stated.
  const notes = changes
    ? [
        removes &&
          '「消失」のデバイスは一覧から削除され、有効・LNB 給電の設定も失われます。',
        mismatches && '「種別相違」は保存では変わりません。',
        '反映には driver の再起動が必要です(保存後にバナーで通知)。',
      ]
    : [
        mismatches &&
          '種別の食い違いは一覧の保存では直りません。driver の再起動で観測が取り直されます。',
        !mismatches && '保存できる変更がないため、保存はありません。',
      ]

  return (
    <DetectionCard
      lede={changes ? '保存すると一覧が更新されます' : undefined}
      footer={
        <>
          <CancelDetection />
          {changes && <DetectionSave devices={detected} onSave={onSave} />}
        </>
      }
    >
      <div className="px-[19px] py-[13px]">
        {rows.map((diff) => (
          <div
            key={`${diff.kind}-${diff.device}`}
            className="flex items-center gap-[11px] border-b border-dashed border-line py-2.5 last:border-b-0"
          >
            <Badge variant={DIFF_VARIANT[diff.kind]} className="font-bold">
              {diff.tag}
            </Badge>
            <span className="font-code text-[12px]">{diff.device}</span>
            <small className="ml-auto pl-2.5 text-note whitespace-nowrap text-ink-3">
              {diff.note}
            </small>
          </div>
        ))}
      </div>
      <p className="px-[19px] text-[11.5px] leading-[1.7] text-ink-3">
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
    // While an accepted restart is in its window the driver is away on
    // purpose, so an unreadable list is expected — the window banner keeps
    // re-reading and the screen must not call it a failure.
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
          >
            driver
            の状態はサインインしたユーザーだけに見せています。サインインしてから開き直してください。
          </EmptyState>
        ) : restarting ? (
          <EmptyState
            spot="tuner"
            titleLevel={2}
            title="driver の入れ替わりを待っています"
          >
            再起動中は一覧を読めません。driver が戻ると自動で表示に戻ります。
          </EmptyState>
        ) : (
          <EmptyState
            spot="tuner"
            titleLevel={2}
            title="状態を取得できませんでした"
          >
            API は driver の状態を答えられませんでした。{result.message}
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
        description={
          <>
            接続されたチューナーデバイスの一覧と稼働状態。
            {DRIVER_LABEL[tuners.connection]}
            {tuners.instanceId && (
              <>
                (<span className="font-code">instance {tuners.instanceId}</span>
                )
              </>
            )}
          </>
        }
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

      <p className="mx-0.5 mt-[22px] mb-2.5 flex flex-wrap items-center gap-[9px] text-ui text-ink-2">
        <ClockIcon className="size-[15px] text-brand" />
        健全性のしきい値: 種別単位でサービス取得が連続{' '}
        <b className="font-code font-medium text-ink">
          {tuners.thresholdHours} 時間
        </b>{' '}
        0 件になると警告
        <ThresholdControl
          hours={tuners.thresholdHours}
          onSave={onSaveThreshold}
        />
      </p>

      <Table className="min-w-[1000px]" containerClassName="pb-1">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tuners.rows.map((row) => (
            <TableRow key={row.id} id={row.id}>
              <TableCell>
                <span className="flex items-center gap-2.5">
                  <DeviceIcon row={row} />
                  <span>
                    <b className="block font-code text-[13px] leading-[1.4] font-medium">
                      {row.device}
                    </b>
                    {row.hardware && (
                      <span className="text-note text-ink-3">
                        {row.hardware}
                      </span>
                    )}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                {row.kind === undefined ? (
                  <span className="text-ink-3">—</span>
                ) : (
                  <Badge>{row.kind}</Badge>
                )}
              </TableCell>
              <TableCell>
                <TunerEnableSwitch
                  deviceId={row.device}
                  checked={row.enabled && !row.draining}
                  onToggle={onToggle}
                />
                {row.draining && (
                  <span className="mt-1 block text-[11px] leading-[1.5] text-lemon">
                    無効化を受付済み
                    <br />
                    解放後に停止します
                  </span>
                )}
              </TableCell>
              <TableCell>
                {row.session ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        row.session.tone === 'recording' ? 'recording' : 'info'
                      }
                      className="font-bold"
                    >
                      {row.session.label}
                    </Badge>
                    <span className="text-ui">
                      {row.session.code && (
                        <span className="font-code">{row.session.code}</span>
                      )}
                      {row.session.endsAt && (
                        <span className="block text-note text-ink-3">
                          終了予定{' '}
                          <span className="font-code tabular-nums">
                            {row.session.endsAt}
                          </span>
                        </span>
                      )}
                    </span>
                  </span>
                ) : (
                  <span className="text-ui text-ink-3">
                    {row.idleLabel ?? '—'}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <TunerStateChip row={row} />
                {row.stateSub && (
                  <span className="mt-[3px] block text-note leading-[1.5] text-ink-3">
                    {row.stateSub}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {row.lastService ? (
                  <span className="font-code text-[12px] whitespace-nowrap text-ink-2">
                    {row.lastService.at}
                    {row.lastService.ago && (
                      <span className="block text-[10.5px] text-ink-3">
                        {row.lastService.ago}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-ink-3">—</span>
                )}
              </TableCell>
              <TableCell className="font-code text-[12px] whitespace-nowrap text-ink-2">
                {row.lnb ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {(detection !== undefined || empty) && (
        <section className="mt-9">
          <SectionHeading mark={MarkAxis}>
            デバイス検出 — 差分の確認
          </SectionHeading>
          <p className="-mt-1.5 mb-3.5 text-note text-ink-2">
            「デバイスを検出」実行後、保存前に必ず差分を確認する。空になる保存はできない。
          </p>
          <div
            className={cn(
              'grid items-start gap-[18px]',
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
              >
                接続済みのデバイスを検出して一覧を作成します。設定ファイルを手で編集する必要はありません。
              </EmptyState>
            )}
          </div>
        </section>
      )}
    </>
  )
}
