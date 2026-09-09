import type { Route } from 'next'

import { formatStamp } from '@/lib/format'
import { SILENCE_RANGE } from '@/lib/tuners'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import { SESSION_PURPOSE_LABEL } from '@/repository/driver-capabilities'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import { promisedEndOf, tuningLabelOf } from '@/repository/tuning'

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
  code?: string
  endsAt?: string
}

export interface TunerRow {
  id: string
  device: string
  hardware?: string
  kind?: '地上波' | '衛星'
  enabled: boolean
  session?: TunerSession
  idleLabel?: string
  draining?: boolean
  state: 'ok' | 'warn' | 'faulted'
  stateLabel: string
  stateSub?: string
  lastService?: { at: string; ago?: string }
  lnb?: string
}

export interface DetectionDiffRow {
  kind: 'add' | 'del' | 'kind'
  tag: string
  device: string
  note: string
}

export interface DetectionResult {
  rows: DetectionDiffRow[]
  detected: string[]
  changes: boolean
}

export type DetectionScreenResult =
  | { state: 'ok'; detection: DetectionResult }
  | { state: 'unauthenticated' }
  | { state: 'unavailable'; message: string }

export interface NoticeLinkAction {
  label: string
  href?: Route
}

export interface NoticeButtonAction {
  label: string
  control: 'button'
  disabled?: boolean
}

export type NoticeAction = NoticeLinkAction | NoticeButtonAction

export type NoticeActions =
  readonly [NoticeAction] | readonly [NoticeAction, NoticeAction]

export interface TunerNotice {
  tone: 'danger' | 'warn'
  body: string
  actions?: NoticeActions
  restart?: DriverRestartOffer
}

export interface DriverRestartOffer {
  recordings?: number
  until?: string
}

export type DriverLink = 'connected' | 'draining' | 'disconnected' | 'unknown'

interface DriverState {
  connection: DriverLink
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
  | { state: 'unavailable'; message: string }

export type TunerToggleResult =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'unavailable'; message: string }

export type DriverRestartResult =
  | { state: 'accepted'; instanceId?: string; budgetSeconds: number }
  | { state: 'recording'; recordings?: number; until?: string }
  | { state: 'unauthenticated' }
  | { state: 'disconnected' }
  | { state: 'unsupported' }
  | { state: 'mismatched' }
  | { state: 'refused'; status: number }

export interface RestartTicket {
  previousInstanceId?: string
  deadline: number
  budgetSeconds: number
}

export type RestartWindow =
  | { state: 'restarting'; deadline: number; budgetSeconds: number }
  | { state: 'returned'; instanceId: string }
  | { state: 'unverifiable' }
  | { state: 'overdue'; budgetSeconds: number }

export type TunerWriteResult =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

const KIND_LABEL: Partial<Record<TunerKind, '地上波' | '衛星'>> = {
  terrestrial: '地上波',
  satellite: '衛星',
}

const SESSION_LABEL = SESSION_PURPOSE_LABEL

const THRESHOLD_HOURS = 24

const MIN_BUDGET_SECONDS = 10

const MAX_BUDGET_SECONDS = 60

