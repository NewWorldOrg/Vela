import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { FailureClass } from '@/repository/scan-failures'
import {
  FAILURE_CLASSES,
  INCOMPLETE_TABLES,
  LOCKED_WITHOUT_DATA,
  NO_LOCK,
  UNEXPECTED_STREAM,
} from '@/repository/scan-failures'
import type { ScanSystem } from '@/repository/scan-systems'
import { SCAN_SYSTEMS } from '@/repository/scan-systems'
import type { Measurement, Reception } from '@/repository/tuning'
import { channelLabel, measurementOf, receptionOf } from '@/repository/tuning'
import { formatMonth, formatSpan, formatStamp } from '@/lib/format'
import { shapeFor, wordFor } from '@/lib/not-yet-in-this-build'

type BroadcastServiceResponder =
  components['schemas']['BroadcastServiceResponder']
type CandidateChannelResponder =
  components['schemas']['CandidateChannelResponder']
type ScanAttemptResponder = components['schemas']['ScanAttemptResponder']
type ScanAttemptOutcome = components['schemas']['ScanAttemptOutcome']
type ScanDifferenceResponder = components['schemas']['ScanDifferenceResponder']
type ScanMeasurementResponder =
  components['schemas']['ScanMeasurementResponder']
type ScanProgressResponder = components['schemas']['ScanProgressResponder']
type ScanRunResponder = components['schemas']['ScanRunResponder']
type ScanServiceChangeResponder =
  components['schemas']['ScanServiceChangeResponder']
type ScanTargetResponder = components['schemas']['ScanTargetResponder']
type ServiceCategory = components['schemas']['ServiceCategory']

const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  television: 'TV',
  oneSeg: 'ワンセグ',
  data: 'データ',
  radio: 'ラジオ',
  temporary: '臨時',
  other: 'その他',
}

const FAILURE_CLASS: Record<
  Exclude<ScanAttemptOutcome, 'succeeded'>,
  FailureClass
> = {
  noLock: NO_LOCK,
  lockedWithoutData: LOCKED_WITHOUT_DATA,
  incompleteTables: INCOMPLETE_TABLES,
  unexpectedStream: UNEXPECTED_STREAM,
}

export type { Measurement, Reception } from '@/repository/tuning'

export interface CandidateRow {
  id: string
  channel: string
  selected: boolean
  measurement?: Measurement
  reception: Reception
  needsRevalidation: boolean
  rotation?: { dropped: boolean; label: string; note: string }
  discovered: string
  lastSeen: string
}

export interface ServiceRow {
  key: string
  name: string
  sid: string
  category: string
  minorCategory: boolean
  currentChannel?: string
  betterChannel?: string
  enabled: boolean
  candidateCount: number
  needsAttentionCount: number
  lastSeen: string
  candidates: CandidateRow[]
}

export interface ZeroDiagnosis {
  scannedAt: string
  attempted: number
  counts: { class: FailureClass; count: number }[]
  verdict?: string
}

export type SystemWalk = 'walked' | 'never' | 'unknown'

export interface ServiceGroup {
  system: ScanSystem
  label: string
  services: ServiceRow[]
  stat: string
  diagnosis?: ZeroDiagnosis
  walk: SystemWalk
}

export interface ScanAttemptRow {
  id: string
  channel: string
  failure?: FailureClass
  streamMismatch?: string
  measurement?: Measurement
  took?: string
  at: string
}

export type ScanState = components['schemas']['ScanRunState']

const STATE_LABEL: Record<ScanState, string> = {
  running: '実行中',
  completed: '完了',
  failed: '失敗',
  cancelled: 'キャンセル',
  interrupted: '中断',
}

export interface ScanRun {
  id: string
  state: ScanState
  stateLabel: string
  startedAt: string
  finishedAt?: string
  took?: string
  reason?: string
}

export interface ScanRunProgress {
  run: ScanRun
  attempted: number
  succeeded: number
  failed: number
  attempts: ScanAttemptRow[]
  systems: ScanSystem[]
  elapsed: string
}

