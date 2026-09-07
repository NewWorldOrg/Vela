import type { Route } from 'next'

import { formatStamp } from '@/lib/format'
import type { QualityLevel } from '@/lib/quality'
import { QUALITY_LEVEL_LABEL } from '@/lib/quality'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import type { GuideChannel } from '@/repository/programs'
import { fetchServiceChannels } from '@/repository/programs'
import type { RecordingName } from '@/repository/recordings'
import { grouped, listRecordingNames } from '@/repository/recordings'
import { whatItSaid } from '@/repository/said'

type SummaryResponder = components['schemas']['QualitySummaryResponder']
type MeasureResponder = components['schemas']['QualityMeasureResponder']
type SignalResponder = components['schemas']['QualitySignalResponder']
type TallyResponder = components['schemas']['QualityTallyResponder']
type ReadingResponder = components['schemas']['QualityReadingResponder']
type ChannelResponder = components['schemas']['QualityChannelResponder']
type TunerResponder = components['schemas']['QualityTunerResponder']
type RecordingResponder = components['schemas']['QualityRecordingResponder']
type ThresholdResponder = components['schemas']['QualityThresholdResponder']
type State = components['schemas']['QualityState']
type Standing = components['schemas']['QualityStanding']

export type QualityMetric = components['schemas']['QualityMetric']
export type QualityThresholdKey = components['schemas']['QualityThresholdKey']

export type { QualityLevel }

export interface QualityWindow {
  label: string
  href: Route
  current: boolean
}

export interface QualityStat {
  key: string
  label: string
  value?: string
  unit?: string
  level?: QualityLevel
  levelLabel?: string
  aside?: string
  link?: { href: Route; label: string }
  foot?: string
}

export interface QualityThreshold {
  key: QualityThresholdKey
  label: string
  value: string
  basis: string
  shipped: string
  provisional: boolean
  amount: string
  unit: string
  lowest: number
  highest: number
}

export interface QualityChannel {
  id: string
  name: string
  no?: string
  dropRate?: string
  barPct?: number
  level: QualityLevel
  note: string
}

export interface QualityTunerCell {
  value?: string
  unit?: string
  level?: QualityLevel
  sub?: string
}

export interface QualityTuner {
  id: string
  device: string
  hardware: string
  state: { level: QualityLevel; label: string }
  drop: QualityTunerCell
  lock: QualityTunerCell
  cnr: QualityTunerCell
  ber: QualityTunerCell
}

export interface QualityProblemRecording {
  id: string
  title: string
  where: string
  drops: string
  pct?: string
  level: Extract<QualityLevel, 'warn' | 'bad'>
}

export interface QualityResult {
  windows: QualityWindow[]
  stats: QualityStat[]
  thresholds: QualityThreshold[]
  warnMarkPct?: number
  channels: QualityChannel[]
  satellites: QualityChannel[]
  tuners: QualityTuner[]
  problemRecordings: QualityProblemRecording[]
}

export type QualityWrite =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

const UNREADABLE = '品質を読めませんでした'

const A_DAY = 24 * 60 * 60 * 1000

const SPANS = [
  { days: 1, label: '24 時間' },
  { days: 7, label: '7 日' },
  { days: 30, label: '30 日' },
]

const HEALTHY = '健全'

const LEVEL_OF_STATE: Record<State, QualityLevel> = {
  good: 'good',
  atOrAboveWarning: 'warn',
  unmeasured: 'unmeasured',
  nothingToMeasure: 'nodata',
  unsupported: 'unsupported',
  unreachable: 'unreachable',
}

const LEVEL_OF_STANDING: Record<Standing, QualityLevel> = {
  good: 'good',
  warning: 'warn',
  mayNotBeWatchable: 'bad',
  unmeasured: 'unmeasured',
  unsupported: 'unsupported',
  unreachable: 'unreachable',
}

