import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { formatMonth, formatSpan, formatStamp } from '@/lib/format'

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
type TuneSystem = components['schemas']['TuneSystem']

/** The three systems a scan can walk. `unspecified` never reaches a screen. */
export type ScanSystem = Exclude<TuneSystem, 'unspecified'>

export const SCAN_SYSTEMS: { value: ScanSystem; label: string }[] = [
  { value: 'isdbT', label: '地上波' },
  { value: 'isdbSBs', label: 'BS' },
  { value: 'isdbSCs110', label: 'CS110' },
]

const SYSTEM_LABEL: Record<ScanSystem, string> = {
  isdbT: '地上波',
  isdbSBs: 'BS',
  isdbSCs110: 'CS110',
}

const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  television: 'TV',
  radio: 'ラジオ',
  data: 'データ',
  oneSeg: 'ワンセグ',
  temporary: '臨時',
  other: 'その他',
}

/**
 * The point of the domain: a scan that gets nowhere is four different
 * problems, and which one it is says where to go looking. The numbers are
 * the operator's shorthand and are shown beside every one of them.
 */
export interface FailureClass {
  /** 1–4, the order the four are always listed in. */
  no: 1 | 2 | 3 | 4
  label: string
  note: string
}

const FAILURE_CLASS: Record<
  Exclude<ScanAttemptOutcome, 'succeeded'>,
  FailureClass
> = {
  noLock: {
    no: 1,
    label: '信号を掴めない',
    note: 'チューナーが同調できない',
  },
  lockedWithoutData: {
    no: 2,
    label: 'データが来ない',
    note: '同調したが受信データなし',
  },
  incompleteTables: {
    no: 3,
    label: '情報が揃わない',
    note: 'データはあるが番組情報が不完全',
  },
  unexpectedStream: {
    no: 4,
    label: '内容が食い違う',
    note: '期待と異なる局(再編の可能性)',
  },
}

export const FAILURE_CLASSES: FailureClass[] = [
  FAILURE_CLASS.noLock,
  FAILURE_CLASS.lockedWithoutData,
  FAILURE_CLASS.incompleteTables,
  FAILURE_CLASS.unexpectedStream,
]

export interface Measurement {
  /** The value with its unit, e.g. `31.2 dB`. */
  value: string
  /** 0–100, CNR over a 0–40 dB scale. */
  percent: number
  tone: 'ok' | 'warn' | 'err'
}

export interface CandidateRow {
  id: string
  channel: string
  selected: boolean
  /** Absent when the last attempt never locked, so nothing was measurable. */
  measurement?: Measurement
  /**
   * Set once the candidate has fallen out of normal rotation. `dropped` means
   * it is no longer tried at all until someone looks at it.
   */
  rotation?: { dropped: boolean; label: string; note: string }
  discovered: string
  lastSeen: string
}

export interface ServiceRow {
  /** `{networkId}-{serviceId}`, the identifier the API addresses it by. */
  key: string
  name: string
  sid: string
  category: string
  /** A category that carries no programmes reads quieter in the list. */
  minorCategory: boolean
  /**
   * Absent means no candidate is selected: there is no way to tune the
   * service right now. It is a state of its own, not a missing value.
   */
  currentChannel?: string
  /**
   * Whether the service counts as a reservation target by default. The list
   * calls it 有効; nothing writes it yet.
   */
  enabled: boolean
  candidateCount: number
  /** Candidates that have left rotation and need someone to look. */
  needsAttentionCount: number
  lastSeen: string
  candidates: CandidateRow[]
}

/** Why a system holds no service, read off the last scan that walked it. */
export interface ZeroDiagnosis {
  scannedAt: string
  attempted: number
  counts: { class: FailureClass; count: number }[]
  /** Only stated when one class accounts for every attempt. */
  verdict?: string
}

export interface ServiceGroup {
  system: ScanSystem
  label: string
  services: ServiceRow[]
  stat: string
  /** Present only while the group holds no service at all. */
  diagnosis?: ZeroDiagnosis
  /** No scan has ever walked this system. */
  neverScanned: boolean
}

export interface ScanAttemptRow {
  channel: string
  /** Absent on a successful attempt. */
  failure?: FailureClass
  /** The one detail the contract carries in numbers rather than in prose. */
  streamMismatch?: string
  measurement?: Measurement
  /** Absent while the attempt is still running. */
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
  /** Newest first. */
  attempts: ScanAttemptRow[]
  /** The systems the run has touched so far, e.g. `地上波`. */
  systems: string
  /** Since the run started, as of this read. */
  elapsed: string
}

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
  /** Nothing at all would change: apply is offered but says so. */
  empty: boolean
}