export type RunningScan =
  | { state: 'read'; progress: ScanRunProgress }
  | { state: 'unreadable'; run: ScanRun; message: string }

export interface ProposalChannel {
  kind: 'added' | 'updated' | 'missing'
  channel: string
  measurement?: Measurement
}

export interface ProposalService {
  key: string
  name: string
  sid: string
  category: string
  channels: ProposalChannel[]
}

export interface RotationDeparture {
  key: string
  channel: string
  consecutiveFailures: number
  since: string
}

export interface ScanProposal {
  run: ScanRun
  added: ProposalService[]
  updated: ProposalService[]
  missing: ProposalService[]
  leftRotation: RotationDeparture[]
  failures: ScanAttemptRow[]
  succeeded: number
  empty: boolean
}

export interface ChannelsResult {
  groups: ServiceGroup[]
  unattributed: ServiceRow[]
  running?: RunningScan
  proposal?: ScanProposal
  history: ScanRun[]
}

export type ChannelsScreenResult =
  | { state: 'ok'; result: ChannelsResult }
  | { state: 'unauthenticated' }
  | { state: 'unavailable'; message: string }

export type StartScanResult =
  | { state: 'started'; scanId: string }
  | { state: 'refused'; scanId?: string; message: string }
  | { state: 'rejected'; message: string }

export type WriteResult =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

export type ScanProposalScreenResult =
  | { state: 'ok'; proposal: ScanProposal }
  | { state: 'unauthenticated' }
  | { state: 'gone' }
  | { state: 'unavailable'; message: string }
  | { state: 'missing' }

