import type { Route } from 'next'

import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'

type TunerLedgerResponder = components['schemas']['TunerLedgerResponder']
type TunerObservationResponder =
  components['schemas']['TunerObservationResponder']
type TunerEntryResponder = components['schemas']['TunerEntryResponder']
type DriverStatusEnvelope =
  components['schemas']['BaseResponderOfDriverStatusResponder']
type SessionPurpose = components['schemas']['SessionPurpose']
type TunerKind = components['schemas']['TunerKind']
type DeviceDetection = components['schemas']['DeviceDetection']
type DetectedTunersResponder = components['schemas']['DetectedTunersResponder']
type DetectedDeviceResponder = components['schemas']['DetectedDeviceResponder']

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
  /** `kind` is a device the driver receives on a band the ledger disagrees with. */
  kind: 'add' | 'del' | 'kind'
  tag: string
  device: string
  note: string
}

export interface DetectionResult {
  rows: DetectionDiffRow[]
  /** The devices the driver answers with: what a save would write. */
  detected: string[]
}

/** A detection asked for on its own, so every way it can fail is its own state. */
export type DetectionScreenResult =
  | { state: 'ok'; detection: DetectionResult }
  | { state: 'unauthenticated' }
  | { state: 'unavailable'; message: string }

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

/** The outcome of saving the ledger, so the card can say what happened. */
export type TunerWriteResult =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

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

/**
 * What the driver receives right now, against what the ledger keeps. The API
 * draws the comparison itself, so the three lists are read rather than worked
 * out here.
 */
export async function getDetectedTuners(): Promise<DetectionScreenResult> {
  const { data, error, response } = await carinaClient().GET(
    '/api/tuners/detected',
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

  if (body.data === null || !body.status) {
    return { state: 'unavailable', message: body.message }
  }

  return { state: 'ok', detection: toDetection(body.data) }
}

/**
 * The detected set becomes the ledger. What each device is already set to is
 * kept, so a save that only adds a device does not quietly re-enable one that
 * was turned off.
 */
export async function saveDetectedTuners(): Promise<TunerWriteResult> {
  const client = carinaClient()

  const [ledger, detected] = await Promise.all([
    client.GET('/api/tuners'),
    client.GET('/api/tuners/detected'),
  ])

  if (ledger.response.status === 401 || detected.response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const ledgerBody = ledger.data ?? ledger.error
  const detectedBody = detected.data ?? detected.error

  if (ledgerBody?.data == null) {
    return {
      state: 'rejected',
      message:
        `保存前の一覧を読み取れなかったため、保存していません。${ledgerBody?.message ?? ''}`.trim(),
    }
  }

  if (detectedBody?.data == null) {
    return {
      state: 'rejected',
      message:
        `検出結果を読み取れなかったため、保存していません。${detectedBody?.message ?? ''}`.trim(),
    }
  }

  const kept = new Map(
    ledgerBody.data.desired.map((entry) => [entry.deviceId, entry]),
  )
  const tuners = detectedBody.data.devices.map((device) => ({
    deviceId: device.deviceId,
    disabled: kept.get(device.deviceId)?.disabled ?? false,
    lnbPower: kept.get(device.deviceId)?.lnbPower ?? false,
  }))

  // The API refuses an empty ledger, and emptying it is not what this card is
  // for, so the refusal is stated here rather than sent and bounced.
  if (tuners.length === 0) {
    return {
      state: 'rejected',
      message:
        'デバイスが 1 台も検出されていないため、保存できませんでした。一覧を空にする操作ではありません。接続を確かめてから検出し直してください。',
    }
  }

  const { response } = await client.PUT('/api/tuners', { body: { tuners } })

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  return {
    state: 'rejected',
    message:
      DETECTION_REFUSAL[response.status] ??
      `検出結果を保存できませんでした(${response.status})。`,
  }
}

/** The API answers in its own English, so what a refusal means is said here. */
const DETECTION_REFUSAL: Partial<Record<number, string>> = {
  400: '検出結果をそのままでは保存できませんでした。検出し直してください。',
  501: 'driver がデバイス検出に対応していないため、保存できませんでした。',
  503: 'driver に接続できないため、保存できませんでした。接続が戻ってから試してください。',
}

const KIND_TEXT: Record<TunerKind, string> = {
  unspecified: '種別不明',
  terrestrial: '地上波',
  satellite: '衛星',
}

const DETECTION_NOTE: Record<DeviceDetection, string> = {
  unspecified: '状態を答えませんでした',
  detected: '新しく検出されました',
  busy: '他の処理が使用中です',
  permissionDenied: 'アクセス権がありません',
  unreadable: '読み取れませんでした',
}

function toDetection(detected: DetectedTunersResponder): DetectionResult {
  const devices = new Map(
    detected.devices.map((device) => [device.deviceId, device]),
  )

  return {
    detected: detected.devices.map((device) => device.deviceId),
    rows: [
      ...detected.added.map((deviceId) => ({
        kind: 'add' as const,
        tag: '新規',
        device: deviceId,
        note: toAddedNote(devices.get(deviceId)),
      })),
      ...detected.missing.map((deviceId) => ({
        kind: 'del' as const,
        tag: '消失',
        device: deviceId,
        note: '接続が確認できません',
      })),
      ...detected.mismatched.map((mismatch) => ({
        kind: 'kind' as const,
        tag: '種別相違',
        device: mismatch.deviceId,
        note: `一覧は ${KIND_TEXT[mismatch.observed]} / 検出は ${mismatch.detected
          .map((kind) => KIND_TEXT[kind])
          .join('・')}`,
      })),
    ],
  }
}

function toAddedNote(device: DetectedDeviceResponder | undefined): string {
  if (device === undefined) {
    return '新しく検出されました'
  }

  const kinds = device.kinds.map((kind) => KIND_TEXT[kind]).join('・')

  return device.detection === 'detected' && kinds !== ''
    ? `${kinds}として検出されました`
    : DETECTION_NOTE[device.detection]
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
