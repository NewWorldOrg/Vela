import type { Route } from 'next'
import Link from 'next/link'

import type {
  DetectionScreenResult,
  DriverLink,
  DriverRestartResult,
  RestartWindow,
  TunerResult,
  TunerRow,
  TunerScreenResult,
  TunerToggleResult,
  TunerWriteResult,
} from '@/repository/tuners'
import { signedOut } from '@/lib/signed-out'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/inline-alert'
import { Banner } from '@/components/vela/banner'
import { Crumb, CrumbCurrent } from '@/components/vela/crumb'
import { EmptyState } from '@/components/vela/empty-state'
import { PageHeading } from '@/components/vela/page-heading'
import {
  SETTINGS_GROUP_TITLE,
  SettingsGroup,
  SettingsRow,
} from '@/components/vela/settings-rows'
import { SearchIcon } from '@/components/vela/icons'
import { TunerEnableSwitch } from '@/components/tuners/tuner-enable-switch'
import { DriverRestartBanner } from '@/components/tuners/driver-restart-banner'
import { DetectionSave } from '@/components/tuners/detection-save'
import { ThresholdControl } from '@/components/tuners/threshold-control'
import { LnbPowerSwitch } from '@/components/tuners/lnb-power-switch'
import {
  CardReaderLine,
  DriverLine,
  HardwareLine,
  tunerSubOf,
  tunerTitleOf,
  tunerWhyOf,
} from '@/components/tuners/hardware-rows'

const DETECT_HREF = '/settings/tuners?detect=1' as Route
const SCAN_HISTORY_HREF = '/settings/channels#scan-history' as Route
const TUNERS_HREF = '/settings/tuners' as Route

const DIFF_VARIANT = {
  add: 'ok',
  del: 'err',
  kind: 'warn',
} as const

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
    <div className="overflow-hidden rounded-lg bg-surface">
      <div className="px-4 pt-4">
        <h3 className="text-[calc(14.5rem/16)] font-semibold text-ink">
          検出結果の差分
        </h3>
        {lede && <p className="mt-px text-sub text-ink-2">{lede}</p>}
      </div>
      {children}
      <div className="flex flex-wrap items-start justify-end gap-2 px-4 pt-3.5 pb-4">
        {footer}
      </div>
    </div>
  )
}

