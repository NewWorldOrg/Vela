import type { Route } from 'next'

import { formatMoment } from '@/lib/format'
import { SILENCE_RANGE } from '@/lib/tuners'
import {
  NOT_YET_IN_THIS_BUILD_SAYING,
  shapeFor,
  wordFor,
} from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import {
  SESSION_PILL_LABEL,
  SESSION_PURPOSE_LABEL,
} from '@/repository/driver-capabilities'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import type { ScanSystem } from '@/repository/scan-systems'
import { SYSTEM_LABEL } from '@/repository/scan-systems'
import { promisedEndOf, tuningLabelOf } from '@/repository/tuning'

type TunerLedgerResponder = components['schemas']['TunerLedgerResponder']
type TunerObservationResponder =
  components['schemas']['TunerObservationResponder']
type TunerEntryResponder = components['schemas']['TunerEntryResponder']
type DriverStatusEnvelope =
  components['schemas']['BaseResponderOfDriverStatusResponder']
type SessionPurpose = components['schemas']['SessionPurpose']
type TunerKind = components['schemas']['TunerKind']
type TunerFaultKind = components['schemas']['TunerFaultKind']
type DeviceDetection = components['schemas']['DeviceDetection']
type DetectedTunersResponder = components['schemas']['DetectedTunersResponder']
type DetectedDeviceResponder = components['schemas']['DetectedDeviceResponder']
type TunerHealthResponder = components['schemas']['TunerHealthResponder']
type ServiceReachLevel = components['schemas']['ServiceReachLevel']

export interface SystemReach {
  system: ScanSystem
  label: string
  level: ServiceReachLevel
  services: number
  lastSeenAt?: string
}

export interface TunerSession {
  label: string
  saying?: string
  tone: 'recording' | 'epg'
  code?: string
  endsAt?: string
}

export interface TunerRow {
  id: string
  device: string
  kind?: '地上波' | '衛星'
  enabled: boolean
  session?: TunerSession
  idleLabel?: string
  draining?: boolean
  state: 'ok' | 'warn' | 'faulted'
  stateLabel: string
  stateSub?: string
  lastService?: { at: string }
  lnb?: LnbPower
}

export interface LnbPower {
  saved: boolean
  applied?: boolean
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

export type NoticeActions =
  readonly [NoticeLinkAction] | readonly [NoticeLinkAction, NoticeLinkAction]

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
  reach: SystemReach[]
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

const SYSTEMS_OF: Partial<Record<TunerKind, ScanSystem[]>> = {
  terrestrial: ['isdbT'],
  satellite: ['isdbSBs', 'isdbSCs110'],
}

const OUT_OF_REACH: ReadonlySet<ServiceReachLevel> = new Set([
  'silent',
  'missing',
])

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

  const reported = health.data?.data ?? undefined

  return {
    state: 'ok',
    result: toResult(
      body.data,
      toDriver(driver.data),
      reported == null ? THRESHOLD_HOURS : toInt(reported.hoursOfSilence),
      toReach(reported),
    ),
  }
}

function toReach(health: TunerHealthResponder | undefined): SystemReach[] {
  return (health?.systems ?? []).flatMap((system) =>
    system.system === 'unspecified'
      ? []
      : [
          {
            system: system.system,
            label: wordFor(SYSTEM_LABEL, system.system),
            level: system.level,
            services: toInt(system.services),
            lastSeenAt: system.lastSeenAt ?? undefined,
          },
        ],
  )
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

  if (!deadline?.trim() || !budget?.trim()) {
    return undefined
  }

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
    until: until ? formatMoment(until[1]) : undefined,
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

  const saved = await client.PUT('/api/tuners', {
    body: { tuners, savedHash: ledgerBody.data.savedHash },
  })

  if (saved.response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (saved.response.ok) {
    return { state: 'ok' }
  }

  return {
    state: 'rejected',
    message: toSaveRefusal(
      saved.response,
      saved.data ?? saved.error,
      `検出結果を保存できませんでした(${saved.response.status})。`,
    ),
  }
}

export async function setLnbPower(
  deviceId: string,
  on: boolean,
): Promise<TunerWriteResult> {
  const { data, error, response } = await carinaClient().PUT(
    '/api/tuners/{deviceId}/lnb-power',
    { params: { path: { deviceId } }, body: { lnbPower: on } },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  if (response.status === 404) {
    return {
      state: 'rejected',
      message: `${deviceId} は保存された一覧にないため、保存していません。デバイスを検出してから保存してください。`,
    }
  }

  if (response.status === 501) {
    return {
      state: 'rejected',
      message:
        'driver が LNB 給電の保存に対応していないため、保存できませんでした。',
    }
  }

  return {
    state: 'rejected',
    message: toSaveRefusal(
      response,
      data ?? error,
      `LNB 給電を保存できませんでした(${response.status})。`,
    ),
  }
}

function toSaveRefusal(
  response: Response,
  body: { message: string } | undefined,
  fallback: string,
): string {
  const prefix = body?.message.split(':', 1)[0]?.trim()
  const known = prefix !== undefined ? REFUSAL_BY_PREFIX[prefix] : undefined

  return known ?? DETECTION_REFUSAL[response.status] ?? fallback
}

const REFUSAL_BY_PREFIX: Partial<Record<string, string>> = {
  ledgerChanged:
    'チューナーの一覧が保存のあいだに変わったため、保存していません。検出し直してから保存してください。',
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
  reach: SystemReach[],
): TunerResult {
  const observed = new Map(
    (ledger.observed ?? []).map((entry) => [entry.deviceId, entry]),
  )

  const rows = ledger.desired.map((entry) =>
    toRow(entry, observed.get(entry.deviceId), reach),
  )

  return {
    ...driver,
    notices: toNotices(ledger, reach, thresholdHours),
    thresholdHours,
    reach,
    rows,
  }
}

function toNotices(
  ledger: TunerLedgerResponder,
  reach: SystemReach[],
  thresholdHours: number,
): TunerNotice[] {
  const notices: TunerNotice[] = []

  if (ledger.observationFailure) {
    notices.push({
      tone: 'danger',
      body: 'driver からチューナーの観測を取得できませんでした。',
    })
  }

  for (const system of reach.filter((one) => OUT_OF_REACH.has(one.level))) {
    notices.push(toReachNotice(system, thresholdHours))
  }

  for (const system of reach.filter((one) => one.level === 'unmeasured')) {
    notices.push(toNoServiceNotice(system))
  }

  if (ledger.drifted) {
    notices.push(toDriftNotice(ledger.observed))
  }

  return notices
}

function toReachNotice(
  system: SystemReach,
  thresholdHours: number,
): TunerNotice {
  const lastSeen =
    system.lastSeenAt === undefined
      ? ''
      : `最後に受信したのは ${formatMoment(system.lastSeenAt)} です。`

  return {
    tone: system.level === 'missing' ? 'danger' : 'warn',
    body:
      system.level === 'missing'
        ? `${system.label}のサービスを ${thresholdHours} 時間以上受信していません。${lastSeen}`
        : `${system.label}のサービスをいま受信できていません。${lastSeen}`,
    actions: [
      {
        label: '切り分けを見る',
        href: `/settings/channels#system-${system.system}` as Route,
      },
    ],
  }
}

function toNoServiceNotice(system: SystemReach): TunerNotice {
  return {
    tone: 'warn',
    body: `${system.label}のサービスが 0 件です。`,
    actions: [
      {
        label: '切り分けを見る',
        href: `/settings/channels#system-${system.system}` as Route,
      },
    ],
  }
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
      until: last === undefined ? undefined : formatMoment(last),
    },
  }
}

