import type { ComponentType, ReactNode } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { formatBytes, formatDateTime } from '@/lib/format'
import type {
  ApiHealthResult,
  CollectionCensus,
  DriverConnection,
  DriverStatus,
  DriverStatusResult,
  LiveCensus,
  Reading,
  StorageCensus,
  SystemStatus,
  TunerCensus,
} from '@/repository/system'
import { Badge } from '@/components/ui/badge'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { Banner } from '@/components/vela/banner'
import {
  ChevronRightIcon,
  LiveIcon,
  MarkDoubleCircle,
  MarkDots,
  MarkPanel,
  MarkSplit,
  ProgramGuideIcon,
  TunerIcon,
  WarningIcon,
  type IconProps,
} from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { StatusDot, type StatusTone } from '@/components/vela/status'
import { Surface } from '@/components/vela/surface'
import { pressable, tactileQuiet } from '@/components/vela/tactile'

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
 * What health names when it reports a part of itself as degraded, spelled the
 * way the screen that owns that part spells it. A key with no name here is
 * shown as it arrived — a name invented for it would be worse than the key.
 */
const DEGRADED_LABEL: Record<string, string> = {
  oidc: 'ID プロバイダ',
}

/**
 * A part that answers carries no colour of its own — the page reads as settled
 * because only what is wrong is coloured. A part that is degraded or silent
 * takes the band's own palette, so the answer to "is anything wrong" is a
 * colour across the grid rather than a row to be found and read.
 */
const PANEL_TONE: Record<StatusTone, string> = {
  ok: 'bg-surface',
  warn: 'bg-lemon-soft',
  err: 'bg-coral-soft',
  off: 'bg-surface-2',
}

const HEAD_TONE: Record<StatusTone, string> = {
  ok: 'text-ink',
  warn: 'text-lemon',
  err: 'text-coral',
  off: 'text-ink-2',
}

/**
 * One part of the system, said the same way whichever part it is: what it is,
 * how it is, and the one fact that changes what to do about it. A part whose
 * own screen can be reached carries a link on the whole panel; a part that has
 * no screen of its own is a plain surface. Nothing else about the two differs,
 * so a grid of them reads as one list.
 */
function Part({
  name,
  mark: Mark,
  tone,
  head,
  unit,
  href,
  children,
}: {
  name: string
  mark: ComponentType<IconProps>
  tone: StatusTone
  /** A state in words, or a figure. A figure is set in the code face. */
  head: ReactNode
  unit?: string
  href?: Route
  children?: ReactNode
}) {
  const body = (
    <>
      <span className="heading flex items-center gap-[7px] text-note text-ink-2">
        <Mark className="size-[15px] text-brand" />
        {name}
        {href && <ChevronRightIcon className="ml-auto size-3.5 text-ink-3" />}
      </span>
      <span
        className={cn(
          'heading mt-1.5 flex items-baseline gap-2.5 text-h2',
          HEAD_TONE[tone],
        )}
      >
        <StatusDot tone={tone} className="size-2.5 self-center" />
        {head}
        {unit && (
          <small className="font-sans text-note font-medium text-ink-3">
            {unit}
          </small>
        )}
      </span>
      {children && <div className="mt-2.5 text-ui text-ink-2">{children}</div>}
    </>
  )

  const skin = cn('block rounded-lg px-[18px] py-[15px]', PANEL_TONE[tone])

  return href ? (
    <Link
      href={href}
      data-slot="surface"
      className={cn(skin, 'hover:bg-surface-2', tactileQuiet, pressable)}
    >
      {body}
    </Link>
  ) : (
    <Surface className={cn('py-[15px]', PANEL_TONE[tone])}>{body}</Surface>
  )
}

/** A figure, in the face every other figure on the admin screens is set in. */
function Figure({ children }: { children: ReactNode }) {
  return <span className="font-code tabular-nums">{children}</span>
}

/**
 * `ラベル 値`, where the value is either the plain word for none or the names
 * of what is not there. Every part carries one of these, so the parts read as
 * a set rather than as lists of different lengths.
 */
function Fact({
  label,
  value,
  names,
}: {
  label: string
  value?: ReactNode
  names?: { key: string; label: string }[]
}) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
      {label}
      {names !== undefined ? (
        names.length > 0 ? (
          names.map((name) => (
            <Badge key={name.key} variant="err" className="font-bold">
              {name.label}
            </Badge>
          ))
        ) : (
          <b className="font-medium text-ink">なし</b>
        )
      ) : (
        <b className="font-medium text-ink">{value}</b>
      )}
    </span>
  )
}

/** The one shape a census that would not answer takes on the grid. */
function Unread({
  name,
  mark,
  reading,
}: {
  name: string
  mark: ComponentType<IconProps>
  reading: Exclude<Reading<unknown>, { state: 'ok' }>
}) {
  return (
    <Part
      name={name}
      mark={mark}
      tone="off"
      head={
        reading.state === 'unauthenticated'
          ? 'サインインしないと見られません'
          : '状態が分かりません'
      }
    />
  )
}

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

const NOTHING = <span className="text-ink-3">—</span>