function toInt(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function toCandidate(candidate: CandidateChannelResponder): CandidateRow {
  const failures = toInt(candidate.consecutiveFailures)

  return {
    id: candidate.id,
    channel: channelLabel(candidate.target),
    selected: candidate.isSelected,
    measurement: measurementOf(candidate.lastMeasurement),
    reception: receptionOf(candidate.lastMeasurement),
    needsRevalidation: candidate.needsRevalidation,
    rotation: toRotation(candidate, failures),
    discovered: formatMonth(candidate.discoveredAt),
    lastSeen: formatStamp(candidate.lastSeenAt),
  }
}

function toRotation(
  candidate: CandidateChannelResponder,
  failures: number,
): CandidateRow['rotation'] {
  if (candidate.rotationState === 'needsAttention') {
    return {
      dropped: true,
      label: `要確認 · 連続失敗 ${failures} 回`,
      note: '巡回対象から外しました',
    }
  }

  if (candidate.rotationState === 'backingOff') {
    return {
      dropped: false,
      label: `再試行待ち · 連続失敗 ${failures} 回`,
      note:
        candidate.nextAttemptAt === null
          ? '間隔を空けて試し直します'
          : `次の試行 ${formatStamp(candidate.nextAttemptAt)}`,
    }
  }

  return undefined
}

function toService(service: BroadcastServiceResponder): ServiceRow {
  const candidates = service.candidates.map(toCandidate)

  return {
    key: `${toInt(service.networkId)}-${toInt(service.serviceId)}`,
    name: service.name,
    sid: `sid ${toInt(service.serviceId)}`,
    category: wordFor(CATEGORY_LABEL, service.category),
    minorCategory: service.category !== 'television',
    currentChannel:
      service.selectedChannel === null
        ? undefined
        : channelLabel(service.selectedChannel),
    betterChannel:
      service.betterChannel === null
        ? undefined
        : channelLabel(service.betterChannel),
    enabled: service.reservableByDefault,
    candidateCount: toInt(service.candidateCount),
    needsAttentionCount: candidates.filter((c) => c.rotation?.dropped).length,
    lastSeen: formatStamp(service.lastSeenAt),
    candidates,
  }
}

function systemOf(service: BroadcastServiceResponder): ScanSystem | undefined {
  const target = service.selectedChannel ?? service.candidates[0]?.target

  return target === undefined || target.system === 'unspecified'
    ? undefined
    : target.system
}

function toStat(services: BroadcastServiceResponder[]): string {
  const parts = Object.entries(CATEGORY_LABEL)
    .map(([category, label]) => [
      label,
      services.filter((service) => service.category === category).length,
    ])
    .filter(([, count]) => (count as number) > 0)

  if (parts.length === 0) {
    return '0 サービス'
  }

  const breakdown = parts
    .map(([label, count]) => `${label} ${count}`)
    .join(' · ')

  return `${services.length} サービス(${breakdown})`
}

function toRun(run: ScanRunResponder): ScanRun {
  const finished = run.finishedAt

  return {
    id: run.scanId,
    state: run.state,
    stateLabel: wordFor(STATE_LABEL, run.state),
    startedAt: formatStamp(run.startedAt),
    finishedAt: finished === null ? undefined : formatStamp(finished),
    took:
      finished === null
        ? undefined
        : formatSpan(
            (new Date(finished).getTime() - new Date(run.startedAt).getTime()) /
              1000,
          ),
    reason: run.reason ?? undefined,
  }
}

function toAttempt(
  attempt: ScanAttemptResponder,
  index: number,
): ScanAttemptRow {
  const observed = attempt.observedTransportStreamId
  const expected = attempt.target.transportStreamId

  return {
    id: `${index}`,
    channel: channelLabel(attempt.target),
    failure:
      attempt.outcome === 'succeeded'
        ? undefined
        : shapeFor(FAILURE_CLASS, attempt.outcome, undefined),
    streamMismatch:
      attempt.outcome === 'unexpectedStream' && observed !== null
        ? `期待 TSID ${expected === null ? '—' : toInt(expected)} / 受信 TSID ${toInt(observed)}`
        : undefined,
    measurement: measurementOf(attempt.measurement),
    took: formatSpan(
      (new Date(attempt.finishedAt).getTime() -
        new Date(attempt.startedAt).getTime()) /
        1000,
    ),
    at: formatStamp(attempt.startedAt),
  }
}

function walkedSystems(progress: ScanProgressResponder): ScanSystem[] {
  return [
    ...new Set(
      progress.attempts
        .map((attempt) => attempt.target.system)
        .filter((system): system is ScanSystem => system !== 'unspecified'),
    ),
  ]
}

function toProgress(progress: ScanProgressResponder): ScanRunProgress {
  return {
    run: toRun(progress.run),
    attempted: toInt(progress.attempted),
    succeeded: toInt(progress.succeeded),
    failed: toInt(progress.failed),
    attempts: progress.attempts.map(toAttempt).reverse(),
    systems: walkedSystems(progress),
    elapsed: formatSpan(
      (Date.now() - new Date(progress.run.startedAt).getTime()) / 1000,
    ),
  }
}

function toProposalService(
  change: ScanServiceChangeResponder,
): ProposalService {
  return {
    key: `${toInt(change.networkId)}-${toInt(change.serviceId)}`,
    name: change.name,
    sid: `sid ${toInt(change.serviceId)}`,
    category: wordFor(CATEGORY_LABEL, change.category),
    channels: change.channels.map((channel) => ({
      kind: channel.kind,
      channel: channelLabel(channel.target),
      measurement: measurementOf(channel.measurement),
    })),
  }
}

function toProposal(
  progress: ScanProgressResponder,
  difference: ScanDifferenceResponder,
): ScanProposal {
  const added = difference.added.map(toProposalService)
  const updated = difference.updated.map(toProposalService)
  const missing = difference.missing.map(toProposalService)
  const leftRotation = difference.leftRotation.map((departure) => ({
    key: `${toInt(departure.networkId)}-${toInt(departure.serviceId)}`,
    channel: channelLabel(departure.target),
    consecutiveFailures: toInt(departure.consecutiveFailures),
    since: formatStamp(departure.since),
  }))

  return {
    run: toRun(progress.run),
    added,
    updated,
    missing,
    leftRotation,
    failures: progress.attempts
      .filter((attempt) => attempt.outcome !== 'succeeded')
      .map(toAttempt)
      .reverse(),
    succeeded: toInt(progress.succeeded),
    empty:
      added.length === 0 &&
      updated.length === 0 &&
      missing.length === 0 &&
      leftRotation.length === 0,
  }
}

function toDiagnosis(
  system: ScanSystem,
  progress: ScanProgressResponder | undefined,
): ZeroDiagnosis | undefined {
  if (progress === undefined) {
    return undefined
  }

  const attempts = progress.attempts.filter(
    (attempt) => attempt.target.system === system,
  )

  if (attempts.length === 0) {
    return undefined
  }

  const counts = FAILURE_CLASSES.map((failure) => ({
    class: failure,
    count: attempts.filter(
      (attempt) =>
        attempt.outcome !== 'succeeded' &&
        shapeFor(FAILURE_CLASS, attempt.outcome, undefined)?.no === failure.no,
    ).length,
  }))
  const only = counts.find(({ count }) => count === attempts.length)

  return {
    scannedAt: formatStamp(progress.run.startedAt),
    attempted: attempts.length,
    counts,
    verdict:
      only &&
      `走査した ${attempts.length} 件すべてが「${only.class.no} ${only.class.label}」で止まっています。`,
  }
}

type ProgressRead =
  | { state: 'ok'; progress: ScanProgressResponder }
  | { state: 'unauthenticated' }
  | { state: 'missing' }
  | { state: 'unavailable'; message: string }

async function getProgress(scanId: string): Promise<ProgressRead> {
  const { data, error, response } = await carinaClient().GET(
    '/api/tuners/scan/{scanId}',
    { params: { path: { scanId } } },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.status === 404) {
    return { state: 'missing' }
  }

  const body = data ?? error
  const progress = body?.data

  if (progress === undefined || progress === null) {
    return {
      state: 'unavailable',
      message: `スキャンの状況を読み取れませんでした(${response.status})。`,
    }
  }

  return { state: 'ok', progress }
}

const HISTORY_DEPTH = 8

interface ReadRun {
  run: ScanRunResponder
  read: ProgressRead
}

function walkOf(system: ScanSystem, history: ReadRun[]): SystemWalk {
  const walked = history.some(
    ({ read }) =>
      read.state === 'ok' &&
      read.progress.attempts.some(
        (attempt) => attempt.target.system === system,
      ),
  )

  if (walked) {
    return 'walked'
  }

  return history.every(({ read }) => read.state === 'ok') ? 'never' : 'unknown'
}

function lastWalkOf(
  system: ScanSystem,
  history: ReadRun[],
): ScanProgressResponder | undefined {
  for (const { run, read } of history) {
    if (
      run.state !== 'running' &&
      read.state === 'ok' &&
      read.progress.attempts.some((attempt) => attempt.target.system === system)
    ) {
      return read.progress
    }
  }

  return undefined
}

function outstandingProposal(history: ReadRun[]): ScanProposal | undefined {
  for (const { run, read } of history) {
    if (
      run.state === 'completed' &&
      read.state === 'ok' &&
      read.progress.difference !== null
    ) {
      return toProposal(read.progress, read.progress.difference)
    }
  }

  return undefined
}

export async function getChannels(): Promise<ChannelsScreenResult> {
  const client = carinaClient()

  const [services, runs] = await Promise.all([
    client.GET('/api/services'),
    client.GET('/api/tuners/scan-runs'),
  ])

  if (services.response.status === 401 || runs.response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const serviceBody = services.data ?? services.error

  if (serviceBody === undefined) {
    throw new Error(`GET /api/services answered ${services.response.status}`)
  }

  if (serviceBody.data === null) {
    return {
      state: 'unavailable',
      message: `API は ${services.response.status} を返しました。`,
    }
  }

  const runBody = runs.data ?? runs.error

  if (runBody === undefined) {
    throw new Error(
      `GET /api/tuners/scan-runs answered ${runs.response.status}`,
    )
  }

  if (runBody.data === null) {
    return {
      state: 'unavailable',
      message: `API は ${runs.response.status} を返しました。`,
    }
  }

  const runList = runBody.data
  const history = await Promise.all(
    runList.slice(0, HISTORY_DEPTH).map(async (run) => ({
      run,
      read: await getProgress(run.scanId),
    })),
  )

  if (history.some(({ read }) => read.state === 'unauthenticated')) {
    return { state: 'unauthenticated' }
  }

  const grouped = new Map<ScanSystem, BroadcastServiceResponder[]>()
  const unattributed: ServiceRow[] = []

  for (const service of serviceBody.data) {
    const system = systemOf(service)

    if (system === undefined) {
      unattributed.push(toService(service))
      continue
    }

    grouped.set(system, [...(grouped.get(system) ?? []), service])
  }

  const groups = SCAN_SYSTEMS.map(({ value, label }) => {
    const services = grouped.get(value) ?? []

    return {
      system: value,
      label,
      services: services.map(toService),
      stat: toStat(services),
      diagnosis:
        services.length === 0
          ? toDiagnosis(value, lastWalkOf(value, history))
          : undefined,
      walk: walkOf(value, history),
    }
  })

  const running = history.find(({ run }) => run.state === 'running')

  return {
    state: 'ok',
    result: {
      groups,
      unattributed,
      running: running && toRunning(running),
      proposal: outstandingProposal(history),
      history: runList.map(toRun),
    },
  }
}

function toRunning({ run, read }: ReadRun): RunningScan {
  if (read.state === 'ok') {
    return { state: 'read', progress: toProgress(read.progress) }
  }

  return {
    state: 'unreadable',
    run: toRun(run),
    message:
      read.state === 'unavailable'
        ? read.message
        : 'スキャンの状況を API が答えられませんでした。',
  }
}

export async function getScanProposal(
  scanId: string,
): Promise<ScanProposalScreenResult> {
  const read = await getProgress(scanId)

  if (read.state !== 'ok') {
    return read
  }

  const { progress } = read

  return progress.difference === null
    ? { state: 'gone' }
    : { state: 'ok', proposal: toProposal(progress, progress.difference) }
}

function refusedRunId(body: unknown): string | undefined {
  const refusal = (
    body as { data?: { runningScanId?: string | null } } | undefined
  )?.data

  return refusal?.runningScanId ?? undefined
}

export async function startScan(
  systems: ScanSystem[],
): Promise<StartScanResult> {
  const { data, error, response } = await carinaClient().POST(
    '/api/tuners/scan',
    { body: { systems } },
  )

  if (response.status === 409) {
    return {
      state: 'refused',
      scanId: refusedRunId(error ?? data),
      message:
        'すでにスキャンが実行中です。同時に走らせられるのは 1 本までです。実行中のスキャンを確認するか、キャンセルしてから開始してください。',
    }
  }

  if (response.status === 503) {
    return {
      state: 'rejected',
      message:
        '対象の種別に使えるチューナーが空いていません。録画・ライブ・EPG 収集が優先されるため、空きが出てから開始してください。',
    }
  }

  if (!response.ok) {
    return {
      state: 'rejected',
      message: `スキャンを開始できませんでした(${response.status})。`,
    }
  }

  const scanId = data?.data?.scanId

  if (scanId === undefined) {
    throw new Error(`POST /api/tuners/scan answered ${response.status}`)
  }

  return { state: 'started', scanId }
}

function toWriteResult(
  response: Response,
  refusals: Partial<Record<number, string>>,
  fallback: string,
): WriteResult {
  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const refusal = refusals[response.status]

  if (refusal !== undefined) {
    return { state: 'rejected', message: refusal }
  }

  return response.ok
    ? { state: 'ok' }
    : { state: 'rejected', message: `${fallback}(${response.status})` }
}

export async function cancelScan(scanId: string): Promise<WriteResult> {
  const { response } = await carinaClient().POST(
    '/api/tuners/scan/{scanId}/cancel',
    { params: { path: { scanId } } },
  )

  const ended =
    'このスキャンはすでに終わっているため、キャンセルできませんでした。最新の状態を読み直しました。'

  return toWriteResult(
    response,
    { 404: ended, 409: ended },
    'スキャンをキャンセルできませんでした。',
  )
}

export async function applyScan(scanId: string): Promise<WriteResult> {
  const { response } = await carinaClient().POST(
    '/api/tuners/scan/{scanId}/apply',
    { params: { path: { scanId } } },
  )

  return toWriteResult(
    response,
    {
      404: 'このスキャンは残っていないため、保存できませんでした。',
      409: 'このスキャンの差分は別の保存が処理しています。この操作では何も書き換えられていません。少し待ってから状態を読み直してください。',
      410: 'このスキャンの差分はもう保持されていないため、保存できませんでした。別の保存が先に完了した可能性があります。チャンネル一覧を確かめ、反映されていなければスキャンし直してください。',
    },
    'スキャンの結果を保存できませんでした。',
  )
}

export interface CandidateTuning {
  system: ScanSystem
  physicalChannel: number
  transportStreamId?: number
}

export async function addCandidateChannel(
  key: string,
  tuning: CandidateTuning,
): Promise<WriteResult> {
  const [networkId, serviceId] = key.split('-').map(Number)

  const { response } = await carinaClient().POST(
    '/api/services/{networkId}-{serviceId}/candidate-channels',
    {
      params: { path: { networkId, serviceId } },
      body: {
        tuning: {
          system: tuning.system,
          physicalChannel: tuning.physicalChannel,
          transportStreamId: tuning.transportStreamId ?? null,
        },
      },
    },
  )

  return toWriteResult(
    response,
    {
      400: '物理チャンネルの指定が受け付けられませんでした。値を確かめてください。',
      404: 'このサービスが見つからないため、追加できませんでした。',
      409: 'この物理チャンネルはすでに候補として登録されています。',
      422: 'この物理チャンネルを受信できるチューナーがないため、追加できませんでした。対応する種別のチューナーが有効か確かめてください。',
      503: 'driver に接続できないため、受信できるか確かめられませんでした。追加されていません。',
    },
    '候補チャンネルを追加できませんでした。',
  )
}

export async function deleteCandidateChannel(
  key: string,
  candidateChannelId: string,
): Promise<WriteResult> {
  const [networkId, serviceId] = key.split('-').map(Number)

  const { response } = await carinaClient().DELETE(
    '/api/services/{networkId}-{serviceId}/candidate-channels/{candidateChannelId}',
    { params: { path: { networkId, serviceId, candidateChannelId } } },
  )

  return toWriteResult(
    response,
    {
      404: 'この候補チャンネルは残っていないため、削除できませんでした。',
      409: 'この候補チャンネルは別のサービスのものです。削除されていません。',
    },
    '候補チャンネルを削除できませんでした。',
  )
}

export async function selectCandidateChannel(
  key: string,
  candidateChannelId: string | null,
): Promise<WriteResult> {
  const [networkId, serviceId] = key.split('-').map(Number)

  const { response } = await carinaClient().PUT(
    '/api/services/{networkId}-{serviceId}/selected-channel',
    {
      params: { path: { networkId, serviceId } },
      body: { candidateChannelId },
    },
  )

  return toWriteResult(
    response,
    {
      404: 'このサービスか候補チャンネルが見つからないため、切り替えられませんでした。',
      409: 'この候補チャンネルは選局先にできないため、切り替えられませんでした。',
    },
    '選局先を切り替えられませんでした。',
  )
}
