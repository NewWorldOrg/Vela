import type { ComponentType, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import type {
  ApiHealthResult,
  DriverConnection,
  DriverStatus,
  DriverStatusResult,
  SystemStatus,
} from '@/repository/system'
import { Badge } from '@/components/ui/badge'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { Banner } from '@/components/vela/banner'
import {
  MarkDoubleCircle,
  MarkSplit,
  WarningIcon,
  type IconProps,
} from '@/components/vela/icons'
import { PageHeading } from '@/components/vela/section-heading'
import { StatusDot, type StatusTone } from '@/components/vela/status'
import { Surface } from '@/components/vela/surface'
import { SystemDetails } from '@/components/system/system-details'

const API_TROUBLE: Record<Exclude<ApiHealthResult['state'], 'ok'>, string> = {
  unconfigured: 'API の接続先が設定されていません',
  unreachable: 'API に接続できません',
  failed: 'API が想定した応答を返しませんでした',
}

const CONNECTION: Record<
  DriverConnection,
  { label: string; tone: StatusTone }
> = {
  connected: { label: '接続中', tone: 'ok' },
  notConnected: { label: '未接続', tone: 'err' },
  draining: { label: '停止準備中', tone: 'warn' },
}

/**
 * A part that answers carries no colour of its own — the page reads as settled
 * because only what is wrong is coloured. A part that is degraded or silent
 * takes the band's own palette, so the answer to "is anything wrong" is a
 * colour across the top of the screen rather than a row to be found and read.
 */
const PANEL_TONE: Record<StatusTone, string> = {
  ok: 'bg-surface',
  warn: 'bg-lemon-soft',
  err: 'bg-coral-soft',
  off: 'bg-surface-2',
}

const STATE_TONE: Record<StatusTone, string> = {
  ok: 'text-ink',
  warn: 'text-lemon',
  err: 'text-coral',
  off: 'text-ink-2',
}

/**
 * One part of the system, said the same way whichever part it is and whichever
 * state it is in: what it is, then how it is, then the one fact that changes
 * what to do about it.
 */
function StatePanel({
  name,
  mark: Mark,
  tone,
  state,
  children,
}: {
  name: string
  mark: ComponentType<IconProps>
  tone: StatusTone
  state: string
  children?: ReactNode
}) {
  return (
    <Surface className={cn('py-[15px]', PANEL_TONE[tone])}>
      <span className="heading flex items-center gap-[7px] text-note text-ink-2">
        <Mark className="size-[15px] text-brand" />
        {name}
      </span>
      <span
        className={cn(
          'heading mt-1.5 flex items-center gap-2.5 text-h2',
          STATE_TONE[tone],
        )}
      >
        <StatusDot tone={tone} className="size-2.5" />
        {state}
      </span>
      {children && <div className="mt-2.5 text-ui text-ink-2">{children}</div>}
    </Surface>
  )
}

/** `ラベル 値` — the shape every raw reading takes inside the details. */
function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <>
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}

export function SystemView({ status }: { status: SystemStatus }) {
  const { api, driver } = status
  const trouble = api.state === 'ok' ? null : API_TROUBLE[api.state]
  const reading = driver.state === 'ok' ? driver.status : null

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>システム</CrumbCurrent>
      </Crumb>
      <PageHeading>システム</PageHeading>

      {trouble && (
        <Banner tone="danger" className="mt-3.5">
          <b>{trouble}</b>
          {api.state === 'failed' && (
            <span className="ml-1 font-code">HTTP {api.httpStatus}</span>
          )}
        </Banner>
      )}

      <div className="mt-3.5 grid gap-2.5 min-[760px]:grid-cols-2">
        <StatePanel
          name="API"
          mark={MarkDoubleCircle}
          tone={api.state === 'ok' ? 'ok' : 'err'}
          state={api.state === 'ok' ? '応答しています' : '応答がありません'}
        >
          {api.state === 'ok' && (
            <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
              ヘルスの応答
              <b className="font-code font-medium text-ink">{api.status}</b>
            </span>
          )}
        </StatePanel>
        <DriverPanel result={driver} />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {reading && (
          <span className="text-note text-ink-3">
            観測時刻{' '}
            <b className="font-code font-medium text-ink-2">
              {formatDateTime(reading.observedAt)}
            </b>
          </span>
        )}
        <SystemDetails>
          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-2.5 text-ui">
            <DetailRow label="インスタンス">
              {reading?.hello ? (
                <span className="font-code break-all text-ink-2">
                  {reading.hello.instanceId ?? '—'}
                </span>
              ) : (
                <span className="text-ink-3">—</span>
              )}
            </DetailRow>
            <DetailRow label="プロトコル版数">
              <span className="font-code text-ink-2">
                driver {reading?.hello?.protocolVersion ?? '—'} / アプリ{' '}
                {reading?.appProtocolVersion ?? '—'}
              </span>
            </DetailRow>
            <DetailRow label="driver の機能">
              {reading?.hello && reading.hello.capabilities.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {reading.hello.capabilities.map((capability) => (
                    <Badge key={capability}>{capability}</Badge>
                  ))}
                </span>
              ) : (
                <span className="text-ink-3">—</span>
              )}
            </DetailRow>
          </dl>
        </SystemDetails>
      </div>
    </>
  )
}

function DriverPanel({ result }: { result: DriverStatusResult }) {
  if (result.state === 'ok') {
    return <DriverReading status={result.status} />
  }

  if (result.state === 'unauthenticated') {
    return (
      <StatePanel
        name="driver"
        mark={MarkSplit}
        tone="off"
        state="サインインしないと見られません"
      />
    )
  }

  if (result.state === 'unavailable') {
    return (
      <StatePanel
        name="driver"
        mark={MarkSplit}
        tone="err"
        state="状態を取得できませんでした"
      >
        {result.message}
      </StatePanel>
    )
  }

  return (
    <StatePanel
      name="driver"
      mark={MarkSplit}
      tone="off"
      state="状態が分かりません"
    >
      API に接続できないため、driver が動いているかどうかも分かりません。
    </StatePanel>
  )
}

function DriverReading({ status }: { status: DriverStatus }) {
  const connection = CONNECTION[status.connection]
  const missing = status.missingCapabilities
  const degraded = missing.length > 0 || status.driverUpdateRequired
  const tone = connection.tone === 'ok' && degraded ? 'warn' : connection.tone

  return (
    <StatePanel
      name="driver"
      mark={MarkSplit}
      tone={tone}
      state={connection.label}
    >
      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
        不足している機能
        {missing.length > 0 ? (
          missing.map((capability) => (
            <Badge key={capability} variant="err" className="font-bold">
              {capability}
            </Badge>
          ))
        ) : (
          <b className="font-medium text-ink">なし</b>
        )}
      </span>
      {status.driverUpdateRequired && (
        <span
          className={cn(
            'mt-2.5 flex items-start gap-[9px] text-sub font-bold',
            STATE_TONE[tone],
          )}
        >
          <WarningIcon className="mt-[3px] size-[15px]" />
          driver の更新が必要です。
        </span>
      )}
    </StatePanel>
  )
}
