import type { Route } from 'next'

import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { CHANNEL_SCAN } from '@/repository/tuners.fixtures'

type TunerLedgerResponder = components['schemas']['TunerLedgerResponder']
type TunerObservationResponder =
  components['schemas']['TunerObservationResponder']
type TunerEntryResponder = components['schemas']['TunerEntryResponder']
type DriverStatusEnvelope =
  components['schemas']['BaseResponderOfDriverStatusResponder']
type SessionPurpose = components['schemas']['SessionPurpose']
type TunerKind = components['schemas']['TunerKind']

export interface TunerSession {
  label: string
  tone: 'recording' | 'epg'
  /** The service name. The channel or TS part goes in `code`, set in code face. */
  service?: string
  code?: string
}

export interface TunerRow {
  id: string
  device: string
  /**
   * Model and frontend, e.g. "PT3 / frontend0". The ledger carries no hardware
   * description, so a row read from the API leaves it unset.
   */
  hardware?: string
  /** Unset while the driver holds no observation to say which it is. */
  kind?: '地上波' | '衛星'
  enabled: boolean
  session?: TunerSession
  /** Shown in the session column when nothing holds the tuner. */
  idleLabel?: string
  /**
   * A disable was accepted while a session still holds the tuner: the switch
   * shows off, and the row says the stop happens once the session releases it.
   */
  draining?: boolean
  state: 'ok' | 'warn' | 'faulted'
  stateLabel: string
  /** The line under the state chip saying why, e.g. what disagrees. */
  stateSub?: string
  /** Absent renders as "—". */
  lastService?: { at: string; ago?: string }
  /** Absent renders as "—". */
  lnb?: string
}

export interface DetectionDiffRow {
  kind: 'add' | 'del'
  tag: string
  device: string
  note: string
}

/** A navigation the notice offers. */
export interface NoticeLinkAction {
  label: string
  /** Absent while the action has no page of its own to send you to. */
  href?: Route
}

/**
 * A state-changing operation the notice offers. At most one per notice. While
 * unavailable it is still offered, disabled, and the notice body carries the
 * reason and when it becomes available.
 */
export interface NoticeButtonAction {
  label: string
  control: 'button'
  disabled?: boolean
}

export type NoticeAction = NoticeLinkAction | NoticeButtonAction

/** Two at most, in the order they are offered. */
export type NoticeActions =
  readonly [NoticeAction] | readonly [NoticeAction, NoticeAction]

export interface TunerNotice {
  tone: 'danger' | 'warn'
  body: string
  actions?: NoticeActions
}

/** How the API says the driver link stands. `unknown` = it would not say. */
export type DriverLink = 'connected' | 'draining' | 'disconnected' | 'unknown'

interface DriverState {
  connection: DriverLink
  /** Unset while the driver is not connected and reports no instance. */
  instanceId?: string
}

export interface TunerResult extends DriverState {
  notices: TunerNotice[]
  thresholdHours: number
  rows: TunerRow[]
  /** What "デバイスを検出" found against the current list, pending confirmation. */
  detectionDiff: DetectionDiffRow[]
}

export type TunerScreenResult =
  | { state: 'ok'; result: TunerResult }
  | { state: 'unauthenticated' }
  /** The API answered but the driver would not give up the ledger. */
  | { state: 'unavailable'; message: string }

/** The outcome of a write, so the row can say what happened. */
export type TunerToggleResult =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'unavailable'; message: string }

const KIND_LABEL: Partial<Record<TunerKind, '地上波' | '衛星'>> = {
  terrestrial: '地上波',
  satellite: '衛星',
}

const SESSION_LABEL: Record<SessionPurpose, string> = {
  unspecified: '用途不明',
  recording: '録画',
  survey: 'EPG 収集',
  live: 'ライブ',
  scan: 'スキャン',
}

const THRESHOLD_HOURS = 24