export interface ChannelsResult {
  groups: ServiceGroup[]
  /**
   * Services the contract gives no system for: with no candidate channel left
   * there is nothing that says which way they were received. They are listed
   * apart rather than dropped — a service going quiet is the thing the screen
   * exists to show.
   */
  unattributed: ServiceRow[]
  /** The run that is walking right now, if one is. */
  running?: ScanRunProgress
  /** A finished run whose difference has not been applied yet. */
  proposal?: ScanProposal
  /** Newest first, the running one included. */
  history: ScanRun[]
}

/**
 * The app is only reachable through the proxy, so a 401 means the proxy was
 * bypassed rather than that the screen has a signed-out state of its own.
 */
export type ChannelsScreenResult =
  | { state: 'ok'; result: ChannelsResult }
  | { state: 'unauthenticated' }
  | { state: 'unavailable'; message: string }

/** A scan refused because one is already walking carries that run's id. */
export type StartScanResult =
  | { state: 'started'; scanId: string }
  | { state: 'refused'; scanId?: string; message: string }
  | { state: 'rejected'; message: string }

function toInt(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function toChannel(target: ScanTargetResponder): string {
  const channel = toInt(target.physicalChannel)

  if (target.system === 'isdbSBs') {
    const stream = target.transportStreamId
    return stream === null
      ? `BS${channel}`
      : `BS${channel} / TS ${toInt(stream)}`
  }

  if (target.system === 'isdbSCs110') {
    return `ND${channel}`
  }

  return `${channel}ch`
}

function toMeasurement(
  measurement: ScanMeasurementResponder | null,
): Measurement | undefined {
  if (measurement === null || measurement.cnrMilliDecibels === null) {
    return undefined
  }

  const cnr = toInt(measurement.cnrMilliDecibels) / 1000

  return {
    value: `${cnr.toFixed(1)} dB`,
    // The signal meter maps 0–40 dB onto its width; the number is spelled out
    // beside the bar either way.
    percent: Math.min(100, Math.max(0, (cnr / 40) * 100)),
    tone: cnr >= 25 ? 'ok' : cnr >= 15 ? 'warn' : 'err',
  }
}

function toCandidate(candidate: CandidateChannelResponder): CandidateRow {
  const failures = toInt(candidate.consecutiveFailures)

  return {
    id: candidate.id,
    channel: toChannel(candidate.target),
    selected: candidate.isSelected,
    measurement: toMeasurement(candidate.lastMeasurement),
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
    category: CATEGORY_LABEL[service.category],
    minorCategory: service.category !== 'television',
    currentChannel:
      service.selectedChannel === null
        ? undefined
        : toChannel(service.selectedChannel),
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

function toStat(services: ServiceRow[]): string {
  const by = (category: string) =>
    services.filter((service) => service.category === category).length
  const parts = [
    ['TV', by('TV')],
    ['ワンセグ', by('ワンセグ')],
    ['データ', by('データ')],
    ['ラジオ', by('ラジオ')],
  ].filter(([, count]) => (count as number) > 0)

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
    stateLabel: STATE_LABEL[run.state],
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

function toAttempt(attempt: ScanAttemptResponder): ScanAttemptRow {
  const observed = attempt.observedTransportStreamId
  const expected = attempt.target.transportStreamId

  return {
    channel: toChannel(attempt.target),
    failure:
      attempt.outcome === 'succeeded'
        ? undefined
        : FAILURE_CLASS[attempt.outcome],
    // `detail` is the driver's own English operator prose and the screen is
    // written in Japanese, so only the part the contract carries as numbers
    // is shown.
    streamMismatch:
      attempt.outcome === 'unexpectedStream' && observed !== null
        ? `期待 TSID ${expected === null ? '—' : toInt(expected)} / 受信 TSID ${toInt(observed)}`
        : undefined,
    measurement: toMeasurement(attempt.measurement),
    took: formatSpan(
      (new Date(attempt.finishedAt).getTime() -
        new Date(attempt.startedAt).getTime()) /
        1000,
    ),
    at: formatStamp(attempt.startedAt),
  }
}

function toProgress(progress: ScanProgressResponder): ScanRunProgress {
  const systems = [
    ...new Set(
      progress.attempts
        .map((attempt) => attempt.target.system)
        .filter((system): system is ScanSystem => system !== 'unspecified'),
    ),
  ]

  return {
    run: toRun(progress.run),
    attempted: toInt(progress.attempted),
    succeeded: toInt(progress.succeeded),
    failed: toInt(progress.failed),
    attempts: progress.attempts.map(toAttempt).reverse(),
    systems: systems.map((system) => SYSTEM_LABEL[system]).join(' · '),
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
    category: CATEGORY_LABEL[change.category],
    channels: change.channels.map((channel) => ({
      kind: channel.kind,
      channel: toChannel(channel.target),
      measurement: toMeasurement(channel.measurement),
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
    channel: toChannel(departure.target),
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
        FAILURE_CLASS[attempt.outcome].no === failure.no,
    ).length,
  }))
  const only = counts.find(({ count }) => count === attempts.length)

  return {
    scannedAt: formatStamp(progress.run.startedAt),
    attempted: attempts.length,
    counts,
    verdict:
      only &&
      `走査した ${attempts.length} 件すべてが「${only.class.no} ${only.class.label}」で止まっています。${only.class.note}状態が全体に及んでいます。`,
  }
}

async function getProgress(
  scanId: string,
): Promise<ScanProgressResponder | undefined> {
  const { data } = await carinaClient().GET('/api/tuners/scan/{scanId}', {
    params: { path: { scanId } },
  })

  return data?.data ?? undefined
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
    return { state: 'unavailable', message: serviceBody.message }
  }

  const runBody = runs.data?.data ?? []
  const runningRun = runBody.find((run) => run.state === 'running')
  const lastFinished = runBody.find((run) => run.state !== 'running')

  const [runningProgress, finishedProgress] = await Promise.all([
    runningRun && getProgress(runningRun.scanId),
    lastFinished && getProgress(lastFinished.scanId),
  ])

  const grouped = new Map<ScanSystem, ServiceRow[]>()
  const unattributed: ServiceRow[] = []

  for (const service of serviceBody.data) {
    const system = systemOf(service)

    if (system === undefined) {
      unattributed.push(toService(service))
      continue
    }

    grouped.set(system, [...(grouped.get(system) ?? []), toService(service)])
  }

  const walked = new Set(
    (finishedProgress?.attempts ?? [])
      .map((attempt) => attempt.target.system)
      .filter((system): system is ScanSystem => system !== 'unspecified'),
  )

  const groups = SCAN_SYSTEMS.map(({ value, label }) => {
    const services = grouped.get(value) ?? []

    return {
      system: value,
      label,
      services,
      stat: toStat(services),
      diagnosis:
        services.length === 0
          ? toDiagnosis(value, finishedProgress)
          : undefined,
      neverScanned: services.length === 0 && !walked.has(value),
    }
  })

  const proposal =
    finishedProgress && finishedProgress.difference !== null
      ? toProposal(finishedProgress, finishedProgress.difference)
      : undefined

  return {
    state: 'ok',
    result: {
      groups,
      unattributed,
      running: runningProgress && toProgress(runningProgress),
      proposal,
      history: runBody.map(toRun),
    },
  }
}

export async function getScanProposal(
  scanId: string,
): Promise<ScanProposal | undefined> {
  const progress = await getProgress(scanId)

  return progress && progress.difference !== null
    ? toProposal(progress, progress.difference)
    : undefined
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

  // The API answers in its own English operator prose and the screen is
  // written in Japanese, so what the refusal means is said here instead.
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

export async function cancelScan(scanId: string): Promise<void> {
  const { response } = await carinaClient().POST(
    '/api/tuners/scan/{scanId}/cancel',
    { params: { path: { scanId } } },
  )

  if (!response.ok) {
    throw new Error(
      `POST /api/tuners/scan/${scanId}/cancel answered ${response.status}`,
    )
  }
}

export async function applyScan(scanId: string): Promise<void> {
  const { response } = await carinaClient().POST(
    '/api/tuners/scan/{scanId}/apply',
    { params: { path: { scanId } } },
  )

  if (!response.ok) {
    throw new Error(
      `POST /api/tuners/scan/${scanId}/apply answered ${response.status}`,
    )
  }
}

export async function selectCandidateChannel(
  key: string,
  candidateChannelId: string | null,
): Promise<void> {
  const [networkId, serviceId] = key.split('-').map(Number)

  const { response } = await carinaClient().PUT(
    '/api/services/{networkId}-{serviceId}/selected-channel',
    {
      params: { path: { networkId, serviceId } },
      body: { candidateChannelId },
    },
  )

  if (!response.ok) {
    throw new Error(
      `PUT /api/services/${key}/selected-channel answered ${response.status}`,
    )
  }
}