export async function getTuners(): Promise<TunerScreenResult> {
  const client = carinaClient()

  const [ledger, driver, health] = await Promise.all([
    client.GET('/api/tuners'),
    client.GET('/api/driver/status'),
    client.GET('/api/tuners/health'),
  ])

  if (ledger.response.status === 401 || driver.response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const body = ledger.data ?? ledger.error

  if (body === undefined) {
    throw new Error(`GET /api/tuners answered ${ledger.response.status}`)
  }

  if (body.data === null || !body.status) {
    return {
      state: 'unavailable',
      message: `API は ${ledger.response.status} を返しました。`,
    }
  }

  const hours = health.data?.data?.hoursOfSilence

  return {
    state: 'ok',
    result: toResult(
      body.data,
      toDriver(driver.data),
      hours == null ? THRESHOLD_HOURS : toInt(hours),
    ),
  }
}

export async function setHoursOfSilence(
  hours: number,
): Promise<TunerWriteResult> {
  const { data, error, response } = await carinaClient().PUT(
    '/api/tuners/health/settings',
    { body: { hoursOfSilence: hours } },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const body = data ?? error

  if (body === undefined) {
    return {
      state: 'rejected',
      message: `しきい値を変えられませんでした(${response.status})。`,
    }
  }

  return body.status
    ? { state: 'ok' }
    : {
        state: 'rejected',
        message: `しきい値は ${SILENCE_RANGE.least} 〜 ${SILENCE_RANGE.most} 時間です。`,
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
    : {
        state: 'unavailable',
        message: `API は ${response.status} を返しました。`,
      }
}

export async function restartDriver(): Promise<DriverRestartResult> {
  const { data, error, response } = await carinaClient().POST(
    '/api/driver/restart',
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const accepted = data?.data

  if (response.status === 202 && accepted) {
    return {
      state: 'accepted',
      instanceId: accepted.instanceId ?? undefined,
      budgetSeconds: toBudget(Number(accepted.budgetSeconds)),
    }
  }

  switch (response.status) {
    case 409:
      return { state: 'recording', ...toHolding(error?.message) }
    case 503:
      return { state: 'disconnected' }
    case 501:
      return { state: 'unsupported' }
    case 502:
      return { state: 'mismatched' }
    default:
      return { state: 'refused', status: response.status }
  }
}

export const RESTART_TICKET_COOKIE = 'vela-driver-restart'

export function serializeRestartTicket(ticket: RestartTicket): string {
  return `${ticket.previousInstanceId ?? ''}|${ticket.deadline}|${ticket.budgetSeconds}`
}

export function parseRestartTicket(
  value: string | undefined,
): RestartTicket | undefined {
  if (!value) {
    return undefined
  }

  const [previous, deadline, budget] = value.split('|')
  const deadlineMs = Number(deadline)
  const budgetSeconds = Number(budget)

  if (!Number.isFinite(deadlineMs) || !Number.isFinite(budgetSeconds)) {
    return undefined
  }

  return {
    previousInstanceId: previous || undefined,
    deadline: deadlineMs,
    budgetSeconds,
  }
}

export function toRestartWindow(
  ticket: RestartTicket | undefined,
  driver: DriverState | undefined,
  now: number = Date.now(),
): RestartWindow | undefined {
  if (ticket === undefined) {
    return undefined
  }

  const { previousInstanceId, deadline, budgetSeconds } = ticket

  if (
    previousInstanceId !== undefined &&
    driver?.connection === 'connected' &&
    driver.instanceId !== undefined &&
    driver.instanceId !== previousInstanceId
  ) {
    return { state: 'returned', instanceId: driver.instanceId }
  }

  if (previousInstanceId === undefined && driver?.connection === 'connected') {
    return { state: 'unverifiable' }
  }

  if (now >= deadline) {
    return { state: 'overdue', budgetSeconds }
  }

  return { state: 'restarting', deadline, budgetSeconds }
}

function toHolding(message: string | undefined): {
  recordings?: number
  until?: string
} {
  const recordings = message?.match(/(\d+) recording/)
  const until = message?.match(
    /ends at (\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))/,
  )

  return {
    recordings: recordings ? Number(recordings[1]) : undefined,
    until: until ? formatStamp(until[1]) : undefined,
  }
}

function toBudget(seconds: number) {
  return Math.min(Math.max(seconds, MIN_BUDGET_SECONDS), MAX_BUDGET_SECONDS)
}

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
    return {
      state: 'unavailable',
      message: `API は ${response.status} を返しました。`,
    }
  }

  return { state: 'ok', detection: toDetection(body.data) }
}

export async function saveDetectedTuners(
  devices: string[],
): Promise<TunerWriteResult> {
  const client = carinaClient()
  const ledger = await client.GET('/api/tuners')

  if (ledger.response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const ledgerBody = ledger.data ?? ledger.error

  if (ledgerBody?.data == null) {
    return {
      state: 'rejected',
      message: `保存前の一覧を読み取れなかったため、保存していません(${ledger.response.status})。`,
    }
  }

  const kept = new Map(
    ledgerBody.data.desired.map((entry) => [entry.deviceId, entry]),
  )
  const observed = new Map(
    (ledgerBody.data.observed ?? []).map((entry) => [entry.deviceId, entry]),
  )
  const tuners = devices.map((deviceId) => ({
    deviceId,
    disabled: isDisabled(kept.get(deviceId), observed.get(deviceId)),
    lnbPower: kept.get(deviceId)?.lnbPower ?? false,
  }))

  if (tuners.length === 0) {
    return {
      state: 'rejected',
      message:
        'デバイスが 1 台も検出されていないため、保存できませんでした。一覧を空にする操作ではありません。接続を確かめてから検出し直してください。',
    }
  }

  const saved = await client.PUT('/api/tuners', { body: { tuners } })

  if (saved.response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (saved.response.ok) {
    return { state: 'ok' }
  }

  return {
    state: 'rejected',
    message: toSaveRefusal(saved.response, saved.data ?? saved.error),
  }
}

function toSaveRefusal(
  response: Response,
  body: { message: string } | undefined,
): string {
  const prefix = body?.message.split(':', 1)[0]?.trim()
  const known = prefix !== undefined ? REFUSAL_BY_PREFIX[prefix] : undefined

  return (
    known ??
    DETECTION_REFUSAL[response.status] ??
    `検出結果を保存できませんでした(${response.status})。`
  )
}

const REFUSAL_BY_PREFIX: Partial<Record<string, string>> = {
  unknownDevice:
    '確認した検出結果が古くなっています。接続が変わったため保存されていません。もう一度検出してください。',
  undeterminedKind:
    '種別を判定できないデバイスが含まれるため、保存できませんでした。デバイスの状態を確かめてから検出し直してください。',
  ledgerUnwritable:
    'driver が一覧を書き込めないため、保存できませんでした。driver 側の保存先に問題があります。',
}

function isDisabled(
  entry: TunerEntryResponder | undefined,
  observation: TunerObservationResponder | undefined,
): boolean {
  if (observation === undefined) {
    return entry?.disabled ?? false
  }

  return (
    observation.state === 'disabled' ||
    observation.state === 'draining' ||
    observation.disablePending
  )
}

const DETECTION_REFUSAL: Partial<Record<number, string>> = {
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

const UNSAVABLE_NOTE: Record<DeviceDetection, string> = {
  unspecified: '状態を答えないため保存されません',
  detected: '種別を判定できないため保存されません',
  busy: '他の処理が使用中のため保存されません',
  permissionDenied: 'アクセス権がないため保存されません',
  unreadable: '読み取れないため保存されません',
}

function toDetection(detected: DetectedTunersResponder): DetectionResult {
  const devices = new Map(
    detected.devices.map((device) => [device.deviceId, device]),
  )

  const unsavable = new Set(
    detected.added.filter(
      (deviceId) => (devices.get(deviceId)?.kinds.length ?? 0) === 0,
    ),
  )

  return {
    detected: detected.devices
      .map((device) => device.deviceId)
      .filter((deviceId) => !unsavable.has(deviceId)),
    changes:
      detected.missing.length > 0 ||
      detected.added.some((deviceId) => !unsavable.has(deviceId)),
    rows: [
      ...detected.added.map((deviceId) => ({
        kind: 'add' as const,
        tag: '新規',
        device: deviceId,
        note: unsavable.has(deviceId)
          ? wordFor(
              UNSAVABLE_NOTE,
              devices.get(deviceId)?.detection ?? 'unspecified',
            )
          : toAddedNote(devices.get(deviceId)),
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
        note: `一覧は ${wordFor(KIND_TEXT, mismatch.observed)} / 検出は ${mismatch.detected
          .map((kind) => wordFor(KIND_TEXT, kind))
          .join('・')}`,
      })),
    ],
  }
}

function toAddedNote(device: DetectedDeviceResponder | undefined): string {
  if (device === undefined) {
    return '新しく検出されました'
  }

  const kinds = device.kinds.map((kind) => wordFor(KIND_TEXT, kind)).join('・')

  return kinds !== ''
    ? `${kinds}として検出されました`
    : wordFor(DETECTION_NOTE, device.detection)
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
    default:
      return { connection: 'unknown' }
  }
}

function toResult(
  ledger: TunerLedgerResponder,
  driver: DriverState,
  thresholdHours: number,
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
    thresholdHours,
    rows,
  }
}

function toNotices(ledger: TunerLedgerResponder): TunerNotice[] {
  const notices: TunerNotice[] = []

  if (ledger.observationFailure) {
    notices.push({
      tone: 'danger',
      body: 'driver からチューナーの観測を取得できませんでした。',
    })
  }

  if (ledger.drifted) {
    notices.push(toDriftNotice(ledger.observed))
  }

  return notices
}

function toDriftNotice(
  observed: TunerObservationResponder[] | null,
): TunerNotice {
  const body = '保存済み・未反映の変更があります。'

  if (observed === null) {
    return { tone: 'warn', body, restart: {} }
  }

  const recordings = observed.filter(
    (entry) => entry.sessionId !== null && entry.sessionPurpose === 'recording',
  )

  const last = recordings
    .map((entry) => entry.sessionEndsAt)
    .filter((at) => at !== null)
    .sort()
    .at(-1)

  return {
    tone: 'warn',
    body,
    restart: {
      recordings: recordings.length,
      until: last === undefined ? undefined : formatStamp(last),
    },
  }
}

function toRow(
  entry: TunerEntryResponder,
  observation: TunerObservationResponder | undefined,
): TunerRow {
  const kind = observation && KIND_LABEL[observation.kind]

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

  const endsAt = promisedEndOf(
    observation.sessionPurpose,
    observation.sessionEndsAt,
  )

  return {
    label: wordFor(SESSION_LABEL, observation.sessionPurpose),
    tone: observation.sessionPurpose === 'recording' ? 'recording' : 'epg',
    code: tuningLabelOf(observation.sessionTuning),
    endsAt: endsAt === undefined ? undefined : formatStamp(endsAt),
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

  if (observation.state === 'faulted' || observation.health === 'faulted') {
    return { state: 'faulted', stateLabel: '異常' }
  }

  if (observation.health === 'degraded') {
    return { state: 'warn', stateLabel: '警告' }
  }

  return { state: 'ok', stateLabel: '正常' }
}
