import type { Route } from 'next'

import { formatStamp } from '@/lib/format'
import { SILENCE_RANGE } from '@/lib/tuners'
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

/**
 * What holds a tuner: the purpose, and the tuning parameters the driver was
 * handed. No service or programme name — naming what is on a channel needs the
 * programme guide, and that domain does not exist yet. The physical values are
 * the layer this screen is about, so they stay even once names can be resolved.
 */
export interface TunerSession {
  label: string
  tone: 'recording' | 'epg'
  /** The tuning parameters, set in code face. */
  code?: string
  /**
   * Only named for a recording, which carries an end of its own. Every other
   * purpose gets the driver's own upper bound, which is a cutoff rather than a
   * plan, and promising it as one would be a promise nobody made.
   */
  endsAt?: string
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
  /**
   * The devices a save writes: the detected set, less any new device whose
   * kind could not be probed — the driver refuses a ledger that names one.
   */
  detected: string[]
  /**
   * Whether saving would change the ledger at all. The ledger holds no kind,
   * so a difference made only of kind mismatches — or of devices that cannot
   * be saved — writes it back byte-identical, and no save is offered.
   */
  changes: boolean
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
  /**
   * Set on the notice that offers the restart. The ledger is only a pre-check:
   * the driver decides, so a press can still be refused.
   */
  restart?: DriverRestartOffer
}

/** What the ledger says stands between the saved changes and a restart. */
export interface DriverRestartOffer {
  /**
   * Recordings holding a tuner right now. Above zero the restart waits.
   * Absent when the driver could not be observed — not knowing whether a
   * recording runs is a different fact from there being none.
   */
  recordings?: number
  /**
   * When the last of those recordings ends, spelled for the screen. An instant
   * reads in the zone of whoever formats it, so it is formatted here and not
   * again in the browser.
   */
  until?: string
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

/**
 * What the driver answered to a restart. `recording` is its own refusal and
 * not a failure: the ledger pre-check can read clear while a recording starts
 * a moment later, and only the driver knows.
 */
export type DriverRestartResult =
  /**
   * `budgetSeconds` is the hard stop the driver named, held to the window this
   * screen is willing to wait, so what it says and what it does agree.
   */
  | { state: 'accepted'; instanceId?: string; budgetSeconds: number }
  /** `until` is spelled for the screen, in the zone the API side runs in. */
  | { state: 'recording'; recordings?: number; until?: string }
  | { state: 'unauthenticated' }
  | { state: 'disconnected' }
  | { state: 'unsupported' }
  | { state: 'mismatched' }
  | { state: 'refused'; status: number }

/**
 * The accepted restart the screen is watching, as recorded when the driver
 * said yes. It survives a reload because the acceptance is recorded outside
 * the component, and the screen re-derives where the restart stands from this
 * plus the driver it can see now.
 */
export interface RestartTicket {
  /** Absent when the acceptance did not name the outgoing instance. */
  previousInstanceId?: string
  /** Epoch milliseconds of the hard stop the driver named. */
  deadline: number
  budgetSeconds: number
}

/**
 * Where an accepted restart stands, judged from the ticket and the driver
 * answering now. `returned` is only ever claimed on seeing an instance that
 * differs from a *known* outgoing one — a missing previous instance is not a
 * comparison, it is `unverifiable`.
 */
export type RestartWindow =
  | { state: 'restarting'; deadline: number; budgetSeconds: number }
  | { state: 'returned'; instanceId: string }
  | { state: 'unverifiable' }
  | { state: 'overdue'; budgetSeconds: number }

/** The outcome of saving the ledger, so the card can say what happened. */
export type TunerWriteResult =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

const KIND_LABEL: Partial<Record<TunerKind, '地上波' | '衛星'>> = {
  terrestrial: '地上波',
  satellite: '衛星',
}

const SESSION_LABEL = SESSION_PURPOSE_LABEL

/**
 * What the screen says while the setting itself could not be read. It is the
 * API's own default, so a screen that falls back to it says what an untouched
 * install holds rather than a number of its own.
 */
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

/**
 * The hours of silence a kind may go before the screen calls it a warning.
 * The API refuses anything outside its own bounds, and the form holds the
 * same rule so it can say why before it asks.
 */
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

/** Where the ticket is kept between requests, scoped to the tuner screen. */
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

/**
 * The refusal is operator prose in the driver's own language, and the counts
 * and the time inside it are the only place the screen can learn what holds
 * the driver. They are read out of it here; the prose itself is not shown.
 */
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

/**
 * A budget outside this range is not one this screen waits on: it would either
 * stop reading before the driver could plausibly be back, or hold the wait open
 * long past the point where saying so is more use than waiting.
 */
function toBudget(seconds: number) {
  return Math.min(Math.max(seconds, MIN_BUDGET_SECONDS), MAX_BUDGET_SECONDS)
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
    return {
      state: 'unavailable',
      message: `API は ${response.status} を返しました。`,
    }
  }

  return { state: 'ok', detection: toDetection(body.data) }
}

/**
 * Writes the set the card showed, not a fresh detection: what was reviewed is
 * what gets saved. A device that has gone since is no longer detected, and the
 * API refuses a ledger naming one, which is how a stale review is caught.
 *
 * Each device keeps the switch the screen shows for it. That is the driver's
 * observation, not the saved document — a toggle never reaches the document,
 * so reading `disabled` from there would re-enable a tuner just turned off.
 */
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

  // The API refuses an empty ledger, and emptying it is not what this card is
  // for, so the refusal is stated here rather than sent and bounced.
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

/**
 * The API folds most driver refusals onto one status, so the status alone
 * cannot say what went wrong — a stale review, an unwritable ledger file and a
 * kind the driver cannot pin down all answer 400. The refusal body carries a
 * discriminating prefix before its first colon, and that is what is read; the
 * prose after it stays off the screen.
 */
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
  /** The review went stale: a device it named is no longer detected. */
  unknownDevice:
    '確認した検出結果が古くなっています。接続が変わったため保存されていません。もう一度検出してください。',
  /**
   * A device stopped answering what it receives between the review and the
   * save. Detecting again shows it as unreadable and leaves it out.
   */
  undeterminedKind:
    '種別を判定できないデバイスが含まれるため、保存できませんでした。デバイスの状態を確かめてから検出し直してください。',
  ledgerUnwritable:
    'driver が一覧を書き込めないため、保存できませんでした。driver 側の保存先に問題があります。',
}

/**
 * The switch as the screen renders it, read back: off while the observation
 * says disabled, and off while a disable the driver has accepted is still
 * draining. `toRow` keeps those apart — `enabled` plus a `draining` flag — and
 * the switch shows their combination; the save writes that combination.
 */
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

/** The API answers in its own English, so what a refusal means is said here. */
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

/** Why a new device is left out of the save: its kind could not be probed. */
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

  // A new device whose kind the driver could not probe cannot be saved: the
  // driver refuses the whole ledger rather than guess what it tunes. It is
  // still shown, but left out of the set a save writes, and its row says so.
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
          ? UNSAVABLE_NOTE[devices.get(deviceId)?.detection ?? 'unspecified']
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

  return kinds !== ''
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

  // `observationFailure` is the driver's own English operator prose; what the
  // screen shows is designed Japanese, so the fact is reported without it.
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

  const endsAt = promisedEndOf(
    observation.sessionPurpose,
    observation.sessionEndsAt,
  )

  return {
    label: SESSION_LABEL[observation.sessionPurpose],
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