function toRow(
  entry: TunerEntryResponder,
  observation: TunerObservationResponder | undefined,
  reach: SystemReach[],
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
    lnb: toLnb(entry, observation),
    lastService: toLastService(observation, reach),
    ...toState(observation),
  }
}

function toLastService(
  observation: TunerObservationResponder | undefined,
  reach: SystemReach[],
): TunerRow['lastService'] {
  const served = observation && SYSTEMS_OF[observation.kind]

  if (served === undefined) {
    return undefined
  }

  const seen = reach
    .flatMap((one) =>
      served.includes(one.system) && one.lastSeenAt !== undefined
        ? [one.lastSeenAt]
        : [],
    )
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .at(-1)

  return seen === undefined ? undefined : { at: formatMoment(seen) }
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

  const label = wordFor(SESSION_PILL_LABEL, observation.sessionPurpose)
  const saying = wordFor(SESSION_LABEL, observation.sessionPurpose)

  return {
    label,
    saying: saying === label ? undefined : saying,
    tone: observation.sessionPurpose === 'recording' ? 'recording' : 'epg',
    code: tuningLabelOf(observation.sessionTuning),
    endsAt: endsAt === undefined ? undefined : formatMoment(endsAt),
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
  entry: TunerEntryResponder,
  observation: TunerObservationResponder | undefined,
): LnbPower | undefined {
  if ((observation?.kind ?? entry.kind) !== 'satellite') {
    return undefined
  }

  return { saved: entry.lnbPower, applied: observation?.lnbPowered }
}

export const TUNER_STATE_LABEL = {
  unread: '未読込',
  faulted: '異常',
  degraded: '警告',
  ok: '正常',
} as const

function toState(
  observation: TunerObservationResponder | undefined,
): Pick<TunerRow, 'state' | 'stateLabel' | 'stateSub'> {
  if (observation === undefined) {
    return { state: 'warn', stateLabel: TUNER_STATE_LABEL.unread }
  }

  if (observation.state === 'faulted' || observation.health === 'faulted') {
    return {
      state: 'faulted',
      stateLabel: TUNER_STATE_LABEL.faulted,
      stateSub: whyItIsNotHandedOut(observation),
    }
  }

  if (observation.health === 'degraded') {
    return { state: 'warn', stateLabel: TUNER_STATE_LABEL.degraded }
  }

  return { state: 'ok', stateLabel: TUNER_STATE_LABEL.ok }
}

const UNTIL_THE_DRIVER_RESTARTS = 'driver を起動し直すまで割り当てられない。'

const FAULT_SAID: Record<
  TunerFaultKind,
  (observation: TunerObservationResponder) => string
> = {
  unspecified: () => NOT_YET_IN_THIS_BUILD_SAYING,
  ledgerDisagrees: (observation) =>
    `一覧では${wordFor(KIND_TEXT, observation.faultDeclaredKind ?? 'unspecified')}、このチューナーが受信できるのは${observation.faultReceivableKinds
      .map((kind) => wordFor(KIND_TEXT, kind))
      .join('・')}。一致するまで割り当てられない。`,
  deviceFailed: () =>
    '使用中にデバイスが応答しなくなった。開き直せた時点で割り当てが戻る。',
  deviceFailedAgain: () =>
    `戻した直後にデバイスがまた応答しなくなった。${UNTIL_THE_DRIVER_RESTARTS}`,
  repeatedTuneFailure: () =>
    `同じチャンネルで続けて選局できなかった。${UNTIL_THE_DRIVER_RESTARTS}`,
}

function whyItIsNotHandedOut(observation: TunerObservationResponder): string {
  return shapeFor(
    FAULT_SAID,
    observation.faultKind,
    () => NOT_YET_IN_THIS_BUILD_SAYING,
  )(observation)
}
