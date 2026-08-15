import type { Route } from 'next'

import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { CHANNEL_SCAN } from '@/repository/tuners.fixtures'

type TunerLedgerResponder = components['schemas']['TunerLedgerResponder']
type TunerObservationResponder =
  components['schemas']['TunerObservationResponder']
type TunerEntryResponder = components['schemas']['TunerEntryResponder']
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
  /** The detected kind disagrees: the chip reads "<kind> ?" in the error colour. */
  kindUnsure?: boolean
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

export interface TunerResult {
  /** Unset while the driver is not connected and reports no instance. */
  instanceId?: string
  notices: TunerNotice[]
  thresholdHours: number
  rows: TunerRow[]
  /** What "デバイスを検出" found against the current list, pending confirmation. */
  detectionDiff: DetectionDiffRow[]
}

/**
 * The app is only reachable through the proxy, so a 401 means the proxy was
 * bypassed rather than that the screen has a signed-out state of its own.
 */
export type TunerScreenResult =
  { state: 'ok'; result: TunerResult } | { state: 'unauthenticated' }

const KIND_LABEL: Partial<Record<TunerKind, '地上波' | '衛星'>> = {
  terrestrial: '地上波',
  satellite: '衛星',
}

const SESSION_LABEL: Partial<Record<SessionPurpose, string>> = {
  recording: '録画',
  survey: 'EPG 収集',
  live: 'ライブ',
  scan: 'スキャン',
}

/**
 * The threshold is the channel domain's to serve; until it does the screen
 * states the rule it is written against.
 */
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

  if (ledger.data === undefined) {
    throw new Error(`GET /api/tuners answered ${ledger.response.status}`)
  }

  if (ledger.data.data === null) {
    throw new Error(`GET /api/tuners refused: ${ledger.data.message}`)
  }

  const instanceId = driver.data?.data?.hello?.instanceId ?? undefined

  return { state: 'ok', result: toResult(ledger.data.data, instanceId) }
}

export async function setTunerDisabled(
  deviceId: string,
  disabled: boolean,
): Promise<void> {
  const { response } = await carinaClient().PATCH('/api/tuners/{deviceId}', {
    params: { path: { deviceId } },
    body: { disabled },
  })

  if (!response.ok) {
    throw new Error(`PATCH /api/tuners/${deviceId} answered ${response.status}`)
  }
}

function toResult(
  ledger: TunerLedgerResponder,
  instanceId: string | undefined,
): TunerResult {
  const observed = new Map(
    (ledger.observed ?? []).map((entry) => [entry.deviceId, entry]),
  )

  const rows = ledger.desired.map((entry) =>
    toRow(entry, observed.get(entry.deviceId)),
  )

  return {
    instanceId,
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

  // The restart itself has no endpoint yet, so the action carries no handler.
  // Whether it may be pressed is real: a recording in progress blocks it.
  const body = recording
    ? `保存済み・未反映の変更があります。反映には driver の再起動が必要です。録画が ${recording} 件進行中のため、まだ再起動できません。`
    : '保存済み・未反映の変更があります。反映には driver の再起動が必要です。進行中のセッションはありません。driver に終了を要求すると、停止後に自動で起動し直されます。'

  return {
    tone: 'warn',
    body,
    actions: [
      { label: '変更内容を確認' },
      {
        label: 'driver を再起動',
        control: 'button',
        disabled: recording > 0,
      },
    ],
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

  const label = SESSION_LABEL[observation.sessionPurpose]

  if (label === undefined) {
    return undefined
  }

  // The tuning the session holds is not on the ledger, so the channel the
  // design puts beside the chip has nothing to read from.
  return {
    label,
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