const WORST_FIRST: QualityLevel[] = [
  'bad',
  'warn',
  'unreachable',
  'unsupported',
  'unmeasured',
  'nodata',
  'good',
]

interface ThresholdShape {
  label: string
  unit: string
  scale: number
  exponent?: boolean
}

const THRESHOLD_SHAPES: Record<QualityThresholdKey, ThresholdShape> = {
  packetsLostWarning: {
    label: 'ドロップ率の警告水準',
    unit: '%',
    scale: 0.01,
  },
  packetsLostUnwatchable: {
    label: 'ドロップ率の視聴不可の恐れ',
    unit: '%',
    scale: 0.01,
  },
  packetsLeftScrambled: {
    label: 'スクランブル残存率の上限',
    unit: '%',
    scale: 0.01,
  },
  overflows: { label: '取りこぼしの上限', unit: '回', scale: 1 },
  lockRate: { label: 'lock 率の下限', unit: '%', scale: 0.01 },
  carrierToNoiseFloor: { label: 'CNR の下限', unit: 'dB', scale: 1000 },
  bitErrorRateCeiling: {
    label: 'post-Viterbi ビット誤り率の上限',
    unit: '',
    scale: 1,
    exponent: true,
  },
  supplySilence: { label: '供給途絶の判定', unit: '分', scale: 60 },
}

const METRIC_DROPS: Record<QualityMetric, string> = {
  packetsLost: 'ドロップ',
  packetsLeftScrambled: 'スクランブル',
  overflows: '取りこぼし',
}

export interface QualityAsking {
  did: string
  fell: string
}

export const WHEN_CHANGING_A_THRESHOLD: QualityAsking = {
  did: '変更',
  fell: '閾値を変更できませんでした',
}

const REFUSAL_REASONS: [RegExp, string][] = [
  [/lies between .+ and .+/i, '指定できる範囲の外の値のため、'],
  [
    /cannot be moved past the level beside it/i,
    '警告水準が視聴不可の恐れを越えてしまうため、',
  ],
  [/asked for by one of the keys/i, 'この閾値は残っていないため、'],
  [
    /moved by naming the value it moves to/i,
    '変更後の値が指定されていないため、',
  ],
]

export function whyItRefused(
  asking: QualityAsking,
  status: number,
  said: string | undefined,
): string {
  const reason = REFUSAL_REASONS.find(([reads]) => reads.test(said ?? ''))

  if (reason) {
    return `${reason[1]}${asking.did}できませんでした。`
  }

  return `${asking.fell}(${status})。`
}

export async function getQuality(days?: string): Promise<QualityResult> {
  const span = SPANS.find((one) => String(one.days) === days) ?? SPANS[0]
  const until = new Date()
  const from = new Date(until.getTime() - span.days * A_DAY)
  const period = { from: from.toISOString(), until: until.toISOString() }

  const [summary, channels, tuners, recordings, thresholds, known, names] =
    await Promise.all([
      fetchSummary(period),
      fetchChannels(period),
      fetchTuners(period),
      fetchRecordings(period),
      fetchThresholds(),
      fetchServiceChannels(),
      listRecordingNames(),
    ])

  const drawn = channels.items.map((one) => toChannel(one, known, thresholds))

  return {
    windows: SPANS.map((one) => ({
      label: one.label,
      href: `/settings/quality?days=${one.days}` as Route,
      current: one.days === span.days,
    })),
    stats: statsOf(span.label, summary, tuners, recordings),
    thresholds: thresholds.map(toThreshold),
    warnMarkPct: warnMarkOf(thresholds),
    channels: drawn.filter((one) => one.terrestrial).map(withoutKind),
    satellites: drawn.filter((one) => !one.terrestrial).map(withoutKind),
    tuners: tuners.items.map(toTuner),
    problemRecordings: recordings.items.map((one) =>
      toProblemRecording(one, known, names),
    ),
  }
}