export function SystemView({ status }: { status: SystemStatus }) {
  const { api, driver } = status
  const trouble = api.state === 'ok' ? null : API_TROUBLE[api.state]
  const reading = driver.state === 'ok' ? driver.status : null
  const degraded =
    api.state === 'ok'
      ? api.degraded.map((key) => ({ key, label: DEGRADED_LABEL[key] ?? key }))
      : []

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

      <div className="mt-3.5 grid gap-2.5 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3">
        <Part
          name="API"
          mark={MarkDoubleCircle}
          tone={
            api.state !== 'ok' ? 'err' : degraded.length > 0 ? 'warn' : 'ok'
          }
          head={api.state === 'ok' ? '応答しています' : '応答がありません'}
        >
          {api.state === 'ok' && (
            <Fact label="低下している機能" names={degraded} />
          )}
        </Part>

        <DriverPart result={driver} />
        <TunerPart reading={status.tuners} />
        <StoragePart reading={status.storage} />
        <CollectionPart reading={status.collection} />
        <LivePart reading={status.live} />
      </div>

      <section className="mt-[26px]">
        <SectionHeading mark={MarkDots}>詳細</SectionHeading>
        <Surface>
          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-2.5 text-ui">
            <DetailRow label="観測時刻">
              {reading ? (
                <span className="font-code tabular-nums text-ink-2">
                  {formatDateTime(reading.observedAt)}
                </span>
              ) : (
                NOTHING
              )}
            </DetailRow>
            <DetailRow label="ヘルスの応答">
              {api.state === 'ok' ? (
                <span className="font-code text-ink-2">{api.status}</span>
              ) : (
                NOTHING
              )}
            </DetailRow>
            <DetailRow label="インスタンス">
              {reading?.hello?.instanceId ? (
                <span className="font-code break-all text-ink-2">
                  {reading.hello.instanceId}
                </span>
              ) : (
                NOTHING
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
                    <Badge key={capability} variant="secondary">
                      {capability}
                    </Badge>
                  ))}
                </span>
              ) : (
                NOTHING
              )}
            </DetailRow>
          </dl>
        </Surface>
      </section>
    </>
  )
}

function DriverPart({ result }: { result: DriverStatusResult }) {
  if (result.state === 'ok') {
    return <DriverReading status={result.status} />
  }

  if (result.state === 'unauthenticated') {
    return (
      <Part
        name="driver"
        mark={MarkSplit}
        tone="off"
        head="サインインしないと見られません"
      />
    )
  }

  if (result.state === 'unavailable') {
    return (
      <Part
        name="driver"
        mark={MarkSplit}
        tone="err"
        head="状態を取得できませんでした"
      >
        {result.message}
      </Part>
    )
  }

  return (
    <Part name="driver" mark={MarkSplit} tone="off" head="状態が分かりません">
      API に接続できないため、driver が動いているかどうかも分かりません。
    </Part>
  )
}

function DriverReading({ status }: { status: DriverStatus }) {
  const connection = CONNECTION[status.connection]
  const missing = status.missingCapabilities.map((key) => ({
    key,
    label: key,
  }))
  const degraded = missing.length > 0 || status.driverUpdateRequired
  const tone = connection.tone === 'ok' && degraded ? 'warn' : connection.tone

  return (
    <Part name="driver" mark={MarkSplit} tone={tone} head={connection.label}>
      <Fact label="不足している機能" names={missing} />
      {status.driverUpdateRequired && (
        <span
          className={cn(
            'mt-2.5 flex items-start gap-[9px] text-sub font-bold',
            HEAD_TONE[tone],
          )}
        >
          <WarningIcon className="mt-[3px] size-[15px]" />
          driver の更新が必要です。
        </span>
      )}
    </Part>
  )
}

function TunerPart({ reading }: { reading: Reading<TunerCensus> }) {
  if (reading.state !== 'ok') {
    return <Unread name="チューナー" mark={TunerIcon} reading={reading} />
  }

  const census = reading.value
  const tone =
    census.faulted > 0
      ? 'err'
      : census.disabled > 0 || census.drifted
        ? 'warn'
        : 'ok'

  return (
    <Part
      name="チューナー"
      mark={TunerIcon}
      tone={tone}
      href="/settings/tuners"
      head={
        <Figure>
          {census.busy} / {census.total}
        </Figure>
      }
      unit="本 使用中"
    >
      <Fact label="異常" value={<Figure>{census.faulted} 本</Figure>} />
    </Part>
  )
}

function StoragePart({ reading }: { reading: Reading<StorageCensus> }) {
  if (reading.state !== 'ok') {
    return <Unread name="保存先" mark={MarkPanel} reading={reading} />
  }

  const census = reading.value
  const tone = census.unwritable > 0 ? 'err' : census.short ? 'warn' : 'ok'

  return (
    <Part
      name="保存先"
      mark={MarkPanel}
      tone={tone}
      href="/library/integrity"
      head={<Figure>{formatBytes(census.freeBytes)}</Figure>}
      unit={`空き / ${formatBytes(census.totalBytes)}`}
    >
      <Fact label="録画中" value={<Figure>{census.inFlight} 本</Figure>} />
    </Part>
  )
}

function CollectionPart({ reading }: { reading: Reading<CollectionCensus> }) {
  if (reading.state !== 'ok') {
    return <Unread name="番組表" mark={ProgramGuideIcon} reading={reading} />
  }

  const census = reading.value

  return (
    <Part
      name="番組表"
      mark={ProgramGuideIcon}
      tone={census.troubled > 0 ? 'warn' : 'ok'}
      href="/guide"
      head={
        <Figure>
          {census.streams - census.troubled} / {census.streams}
        </Figure>
      }
      unit="TS 収集済み"
    >
      <Fact label="収集不調" value={<Figure>{census.troubled} TS</Figure>} />
    </Part>
  )
}

function LivePart({ reading }: { reading: Reading<LiveCensus> }) {
  if (reading.state !== 'ok') {
    return <Unread name="ライブ" mark={LiveIcon} reading={reading} />
  }

  const census = reading.value

  return (
    <Part
      name="ライブ"
      mark={LiveIcon}
      tone="ok"
      href="/live"
      head={<Figure>{census.sessions}</Figure>}
      unit="本 配信中"
    >
      <Fact label="視聴者" value={<Figure>{census.viewers} 人</Figure>} />
    </Part>
  )
}