export async function getTuners(): Promise<TunerScreenResult> {
  const client = carinaClient()

  const [ledger, driver] = await Promise.all([
    client.GET('/api/tuners'),
    client.GET('/api/driver/status'),
  ])

  if (ledger.response.status === 401 || driver.response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const body = ledger.data ?? ledger.error

  if (body === undefined) {
    throw new Error(`GET /api/tuners answered ${ledger.response.status}`)
  }

  if (body.data === null || !body.status) {
    return { state: 'unavailable', message: body.message }
  }

  return {
    state: 'ok',
    result: toResult(body.data, toDriver(driver.data)),
  }
}

export async function setTunerDisabled(
  deviceId: string,
  disabled: boolean,
): Promise<TunerToggleResult> {
  const { data, error, response } = await carinaClient().PATCH(
    '/api/tuners/{deviceId}',
    { params: { path: { deviceId } }, body: { disabled } },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const body = data ?? error

  if (body === undefined) {
    return {
      state: 'unavailable',
      message: `API は ${response.status} を返しました。`,
    }
  }

  return body.status
    ? { state: 'ok' }
    : { state: 'unavailable', message: body.message }
}

function toDriver(envelope: DriverStatusEnvelope | undefined): DriverState {
  const status = envelope?.status === true ? envelope.data : null

  if (status === null) {
    return { connection: 'unknown' }
  }

  const instanceId = status.hello?.instanceId ?? undefined

  switch (status.connection) {
    case 'notConnected':
      return { connection: 'disconnected' }
    case 'draining':
      return { connection: 'draining', instanceId }
    case 'connected':
      return status.hello?.draining
        ? { connection: 'draining', instanceId }
        : { connection: 'connected', instanceId }
  }
}

function toResult(
  ledger: TunerLedgerResponder,
  driver: DriverState,
): TunerResult {
  const observed = new Map(
    (ledger.observed ?? []).map((entry) => [entry.deviceId, entry]),
  )

  const rows = ledger.desired.map((entry) =>
    toRow(entry, observed.get(entry.deviceId)),
  )

  return {
    ...driver,
    notices: toNotices(ledger),
    thresholdHours: THRESHOLD_HOURS,
    rows,
    detectionDiff: [],
  }
}

function toNotices(ledger: TunerLedgerResponder): TunerNotice[] {
  const notices: TunerNotice[] = []

  if (ledger.observationFailure) {
    notices.push({ tone: 'danger', body: ledger.observationFailure })
  }

  if (ledger.drifted) {
    notices.push(toDriftNotice(ledger.observed ?? []))
  }

  return notices
}

function toDriftNotice(observed: TunerObservationResponder[]): TunerNotice {
  const recording = observed.filter(
    (entry) => entry.sessionId !== null && entry.sessionPurpose === 'recording',
  ).length

  const body = recording
    ? `保存済み・未反映の変更があります。反映には driver の再起動が必要です。録画が ${recording} 件進行中のため、まだ再起動できません。`
    : '保存済み・未反映の変更があります。反映には driver の再起動が必要です。進行中のセッションはありませんが、この画面からは再起動を要求できません。'

  return {
    tone: 'warn',
    body,
    actions: [{ label: 'driver を再起動', control: 'button', disabled: true }],
  }
}

function toRow(
  entry: TunerEntryResponder,
  observation: TunerObservationResponder | undefined,
): TunerRow {
  const kind = observation && KIND_LABEL[observation.kind]

  // The toggle asks the driver, which answers in the observation. The saved
  // document is only what a restart would load, so the switch follows the
  // running tuner and falls back to the document while nothing is observed.
  const enabled =
    observation === undefined
      ? !entry.disabled
      : observation.state !== 'disabled'

  return {
    id: entry.deviceId,
    device: entry.deviceId,
    kind,
    enabled,
    draining:
      observation?.state === 'draining' || observation?.disablePending === true,
    session: toSession(observation),
    idleLabel: toIdleLabel(observation),
    lnb: kind === '衛星' ? toLnb(observation) : undefined,
    ...toState(observation),
  }
}

function toSession(
  observation: TunerObservationResponder | undefined,
): TunerSession | undefined {
  if (!observation || observation.sessionId === null) {
    return undefined
  }

  return {
    label: SESSION_LABEL[observation.sessionPurpose],
    tone: observation.sessionPurpose === 'recording' ? 'recording' : 'epg',
  }
}

function toIdleLabel(
  observation: TunerObservationResponder | undefined,
): string | undefined {
  if (observation === undefined) {
    return undefined
  }

  if (observation.state === 'faulted') {
    return '割当停止中'
  }

  return observation.state === 'idle' ? 'アイドル' : undefined
}

function toLnb(
  observation: TunerObservationResponder | undefined,
): string | undefined {
  if (observation === undefined) {
    return undefined
  }

  return observation.lnbPowered ? 'オン' : 'オフ(既定)'
}

function toState(
  observation: TunerObservationResponder | undefined,
): Pick<TunerRow, 'state' | 'stateLabel' | 'stateSub'> {
  if (observation === undefined) {
    return { state: 'warn', stateLabel: '未読込' }
  }

  // `detail` and `healthDetail` are the driver's own English operator prose.
  // The line under the chip is designed Japanese, so it is left unfilled
  // rather than made to carry text in the wrong language.
  if (observation.state === 'faulted' || observation.health === 'faulted') {
    return { state: 'faulted', stateLabel: '異常' }
  }

  if (observation.health === 'degraded') {
    return { state: 'warn', stateLabel: '警告' }
  }

  return { state: 'ok', stateLabel: '正常' }
}

export interface ServiceRow {
  id: string
  name: string
  sid: string
  kind: 'TV' | 'ワンセグ' | 'データ'
  currentCh: string
  candidates: number
  needsCheck: number
  enabled: boolean
  lastSeen: string
}

export interface ChannelsResult {
  warning?: { body: string; actions?: NoticeActions }
  lastScan: string
  groups: {
    kind: string
    stat: string
    services: ServiceRow[]
  }[]
}

export async function getChannelScan(): Promise<ChannelsResult> {
  return CHANNEL_SCAN
}