export async function reviseThreshold(
  key: QualityThresholdKey,
  amount: number,
): Promise<QualityWrite> {
  const { error, response } = await carinaClient().PATCH(
    '/api/quality/thresholds/{key}',
    {
      params: { path: { key } },
      body: { value: stored(amount, THRESHOLD_SHAPES[key].scale) },
    },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  return {
    state: 'rejected',
    message: whyItRefused(
      WHEN_CHANGING_A_THRESHOLD,
      response.status,
      whatItSaid(error),
    ),
  }
}

interface Period {
  from: string
  until: string
}

async function fetchSummary(period: Period): Promise<SummaryResponder> {
  const { data, error } = await carinaClient().GET('/api/quality/summary', {
    params: { query: period },
  })

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data
}

async function fetchChannels(
  period: Period,
): Promise<{ items: ChannelResponder[] }> {
  const { data, error } = await carinaClient().GET('/api/quality/channels', {
    params: { query: { ...period, sort: 'worst' } },
  })

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return { items: data.data.items }
}

async function fetchTuners(
  period: Period,
): Promise<{ items: TunerResponder[] }> {
  const { data, error } = await carinaClient().GET('/api/quality/tuners', {
    params: { query: { ...period, sort: 'worst' } },
  })

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return { items: data.data.items }
}

interface ProblemRecordings {
  items: RecordingResponder[]
  total: number
}

async function fetchRecordings(period: Period): Promise<ProblemRecordings> {
  const { data, error } = await carinaClient().GET('/api/quality/recordings', {
    params: { query: { ...period, sort: 'worst' } },
  })

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return { items: data.data.items, total: toInt(data.data.total) }
}

async function fetchThresholds(): Promise<ThresholdResponder[]> {
  const { data, error } = await carinaClient().GET('/api/quality/thresholds')

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data.items
}

function statsOf(
  spanLabel: string,
  summary: SummaryResponder,
  tuners: { items: TunerResponder[] },
  recordings: ProblemRecordings,
): QualityStat[] {
  const drop = readingOf(summary.measures, 'packetsLost')
  const scramble = readingOf(summary.measures, 'packetsLeftScrambled')
  const healthy = tuners.items.filter(
    (one) => worstOfMeasures(one.measures) === 'good',
  ).length
  const worstProblem = recordings.items[0]

  return [
    {
      key: 'drop',
      label: `直近 ${spanLabel}のドロップ率`,
      ...shareStat(drop),
      aside: summary.provisional ? '閾値は暫定' : undefined,
      foot: drop && countedIn(drop),
    },
    {
      key: 'problem',
      label: '問題のある録画',
      value: String(recordings.total),
      unit: '件',
      level: worstProblem ? worstOfVerdicts(worstProblem) : undefined,
      levelLabel: worstProblem
        ? QUALITY_LEVEL_LABEL[worstOfVerdicts(worstProblem)]
        : undefined,
      link: { href: '/library', label: 'ライブラリで絞り込む' },
    },
    {
      key: 'scramble',
      label: 'スクランブル残存率',
      ...shareStat(scramble),
      aside: scramble && countedIn(scramble),
    },
    {
      key: 'health',
      label: 'チューナーヘルス',
      value: `${healthy} / ${tuners.items.length}`,
      unit: HEALTHY,
      link: { href: '/settings/tuners', label: 'チューナーへ' },
      foot: everySignalUnmeasured(summary.signal)
        ? '信号品質 未計測'
        : undefined,
    },
  ]
}

function shareStat(reading: TallyResponder | undefined): Partial<QualityStat> {
  if (!reading) {
    return { level: 'nodata', levelLabel: QUALITY_LEVEL_LABEL.nodata }
  }

  const level = levelOfTally(reading)

  if (reading.average == null) {
    return { level, levelLabel: QUALITY_LEVEL_LABEL[level] }
  }

  return {
    value: sharePercent(toRatio(reading.average)),
    unit: '%',
    level,
    levelLabel: QUALITY_LEVEL_LABEL[level],
  }
}

function countedIn(reading: ReadingResponder): string {
  const unmeasured = toInt(reading.unmeasured)
  const subjects = toInt(reading.subjects)

  if (subjects === 0) {
    return '録画 0 本'
  }

  return unmeasured === 0
    ? `録画 ${toInt(reading.measured)} 本を計測`
    : `録画 ${subjects} 本 / うち未計測 ${unmeasured} 本`
}

function everySignalUnmeasured(signal: SignalResponder[]): boolean {
  return (
    signal.length > 0 &&
    signal.every((one) => one.reading.state !== 'good' && !one.lastTakenAt)
  )
}

interface ChannelDraw extends QualityChannel {
  terrestrial: boolean
}

function toChannel(
  one: ChannelResponder,
  known: GuideChannel[],
  thresholds: ThresholdResponder[],
): ChannelDraw {
  const id = `${toInt(one.networkId)}-${toInt(one.serviceId)}`
  const found = known.find((each) => each.id === id)
  const drop = readingOf(one.measures, 'packetsLost')
  const level = drop ? levelOfTally(drop) : 'nodata'
  const share = drop?.average == null ? undefined : toRatio(drop.average)
  const ceiling = currentOf(thresholds, 'packetsLostUnwatchable')

  return {
    id,
    name: found?.name || id,
    no: found?.no,
    terrestrial: one.kind !== 'isdbSBs' && one.kind !== 'isdbSCs110',
    dropRate: share === undefined ? undefined : `${sharePercent(share)}%`,
    barPct:
      share === undefined || ceiling === undefined || ceiling === 0
        ? undefined
        : Math.min(100, (share / ceiling) * 100),
    level,
    note: drop ? countedIn(drop) : '録画 0 本',
  }
}

function withoutKind(one: ChannelDraw): QualityChannel {
  const { terrestrial, ...rest } = one

  void terrestrial

  return rest
}

function warnMarkOf(thresholds: ThresholdResponder[]): number | undefined {
  const warning = currentOf(thresholds, 'packetsLostWarning')
  const ceiling = currentOf(thresholds, 'packetsLostUnwatchable')

  if (warning === undefined || !ceiling) {
    return undefined
  }

  return Math.min(100, (warning / ceiling) * 100)
}

function toTuner(one: TunerResponder): QualityTuner {
  const device = one.deviceId ?? ''
  const drop = readingOf(one.measures, 'packetsLost')
  const level = worstOfMeasures(one.measures)

  return {
    id: device || 'unnamed',
    device: device || '対象なし',
    hardware: drop ? countedIn(drop) : '録画 0 本',
    state: {
      level,
      label: level === 'good' ? HEALTHY : QUALITY_LEVEL_LABEL[level],
    },
    drop: shareCell(drop),
    lock: signalCell(one.signal, 'lockRate'),
    cnr: signalCell(one.signal, 'carrierToNoiseFloor'),
    ber: signalCell(one.signal, 'bitErrorRateCeiling'),
  }
}

function shareCell(reading: TallyResponder | undefined): QualityTunerCell {
  if (!reading) {
    return { level: 'nodata' }
  }

  const level = levelOfTally(reading)

  if (reading.average == null) {
    return { level }
  }

  return { value: sharePercent(toRatio(reading.average)), unit: '%', level }
}

function signalCell(
  signal: SignalResponder[],
  key: QualityThresholdKey,
): QualityTunerCell {
  const found = signal.find((one) => one.metric === key)

  if (!found) {
    return { level: 'nodata' }
  }

  return {
    level: LEVEL_OF_STATE[found.reading.state],
    sub: found.lastTakenAt
      ? `${formatStamp(found.lastTakenAt)} 取得`
      : undefined,
  }
}

function toProblemRecording(
  one: RecordingResponder,
  known: GuideChannel[],
  names: ReadonlyMap<string, RecordingName>,
): QualityProblemRecording {
  const id = `${toInt(one.networkId)}-${toInt(one.serviceId)}`
  const channel = known.find((each) => each.id === id)
  const level = worstOfVerdicts(one)
  const breach = one.verdicts.find(
    (each) =>
      each.standing === 'mayNotBeWatchable' || each.standing === 'warning',
  )
  const metric = breach?.metric ?? 'packetsLost'
  const total = one.totalPackets == null ? undefined : toInt(one.totalPackets)
  const counted =
    metric === 'packetsLost'
      ? one.droppedPackets
      : metric === 'packetsLeftScrambled'
        ? one.scrambledPackets
        : one.overflows
  const packets = counted == null ? undefined : toInt(counted)
  const observed =
    breach?.observed == null ? undefined : toRatio(breach.observed)

  return {
    id: one.id,
    title: names.get(one.id)?.title ?? '',
    where: `${channel?.name || id} · ${formatStamp(one.startedAt)}`,
    drops:
      packets === undefined
        ? METRIC_DROPS[metric]
        : `${METRIC_DROPS[metric]} ${grouped(packets)}`,
    pct:
      metric === 'overflows' || observed === undefined || total === 0
        ? undefined
        : `${sharePercent(observed)}%`,
    level: level === 'bad' ? 'bad' : 'warn',
  }
}

function toThreshold(one: ThresholdResponder): QualityThreshold {
  const shape = THRESHOLD_SHAPES[one.key]
  const current = shown(toRatio(one.currentValue), shape.scale)
  const shipped = spelled(shown(toRatio(one.defaultValue), shape.scale), shape)

  return {
    key: one.key,
    label: shape.label,
    value: spelled(current, shape),
    basis: `既定 ${shipped} · 根拠 ${grouped(toInt(one.observations))} 件`,
    shipped,
    provisional: one.provisional,
    amount: trimmed(current),
    unit: shape.unit,
    lowest: shown(toRatio(one.lowest), shape.scale),
    highest: shown(toRatio(one.highest), shape.scale),
  }
}

function readingOf(
  measures: MeasureResponder[],
  metric: QualityMetric,
): TallyResponder | undefined {
  return measures.find((one) => one.metric === metric)?.reading
}

function levelOfTally(reading: TallyResponder): QualityLevel {
  if (reading.state !== 'atOrAboveWarning') {
    return LEVEL_OF_STATE[reading.state]
  }

  return toInt(reading.mayNotBeWatchable) > 0 ? 'bad' : 'warn'
}

function worstOfMeasures(measures: MeasureResponder[]): QualityLevel {
  return worst(measures.map((one) => levelOfTally(one.reading)))
}

function worstOfVerdicts(one: RecordingResponder): QualityLevel {
  return worst([
    LEVEL_OF_STANDING[one.standing],
    ...one.verdicts.map((each) => LEVEL_OF_STANDING[each.standing]),
  ])
}

function worst(levels: QualityLevel[]): QualityLevel {
  return (
    WORST_FIRST.find((level) => levels.includes(level)) ?? levels[0] ?? 'nodata'
  )
}

function currentOf(
  thresholds: ThresholdResponder[],
  key: QualityThresholdKey,
): number | undefined {
  const found = thresholds.find((one) => one.key === key)

  return found === undefined ? undefined : toRatio(found.currentValue)
}

function toRatio(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function sharePercent(share: number): string {
  return (share * 100).toFixed(3)
}

function shown(value: number, scale: number): number {
  return Number((value / scale).toFixed(10))
}

function stored(amount: number, scale: number): number {
  return Number((amount * scale).toFixed(10))
}

function spelled(value: number, shape: ThresholdShape): string {
  return shape.exponent
    ? value.toExponential(1)
    : `${trimmed(value)}${shape.unit}`
}

function trimmed(value: number): string {
  return String(Number(value.toFixed(6)))
}