function CancelDetection() {
  return (
    <Button variant="tone" asChild>
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
        <div className="px-4 py-3">
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
        <p className="px-4 py-3 text-ui text-ink-2">
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
      <div className="px-4 py-2">
        {rows.map((diff) => (
          <div
            key={`${diff.kind}-${diff.device}`}
            className="flex items-center gap-3 border-b border-hair py-2.5 last:border-b-0"
          >
            <Badge variant={DIFF_VARIANT[diff.kind]} className="font-bold">
              {diff.tag}
            </Badge>
            <span className="min-w-0">
              <span className="block font-code text-sub">{diff.device}</span>
              {diff.name && (
                <span className="block truncate text-sub text-ink-2">
                  {[diff.name, diff.place].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            <small className="ml-auto pl-2.5 text-note whitespace-nowrap text-ink-2">
              {diff.note}
            </small>
          </div>
        ))}
      </div>
      <p className="px-4 text-note leading-[1.7] text-ink-2">
        {notes.filter(Boolean).join('')}
      </p>
    </DetectionCard>
  )
}

const THIS_MACHINE = 'この機械'

interface MachineGroup {
  key: string
  title: string
  local: boolean
  rows: TunerRow[]
}

function groupsOf(tuners: TunerResult): MachineGroup[] {
  const local: MachineGroup = {
    key: 'local',
    title: tuners.facts.machine ?? THIS_MACHINE,
    local: true,
    rows: tuners.rows.filter((row) => row.machine === undefined),
  }
  const others = new Map<string, TunerRow[]>()

  for (const row of tuners.rows) {
    if (row.machine !== undefined) {
      others.set(row.machine, [...(others.get(row.machine) ?? []), row])
    }
  }

  return [
    ...(local.rows.length > 0 || tuners.cardReaders ? [local] : []),
    ...[...others].map(([machine, rows]) => ({
      key: `machine-${machine}`,
      title: machine,
      local: false,
      rows,
    })),
  ]
}

function TunerLine({
  row,
  onToggle,
  onSaveLnb,
}: {
  row: TunerRow
  onToggle: (deviceId: string, enabled: boolean) => Promise<TunerToggleResult>
  onSaveLnb: (deviceId: string, on: boolean) => Promise<TunerWriteResult>
}) {
  const { title, code } = tunerTitleOf(row)

  return (
    <HardwareLine
      id={row.id}
      title={title}
      code={code}
      sub={tunerSubOf(row)}
      status={row.status}
      why={tunerWhyOf(row)}
      controls={
        <>
          {row.lnb && (
            <span className="flex items-center gap-2">
              <span className="text-cap text-ink-2">LNB</span>
              <LnbPowerSwitch
                deviceId={row.device}
                lnb={row.lnb}
                onSave={onSaveLnb}
              />
            </span>
          )}
          <span className="flex flex-col items-end">
            <TunerEnableSwitch
              deviceId={row.device}
              checked={row.enabled && !row.draining}
              onToggle={onToggle}
            />
            {row.draining && (
              <span className="mt-1 block text-cap leading-[1.5] whitespace-nowrap text-warn-text">
                無効化を受け付け済み
              </span>
            )}
          </span>
        </>
      }
    />
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
  onSaveLnb,
}: {
  result: TunerScreenResult
  detection?: DetectionScreenResult
  restartWindow?: RestartWindow
  onToggle: (deviceId: string, enabled: boolean) => Promise<TunerToggleResult>
  onRestart: () => Promise<DriverRestartResult>
  onDismiss: () => Promise<void>
  onSaveDetection: (devices: string[]) => Promise<TunerWriteResult>
  onSaveThreshold: (hours: number) => Promise<TunerWriteResult>
  onSaveLnb: (deviceId: string, on: boolean) => Promise<TunerWriteResult>
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
          <EmptyState titleLevel={2} title="サインインしないと見られません" />
        ) : restarting ? (
          <EmptyState
            titleLevel={2}
            title="driver の入れ替わりを待っています"
          />
        ) : (
          <EmptyState titleLevel={2} title="状態を取得できませんでした">
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
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="tone" size="sm" asChild>
              <Link href={SCAN_HISTORY_HREF}>スキャン履歴へ</Link>
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

      <SettingsGroup className="mt-[calc(18rem/16)]">
        <DriverLine facts={tuners.facts} connection={tuners.connection} />
      </SettingsGroup>

      <SettingsGroup className="mt-3">
        <SettingsRow name="健全性の閾値">
          <span className="text-ink">{tuners.thresholdHours} 時間</span>
          <ThresholdControl
            hours={tuners.thresholdHours}
            onSave={onSaveThreshold}
          />
        </SettingsRow>
      </SettingsGroup>

      {groupsOf(tuners).map((group) => (
        <section key={group.key} aria-label={group.title}>
          <h2 className={SETTINGS_GROUP_TITLE}>
            {group.title}
            <span className="ml-2 font-normal tabular-nums">
              {group.rows.length} 台
            </span>
          </h2>
          <SettingsGroup>
            {group.rows.map((row) => (
              <TunerLine
                key={row.id}
                row={row}
                onToggle={onToggle}
                onSaveLnb={onSaveLnb}
              />
            ))}
          </SettingsGroup>
          {group.local && tuners.cardReaders && (
            <section aria-label="カードリーダー">
              <h2 className={SETTINGS_GROUP_TITLE}>カードリーダー</h2>
              <SettingsGroup>
                {tuners.cardReaders.map((reader) => (
                  <CardReaderLine key={reader.id} row={reader} />
                ))}
              </SettingsGroup>
            </section>
          )}
        </section>
      ))}

      {(detection !== undefined || empty) && (
        <section className="mt-9">
          <h2 className={SETTINGS_GROUP_TITLE}>デバイス検出の差分</h2>
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
                title="チューナーがありません"
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
